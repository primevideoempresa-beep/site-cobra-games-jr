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
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

const VISITOR_ID_KEY = 'cg_visitor_id';
const SESSION_ID_KEY = 'cg_session_id';

export class AnalyticsService {
  private static visitorId: string | null = localStorage.getItem(VISITOR_ID_KEY);
  private static sessionId: string | null = sessionStorage.getItem(SESSION_ID_KEY);

  static async init() {
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
      // In a real app we'd use an IP-to-Geo API here
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
  }

  static async trackGameClick(gameId: string) {
    await this.trackEvent('game_click', { gameId });
    // Also increment specific game stats
    const gameStatsRef = doc(db, 'game_stats', gameId);
    await setDoc(gameStatsRef, {
      clicks: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  }

  static async trackGameOpen(gameId: string) {
    await this.trackEvent('game_open', { gameId });
    const gameStatsRef = doc(db, 'game_stats', gameId);
    await setDoc(gameStatsRef, {
      opens: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
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

      // Update last active in session
      const sessionRef = doc(db, 'sessions', this.sessionId);
      await updateDoc(sessionRef, { lastActive: serverTimestamp() });
      
      // Update last visit in visitor
      const visitorRef = doc(db, 'visitors', this.visitorId);
      await updateDoc(visitorRef, { lastVisit: serverTimestamp() });

    } catch (error) {
      console.error('Failed to track event:', error);
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
