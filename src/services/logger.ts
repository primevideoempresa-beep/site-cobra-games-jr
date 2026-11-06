import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type LogLevel = 'info' | 'warn' | 'error' | 'critical';

export interface SystemLog {
  level: LogLevel;
  category: 'auth' | 'navigation' | 'database' | 'performance' | 'general';
  message: string;
  details?: any;
  userEmail?: string | null;
  userAgent: string;
  timestamp?: any;
}

export class LoggerService {
  static async log(log: Omit<SystemLog, 'userAgent' | 'timestamp'>) {
    // Also log to console for immediate visibility during dev
    const msg = `[SystemLog] [${log.category.toUpperCase()}] ${log.message}`;
    if (log.level === 'error' || log.level === 'critical') {
      console.error(msg, log.details || '');
    } else if (log.level === 'warn') {
      console.warn(msg, log.details || '');
    } else {
      console.log(msg, log.details || '');
    }

    try {
      await addDoc(collection(db, 'system_logs'), {
        ...log,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
      });
      
      // If the log is critical, it would typically trigger a Cloud Function
      // which sends the FCM message to the tokens stored in 'fcm_tokens'
      if (log.level === 'critical') {
        console.log('[LoggerService] [NOTIFY] Evento crítico registrado. Pronto para acionamento de Push Notification.');
      }
    } catch (err) {
      // If logging itself fails, we just log to console to avoid infinite loops or blocking the UI
      console.error('[LoggerService] Failed to persist log:', err);
    }
  }

  static async logAuthEvent(message: string, level: LogLevel = 'info', details?: any, email?: string | null) {
    await this.log({
      category: 'auth',
      level,
      message,
      details,
      userEmail: email
    });
  }

  static async logError(message: string, details?: any, category: SystemLog['category'] = 'general') {
    await this.log({
      category,
      level: 'error',
      message,
      details
    });
  }
}
