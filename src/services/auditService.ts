import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog, UserRole, AuditActionType, AuditModuleType } from '../types';

export interface AuditLogFilters {
  date?: string;
  userId?: string;
  userRole?: UserRole;
  module?: string;
  action?: string;
  billingYear?: number;
  billingMonth?: number;
  billingPeriodId?: string;
  searchQuery?: string;
}

const AUDIT_LOGS_COLLECTION = 'auditLogs';

export const auditService = {
  /**
   * Log an audit event (Append-Only)
   */
  logAction: async (
    action: AuditActionType,
    module: AuditModuleType,
    description: string,
    userId: string = 'usr-admin',
    userName: string = 'Admin',
    recordId?: string,
    userRole?: UserRole,
    billingPeriodId?: string,
    oldData?: any,
    newData?: any
  ): Promise<void> => {
    try {
      const cleanOld = oldData ? JSON.parse(JSON.stringify(oldData)) : null;
      const cleanNew = newData ? JSON.parse(JSON.stringify(newData)) : null;

      const logEntry: Omit<AuditLog, 'id'> = {
        userId,
        userName,
        userRole: userRole || 'ADMIN',
        action,
        module,
        documentId: recordId || '',
        recordId: recordId || '',
        billingPeriodId: billingPeriodId || '',
        description,
        oldData: cleanOld,
        newData: cleanNew,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, AUDIT_LOGS_COLLECTION), logEntry);
    } catch (error) {
      console.warn('Audit log write note:', error);
    }
  },

  /**
   * Real-time listener for audit logs
   */
  subscribeToAuditLogs: (
    callback: (logs: AuditLog[]) => void,
    filters?: AuditLogFilters
  ) => {
    try {
      const q = query(
        collection(db, AUDIT_LOGS_COLLECTION),
        orderBy('timestamp', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          let logs = snapshot.docs.map((doc) => ({
            id: doc.id,
            logId: doc.id,
            ...doc.data()
          })) as AuditLog[];

          // Apply filters in memory for high responsiveness
          if (filters) {
            if (filters.date) {
              logs = logs.filter(l => l.timestamp.startsWith(filters.date!));
            }
            if (filters.userId && filters.userId !== 'ALL') {
              logs = logs.filter(l => l.userId === filters.userId);
            }
            if (filters.userRole && filters.userRole !== 'ALL' as any) {
              logs = logs.filter(l => l.userRole === filters.userRole);
            }
            if (filters.module && filters.module !== 'ALL') {
              logs = logs.filter(l => l.module === filters.module);
            }
            if (filters.action && filters.action !== 'ALL') {
              logs = logs.filter(l => l.action === filters.action);
            }
            if (filters.billingPeriodId && filters.billingPeriodId !== 'ALL') {
              logs = logs.filter(l => l.billingPeriodId === filters.billingPeriodId);
            }
            if (filters.searchQuery) {
              const q = filters.searchQuery.toLowerCase();
              logs = logs.filter(l => 
                l.description.toLowerCase().includes(q) ||
                l.userName.toLowerCase().includes(q) ||
                (l.documentId && l.documentId.toLowerCase().includes(q)) ||
                (l.billingPeriodId && l.billingPeriodId.toLowerCase().includes(q))
              );
            }
          }

          callback(logs);
        },
        (error) => {
          console.warn('Audit logs snapshot note:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Audit log subscribe error:', error);
      callback([]);
      return () => {};
    }
  },

  /**
   * Get audit logs once
   */
  getAuditLogs: async (filters?: AuditLogFilters): Promise<AuditLog[]> => {
    try {
      const q = query(
        collection(db, AUDIT_LOGS_COLLECTION),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      let logs = snap.docs.map((doc) => ({
        id: doc.id,
        logId: doc.id,
        ...doc.data()
      })) as AuditLog[];

      if (filters) {
        if (filters.searchQuery) {
          const queryLower = filters.searchQuery.toLowerCase();
          logs = logs.filter(l => l.description.toLowerCase().includes(queryLower));
        }
      }
      return logs;
    } catch (err) {
      console.warn('Error fetching audit logs:', err);
      return [];
    }
  }
};
