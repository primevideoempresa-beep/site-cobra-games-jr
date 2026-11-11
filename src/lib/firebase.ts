import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { isSupported, getMessaging, getToken, onMessage } from 'firebase/messaging';

import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with secured connection
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth with persistence and fallback (sem logs revelando estrutura interna)
export const auth = getAuth(app);
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    setPersistence(auth, inMemoryPersistence).catch(() => {});
  });
} catch {
  // Silent fallback
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Messaging safely
export let messaging: any = null;

export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (supported) {
      if (!messaging) {
        messaging = getMessaging(app);
      }
      return messaging;
    }
    return null;
  } catch {
    return null;
  }
};

export const requestForToken = async () => {
  try {
    const msg = await getMessagingInstance();
    if (!msg) return null;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return null;
        }
      } else if (Notification.permission !== 'granted') {
        return null;
      }
    }

    const currentToken = await getToken(msg).catch(() => null);
    // Token is returned for internal persistence without logging to console
    return currentToken || null;
  } catch {
    return null;
  }
};

export const onMessageListener = () =>
  new Promise(async (resolve) => {
    try {
      const msg = await getMessagingInstance();
      if (!msg) {
        resolve(null);
        return;
      }
      onMessage(msg, (payload) => {
        resolve(payload);
      });
    } catch {
      resolve(null);
    }
  });

// Initialize Analytics safely
export let analytics: any = null;

export const getAnalyticsInstance = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported().catch(() => false);
    if (supported && firebaseConfig.measurementId) {
      if (!analytics) {
        analytics = getAnalytics(app);
      }
      return analytics;
    }
    return null;
  } catch {
    return null;
  }
};

export const logFirebaseEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    const instance = await getAnalyticsInstance();
    if (instance) {
      const { logEvent } = await import('firebase/analytics');
      logEvent(instance, eventName, params);
    }
  } catch {
    // Silent catch
  }
};

if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  getAnalyticsInstance();
}
