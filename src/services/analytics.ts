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
import { v4 as uuidv4 } from 'uuid';

const VISITOR_ID_KEY = 'cg_visitor_id';
const SESSION_ID_KEY = 'cg_session_id';
const FIRST_VISIT_KEY = 'cg_first_visit_ts';
const DESK_RACER_PLAY_COUNT_KEY = 'cg_dr_play_count';
const DESK_RACER_LAST_PLAYED_KEY = 'cg_dr_last_played_ts';

export class AnalyticsService {
  private static visitorId: string | null = localStorage.getItem(VISITOR_ID_KEY);
  private static sessionId: string | null = sessionStorage.getItem(SESSION_ID_KEY);

  static getRetentionCohort(): { daysSinceFirstVisit: number; cohort: string; isReturning: boolean; careerPlays: number } {
    let firstVisitStr = localStorage.getItem(FIRST_VISIT_KEY);
    if (!firstVisitStr) {
      firstVisitStr = String(Date.now());
      localStorage.setItem(FIRST_VISIT_KEY, firstVisitStr);
    }
    const firstVisitTs = parseInt(firstVisitStr, 10) || Date.now();
    const daysSinceFirstVisit = Math.floor((Date.now() - firstVisitTs) / (1000 * 60 * 60 * 24));
    
    let cohort = 'D0_new';
    if (daysSinceFirstVisit === 1) cohort = 'D1_retained';
    else if (daysSinceFirstVisit >= 2 && daysSinceFirstVisit <= 7) cohort = 'D7_retained';
    else if (daysSinceFirstVisit > 7) cohort = 'D30_plus';

    const careerPlays = parseInt(localStorage.getItem(DESK_RACER_PLAY_COUNT_KEY) || '0', 10);
    const isReturning = careerPlays > 0;

    return { daysSinceFirstVisit, cohort, isReturning, careerPlays };
  }

  static async init() {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, String(Date.now()));
    }

    if (!this.visitorId) {
      this.visitorId = uuidv4();
      localStorage.setItem(VISITOR_ID_KEY, this.visitorId);
      await this.createVisitorProfile();
    }

    if (!this.sessionId) {
      this.sessionId = uuidv4();
      sessionStorage.setItem(SESSION_ID_KEY, this.sessionId);
      await this.createSession();
    }

    this.trackPageView(window.location.pathname);
  }

  private static async createVisitorProfile() {
    if (!this.visitorId) return;
    const visitorRef = doc(db, 'visitors', this.visitorId);
    await setDoc(visitorRef, {
      id: this.visitorId,
      firstVisit: serverTimestamp(),
      lastVisit: serverTimestamp(),
      userAgent: navigator.userAgent,
      device: this.getDeviceType(),
      browser: this.getBrowser(),
      region: 'Unknown',
      country: 'Unknown'
    }, { merge: true });
  }

  private static async createSession() {
    if (!this.visitorId || !this.sessionId) return;
    const sessionRef = doc(db, 'sessions', this.sessionId);
    await setDoc(sessionRef, {
      id: this.sessionId,
      visitorId: this.visitorId,
      startTime: serverTimestamp(),
      lastActive: serverTimestamp(),
      device: this.getDeviceType(),
      browser: this.getBrowser()
    });
  }

  static async trackPageView(page: string) {
    await this.trackEvent('page_view', { page });
    logFirebaseEvent('page_view', { page_path: page });
  }

  static async trackGameClick(gameId: string) {
    await this.trackEvent('game_click', { gameId });
    logFirebaseEvent('select_content', { content_type: 'game', item_id: gameId });
    const gameStatsRef = doc(db, 'game_stats', gameId);
    await setDoc(gameStatsRef, {
      clicks: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  }

  static async trackGameOpen(gameId: string) {
    await this.trackEvent('game_open', { gameId });
    logFirebaseEvent('level_start', { level_name: gameId });
    const gameStatsRef = doc(db, 'game_stats', gameId);
    await setDoc(gameStatsRef, {
      opens: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  }

  // -------------------------------------------------------------------------
  // DESK RACER RETENTION & USER BEHAVIOR TRACKING
  // -------------------------------------------------------------------------

  static async trackDeskRacerRaceStart(params: { camera?: string | number; inputMethod?: string } = {}) {
    const retention = this.getRetentionCohort();
    const newCareerCount = retention.careerPlays + 1;
    localStorage.setItem(DESK_RACER_PLAY_COUNT_KEY, String(newCareerCount));
    localStorage.setItem(DESK_RACER_LAST_PLAYED_KEY, String(Date.now()));

    const eventData = {
      gameId: 'desk_racer',
      camera: String(params.camera || '1'),
      inputMethod: params.inputMethod || 'keyboard',
      retentionCohort: retention.cohort,
      daysSinceFirstVisit: retention.daysSinceFirstVisit,
      isReturningPlayer: retention.isReturning,
      careerRaceNumber: newCareerCount
    };

    await this.trackEvent('desk_racer_race_start', eventData);
    logFirebaseEvent('desk_racer_race_start', eventData);

    const gameStatsRef = doc(db, 'game_stats', 'desk_racer');
    const updatePayload: Record<string, any> = {
      racesStarted: increment(1),
      lastUpdated: serverTimestamp()
    };
    if (retention.cohort === 'D1_retained') updatePayload.retentionD1 = increment(1);
    if (retention.cohort === 'D7_retained') updatePayload.retentionD7 = increment(1);

    await setDoc(gameStatsRef, updatePayload, { merge: true });
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
    const retention = this.getRetentionCohort();
    const eventData = {
      gameId: 'desk_racer',
      totalTime: Number(params.totalTime.toFixed(3)),
      bestLap: Number(params.bestLap.toFixed(3)),
      retentionCohort: retention.cohort
    };

    await this.trackEvent('desk_racer_race_finish', eventData);
    logFirebaseEvent('desk_racer_race_finish', eventData);

    const gameStatsRef = doc(db, 'game_stats', 'desk_racer');
    await setDoc(gameStatsRef, {
      racesCompleted: increment(1),
      totalPlaytimeSeconds: increment(Math.round(params.totalTime)),
      lastUpdated: serverTimestamp()
    }, { merge: true });
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
    if (!this.visitorId || !this.sessionId) return;
    
    try {
      await addDoc(collection(db, 'events'), {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        type,
        timestamp: serverTimestamp(),
        ...metadata
      });

      // Update last active in session using setDoc with merge for robustness
      const sessionRef = doc(db, 'sessions', this.sessionId);
      await setDoc(sessionRef, { lastActive: serverTimestamp() }, { merge: true });
      
      // Update last visit in visitor using setDoc with merge for robustness
      const visitorRef = doc(db, 'visitors', this.visitorId);
      await setDoc(visitorRef, { lastVisit: serverTimestamp() }, { merge: true });

    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
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
