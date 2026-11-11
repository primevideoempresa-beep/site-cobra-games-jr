import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  increment 
} from 'firebase/firestore';
import { db, logFirebaseEvent } from '../lib/firebase';
// Removed uuid import to use native crypto.randomUUID()


// Safe storage wrapper to prevent DOMException/SecurityError in iframe sandboxes or restricted storage environments
const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string, type: 'local' | 'session' = 'local'): string | null {
    try {
      if (typeof window !== 'undefined') {
        const storage = type === 'local' ? window.localStorage : window.sessionStorage;
        if (storage) return storage.getItem(key);
      }
    } catch {
      // Storage access blocked or restricted (e.g. iframe sandbox, private browsing)
    }
    return memoryStore[key] ?? null;
  },
  setItem(key: string, value: string, type: 'local' | 'session' = 'local'): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = type === 'local' ? window.localStorage : window.sessionStorage;
        if (storage) {
          storage.setItem(key, value);
          return;
        }
      }
    } catch {
      // Storage access blocked or restricted
    }
    memoryStore[key] = value;
  },
  removeItem(key: string, type: 'local' | 'session' = 'local'): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = type === 'local' ? window.localStorage : window.sessionStorage;
        if (storage) {
          storage.removeItem(key);
          return;
        }
      }
    } catch {
      // Storage access blocked or restricted
    }
    delete memoryStore[key];
  }
};

const VISITOR_ID_KEY = 'cg_visitor_id';
const SESSION_ID_KEY = 'cg_session_id';
const FIRST_VISIT_KEY = 'cg_first_visit_ts';
const DESK_RACER_PLAY_COUNT_KEY = 'cg_dr_play_count';
const DESK_RACER_LAST_PLAYED_KEY = 'cg_dr_last_played_ts';

export class AnalyticsService {
  private static visitorId: string | null = null;
  private static sessionId: string | null = null;
  private static initPromise: Promise<void> | null = null;

  static getRetentionCohort(): { daysSinceFirstVisit: number; cohort: string; isReturning: boolean; careerPlays: number } {
    try {
      let firstVisitStr = safeStorage.getItem(FIRST_VISIT_KEY, 'local');
      if (!firstVisitStr) {
        firstVisitStr = String(Date.now());
        safeStorage.setItem(FIRST_VISIT_KEY, firstVisitStr, 'local');
      }
      const firstVisitTs = parseInt(firstVisitStr, 10) || Date.now();
      const daysSinceFirstVisit = Math.floor((Date.now() - firstVisitTs) / (1000 * 60 * 60 * 24));
      
      let cohort = 'D0_new';
      if (daysSinceFirstVisit === 1) cohort = 'D1_retained';
      else if (daysSinceFirstVisit >= 2 && daysSinceFirstVisit <= 7) cohort = 'D7_retained';
      else if (daysSinceFirstVisit > 7) cohort = 'D30_plus';

      const careerPlays = parseInt(safeStorage.getItem(DESK_RACER_PLAY_COUNT_KEY, 'local') || '0', 10);
      const isReturning = careerPlays > 0;

      return { daysSinceFirstVisit, cohort, isReturning, careerPlays };
    } catch {
      return { daysSinceFirstVisit: 0, cohort: 'D0_new', isReturning: false, careerPlays: 0 };
    }
  }

  static async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (!safeStorage.getItem(FIRST_VISIT_KEY, 'local')) {
          safeStorage.setItem(FIRST_VISIT_KEY, String(Date.now()), 'local');
        }

        if (!this.visitorId) {
          this.visitorId = safeStorage.getItem(VISITOR_ID_KEY, 'local');
          if (!this.visitorId) {
            this.visitorId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
            safeStorage.setItem(VISITOR_ID_KEY, this.visitorId, 'local');
          }
        }

        if (!this.sessionId) {
          this.sessionId = safeStorage.getItem(SESSION_ID_KEY, 'session');
          if (!this.sessionId) {
            this.sessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : 's_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
            safeStorage.setItem(SESSION_ID_KEY, this.sessionId, 'session');
          }
        }

        // Registrar perfis iniciais assincronamente com merge seguro
        await Promise.allSettled([
          this.createVisitorProfile(),
          this.createSession()
        ]);
      } catch (err) {
        console.warn('[Analytics] Failed to initialize smoothly:', err);
      }
    })();

    return this.initPromise;
  }

  private static async createVisitorProfile() {
    if (!this.visitorId) return;
    try {
      const visitorRef = doc(db, 'visitors', this.visitorId);
      await setDoc(visitorRef, {
        id: this.visitorId,
        firstVisit: serverTimestamp(),
        lastVisit: serverTimestamp(),
        userAgent: (navigator.userAgent || 'Unknown').slice(0, 500),
        device: this.getDeviceType(),
        browser: this.getBrowser(),
        region: 'Unknown',
        country: 'Unknown'
      }, { merge: true });
    } catch (e) {
      // Ignorar silenciosamente falhas de rede transitórias no profile
    }
  }

  private static async createSession() {
    if (!this.visitorId || !this.sessionId) return;
    try {
      const sessionRef = doc(db, 'sessions', this.sessionId);
      await setDoc(sessionRef, {
        id: this.sessionId,
        visitorId: this.visitorId,
        startTime: serverTimestamp(),
        lastActive: serverTimestamp(),
        device: this.getDeviceType(),
        browser: this.getBrowser()
      }, { merge: true });
    } catch (e) {
      // Ignorar silenciosamente falhas de rede transitórias na sessão
    }
  }

  static async trackPageView(page: string) {
    await this.trackEvent('page_view', { page: (page || '/').slice(0, 500) });
    logFirebaseEvent('page_view', { page_path: page });
  }

  static async trackGameClick(gameId: string) {
    const cleanId = (gameId || 'game').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64);
    await this.trackEvent('game_click', { gameId: cleanId });
    logFirebaseEvent('select_content', { content_type: 'game', item_id: cleanId });
    try {
      const gameStatsRef = doc(db, 'game_stats', cleanId);
      await setDoc(gameStatsRef, {
        clicks: increment(1),
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      // Falha não crítica de telemetria
    }
  }

  static async trackGameOpen(gameId: string) {
    const cleanId = (gameId || 'game').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64);
    await this.trackEvent('game_open', { gameId: cleanId });
    logFirebaseEvent('level_start', { level_name: cleanId });
    try {
      const gameStatsRef = doc(db, 'game_stats', cleanId);
      await setDoc(gameStatsRef, {
        opens: increment(1),
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      // Falha não crítica de telemetria
    }
  }

  static async trackGameStart(gameId: string, params: Record<string, any> = {}) {
    const cleanId = (gameId || 'game').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64);
    const retention = this.getRetentionCohort();
    
    const eventData = {
      gameId: cleanId,
      retentionCohort: retention.cohort,
      daysSinceFirstVisit: retention.daysSinceFirstVisit,
      isReturningPlayer: retention.isReturning,
      ...params
    };

    await this.trackEvent('game_start', eventData);
    logFirebaseEvent('game_start', eventData);

    try {
      const gameStatsRef = doc(db, 'game_stats', cleanId);
      const updatePayload: Record<string, any> = {
        racesStarted: increment(1), // Keeping compatible naming but could be 'starts'
        lastUpdated: serverTimestamp()
      };
      if (retention.cohort === 'D1_retained') updatePayload.retentionD1 = increment(1);
      if (retention.cohort === 'D7_retained') updatePayload.retentionD7 = increment(1);

      await setDoc(gameStatsRef, updatePayload, { merge: true });
    } catch (e) {
      // Falha não crítica
    }
  }

  static async trackGameFinish(gameId: string, params: Record<string, any> = {}) {
    const cleanId = (gameId || 'game').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64);
    const eventData = {
      gameId: cleanId,
      ...params
    };

    await this.trackEvent('game_finish', eventData);
    logFirebaseEvent('game_finish', eventData);

    try {
      const gameStatsRef = doc(db, 'game_stats', cleanId);
      await setDoc(gameStatsRef, {
        racesCompleted: increment(1),
        lastUpdated: serverTimestamp(),
        ...params.score && { totalScore: increment(params.score) }
      }, { merge: true });
    } catch (e) {
      // Falha não crítica
    }
  }

  static async trackGameFailure(gameId: string, error: string) {
    const cleanId = (gameId || 'game').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64);
    await this.trackEvent('game_failure', { gameId: cleanId, error });
    logFirebaseEvent('game_failure', { gameId: cleanId, error });
  }

  // -------------------------------------------------------------------------
  // DESK RACER SPECIFIC (Kept for compatibility, but internally uses generic)
  // -------------------------------------------------------------------------

  static async trackDeskRacerRaceStart(params: { camera?: string | number; inputMethod?: string } = {}) {
    await this.trackGameStart('desk_racer', params);
  }

  static async trackDeskRacerLapComplete(params: { lapNumber: number; lapTime: number; bestLap?: number; isFinish?: boolean }) {
    const eventData = {
      gameId: 'desk_racer',
      lapNumber: params.lapNumber,
      lapTime: Number(params.lapTime.toFixed(3)),
      bestLap: params.bestLap ? Number(params.bestLap.toFixed(3)) : undefined,
      isFinish: Boolean(params.isFinish)
    };

    await this.trackEvent('desk_racer_lap_complete', eventData);
    logFirebaseEvent('desk_racer_lap_complete', eventData);

    const gameStatsRef = doc(db, 'game_stats', 'desk_racer');
    await setDoc(gameStatsRef, {
      lapsCompleted: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  }

  static async trackDeskRacerRaceFinish(params: { totalTime: number; bestLap: number }) {
    await this.trackGameFinish('desk_racer', {
      totalTime: Number(params.totalTime.toFixed(3)),
      bestLap: Number(params.bestLap.toFixed(3)),
      totalPlaytimeSeconds: Math.round(params.totalTime)
    });
  }

  static async trackDeskRacerReplay() {
    const eventData = { gameId: 'desk_racer', type: 'replay_triggered' };
    await this.trackEvent('desk_racer_replay', eventData);
    logFirebaseEvent('desk_racer_replay', eventData);

    const gameStatsRef = doc(db, 'game_stats', 'desk_racer');
    await setDoc(gameStatsRef, {
      replaysCount: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  }

  static async trackDeskRacerCameraSwitch(cameraIndex: string | number) {
    const camKey = String(cameraIndex);
    const eventData = { gameId: 'desk_racer', camera: camKey };
    await this.trackEvent('desk_racer_camera_switch', eventData);
    logFirebaseEvent('desk_racer_camera_switch', eventData);

    const gameStatsRef = doc(db, 'game_stats', 'desk_racer');
    await setDoc(gameStatsRef, {
      [`camera_${camKey}`]: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  }

  static async trackDeskRacerSoundToggle(soundEnabled: boolean) {
    const eventData = { gameId: 'desk_racer', soundEnabled };
    await this.trackEvent('desk_racer_sound_toggle', eventData);
    logFirebaseEvent('desk_racer_sound_toggle', eventData);
  }

  static async trackDeskRacerPauseToggle(isPaused: boolean) {
    const eventData = { gameId: 'desk_racer', isPaused };
    await this.trackEvent('desk_racer_pause_toggle', eventData);
    logFirebaseEvent('desk_racer_pause_toggle', eventData);
  }

  static async trackDeskRacerHeartbeat(secondsElapsed: number) {
    const retention = this.getRetentionCohort();
    const eventData = {
      gameId: 'desk_racer',
      secondsElapsed,
      cohort: retention.cohort
    };
    await this.trackEvent('desk_racer_retention_heartbeat', eventData);
    logFirebaseEvent('desk_racer_retention_heartbeat', eventData);

    const gameStatsRef = doc(db, 'game_stats', 'desk_racer');
    await setDoc(gameStatsRef, {
      totalDwellSeconds: increment(secondsElapsed),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  }

  static async trackDeskRacerSessionEnd(params: { durationSeconds: number; lapsCount?: number; completedRace?: boolean }) {
    const retention = this.getRetentionCohort();
    const eventData = {
      gameId: 'desk_racer',
      durationSeconds: params.durationSeconds,
      lapsCount: params.lapsCount || 0,
      completedRace: Boolean(params.completedRace),
      retentionCohort: retention.cohort
    };
    await this.trackEvent('desk_racer_session_end', eventData);
    logFirebaseEvent('desk_racer_session_end', eventData);
  }

  private static async trackEvent(type: string, metadata: any = {}) {
    if (!this.visitorId || !this.sessionId) {
      if (this.initPromise) {
        await this.initPromise.catch(() => {});
      } else {
        await this.init().catch(() => {});
      }
    }
    if (!this.visitorId || !this.sessionId) return;
    
    try {
      await addDoc(collection(db, 'events'), {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        type,
        timestamp: serverTimestamp(),
        ...metadata
      });

      // Update last active in session with full identifiers to guarantee schema compliance
      if (this.sessionId) {
        const sessionRef = doc(db, 'sessions', this.sessionId);
        setDoc(sessionRef, { 
          id: this.sessionId,
          visitorId: this.visitorId,
          lastActive: serverTimestamp() 
        }, { merge: true }).catch(() => {});
      }
      
      // Update last visit in visitor with identifier
      if (this.visitorId) {
        const visitorRef = doc(db, 'visitors', this.visitorId);
        setDoc(visitorRef, { 
          id: this.visitorId,
          lastVisit: serverTimestamp() 
        }, { merge: true }).catch(() => {});
      }

    } catch (error) {
      console.warn('[Analytics] Skipped telemetry event write:', error instanceof Error ? error.message : error);
    }
  }

  private static getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Mobile";
    return "Desktop";
  }

  private static getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }
}

