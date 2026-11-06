import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { isSupported, getMessaging, getToken, onMessage } from 'firebase/messaging';

import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
console.log('[Firebase] App inicializado com o projeto:', firebaseConfig.projectId);

// Initialize Firestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth with persistence
export const auth = getAuth(app);
console.log('[Firebase] Auth inicializado. Configurando persistência local...');
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('[Firebase] Persistência configurada com sucesso: browserLocalPersistence');
  })
  .catch((error) => {
    console.error("[Firebase] Erro ao configurar persistência:", error);
  });

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
    console.log('[FCM] Firebase Messaging não é suportado neste navegador/ambiente.');
    return null;
  } catch (err) {
    console.warn('[FCM] Verificação de suporte a Firebase Messaging falhou:', err);
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
          console.log('[FCM] Permissão de notificação não concedida.');
          return null;
        }
      } else if (Notification.permission !== 'granted') {
        console.log('[FCM] Permissão de notificação bloqueada pelo usuário.');
        return null;
      }
    }

    const currentToken = await getToken(msg).catch(err => {
      console.warn('[FCM] Não foi possível obter token com VAPID padrão:', err);
      return null;
    });

    if (currentToken) {
      console.log('[FCM] Token de registro:', currentToken);
      return currentToken;
    } else {
      console.warn('[FCM] Nenhum token de registro disponível.');
      return null;
    }
  } catch (err) {
    console.warn('[FCM] Erro ao recuperar token:', err);
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
        console.log('[FCM] Mensagem recebida em primeiro plano:', payload);
        resolve(payload);
      });
    } catch (err) {
      console.warn('[FCM] Erro ao registrar onMessageListener:', err);
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
  } catch (err) {
    console.warn('[FirebaseAnalytics] Verificação ou inicialização falhou:', err);
    return null;
  }
};

export const logFirebaseEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    const instance = await getAnalyticsInstance();
    if (instance) {
      const { logEvent } = await import('firebase/analytics');
      logEvent(instance, eventName, params);
      console.log(`[FirebaseAnalytics] Evento registrado: ${eventName}`, params);
    }
  } catch (err) {
    console.warn(`[FirebaseAnalytics] Erro ao registrar evento ${eventName}:`, err);
  }
};

if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  getAnalyticsInstance();
}


