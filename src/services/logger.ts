import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sanitizeLogDetails, maskEmail } from '../lib/security';

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
    // Sanitize any sensitive details, passwords, tokens or emails before processing
    const cleanDetails = sanitizeLogDetails(log.details);
    const cleanMessage = sanitizeLogDetails(log.message) as string;
    const maskedUserEmail = log.userEmail ? maskEmail(log.userEmail) : null;

    // Suppress verbose logs in non-dev, and sanitize all console outputs
    if (typeof window !== 'undefined' && (log.level === 'error' || log.level === 'critical')) {
      console.error(`[SystemAudit] [${log.category.toUpperCase()}] ${cleanMessage}`);
    } else if (log.level === 'warn') {
      console.warn(`[SystemAudit] [${log.category.toUpperCase()}] ${cleanMessage}`);
    }

    try {
      // Enforce payload length constraint to protect Firestore against flood attacks
      const serializedDetails = cleanDetails ? JSON.stringify(cleanDetails).slice(0, 1024) : null;
      
      await addDoc(collection(db, 'system_logs'), {
        category: log.category,
        level: log.level,
        message: cleanMessage.slice(0, 500),
        details: serializedDetails ? JSON.parse(serializedDetails) : null,
        userEmail: maskedUserEmail,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : 'Server',
        timestamp: serverTimestamp(),
      });
    } catch {
      // Silent catch to prevent recursion or UI disruption
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
