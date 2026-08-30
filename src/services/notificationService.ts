import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification, NotificationType } from '../types';
import { auditService } from './auditService';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const sampleNotifications: AppNotification[] = [
  {
    id: 'notif-001',
    title: 'বিল প্রকাশিত হয়েছে',
    message: 'চলতি বিলিং পিরিয়ডের কমন ও সার্ভিস বিল প্রস্তুত হয়েছে।',
    type: 'BILL_PUBLISHED',
    billingPeriodId: '2026-08',
    isRead: false,
    createdAt: new Date().toISOString(),
    isDemo: true,
  },
  {
    id: 'notif-002',
    title: 'পেমেন্ট মানি রসিদ',
    message: 'আপনার ফ্ল্যাটের সর্বশেষ বিল পরিশোধ সফলভাবে নথিভুক্ত হয়েছে।',
    type: 'PAYMENT_RECEIVED',
    recipientMemberId: 'mem-001',
    billingPeriodId: '2026-08',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    isDemo: true,
  },
  {
    id: 'notif-003',
    title: 'জরুরি নোটিশ',
    message: 'বিল্ডিং মেইনটেন্যান্স ও নোটিশ সম্বলিত আপডেট দেখতে নোটিশ বোর্ড চেক করুন।',
    type: 'NOTICE',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    isDemo: true,
  }
];

export const notificationService = {
  createNotification: async (
    notificationData: {
      recipientUserId?: string;
      recipientMemberId?: string;
      title: string;
      message: string;
      type: NotificationType;
      billingPeriodId?: string;
      relatedDocumentId?: string;
      linkUrl?: string;
      isDemo?: boolean;
    }
  ): Promise<string> => {
    try {
      const newNotification: Omit<AppNotification, 'id'> = {
        recipientUserId: notificationData.recipientUserId || '',
        recipientMemberId: notificationData.recipientMemberId || '',
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        billingPeriodId: notificationData.billingPeriodId || '',
        relatedDocumentId: notificationData.relatedDocumentId || '',
        linkUrl: notificationData.linkUrl || '',
        isRead: false,
        createdAt: new Date().toISOString(),
        isDemo: notificationData.isDemo ?? false,
      };

      const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), newNotification);
      return docRef.id;
    } catch (error) {
      console.warn('Error saving notification to Firestore, using fallback:', error);
      const fallbackId = `notif-fb-${Date.now()}`;
      sampleNotifications.unshift({
        id: fallbackId,
        ...notificationData,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      return fallbackId;
    }
  },

  getUserNotifications: async (
    userId?: string, 
    memberId?: string
  ): Promise<AppNotification[]> => {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION), 
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return sampleNotifications.filter(n => 
          !n.recipientMemberId || n.recipientMemberId === memberId || !memberId
        );
      }

      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      if (!memberId && !userId) return all;

      return all.filter(n => 
        !n.recipientMemberId || 
        n.recipientMemberId === memberId || 
        (userId && n.recipientUserId === userId) ||
        (!n.recipientMemberId && !n.recipientUserId) // General broadcast
      );
    } catch (error) {
      console.warn('Error fetching notifications from Firestore:', error);
      return sampleNotifications.filter(n => 
        !n.recipientMemberId || n.recipientMemberId === memberId || !memberId
      );
    }
  },

  subscribeToNotifications: (
    callback: (notifications: AppNotification[]) => void,
    userId?: string,
    memberId?: string
  ) => {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION), 
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback(sampleNotifications.filter(n => 
              !n.recipientMemberId || n.recipientMemberId === memberId || !memberId
            ));
          } else {
            const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
            const filtered = all.filter(n => 
              !n.recipientMemberId || 
              n.recipientMemberId === memberId || 
              (userId && n.recipientUserId === userId) ||
              (!n.recipientMemberId && !n.recipientUserId)
            );
            callback(filtered);
          }
        },
        (error) => {
          console.warn('Notifications snapshot error:', error);
          callback(sampleNotifications.filter(n => 
            !n.recipientMemberId || n.recipientMemberId === memberId || !memberId
          ));
        }
      );
    } catch (error) {
      console.warn('Error subscribing to notifications:', error);
      callback(sampleNotifications.filter(n => 
        !n.recipientMemberId || n.recipientMemberId === memberId || !memberId
      ));
      return () => {};
    }
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(docRef, { isRead: true });
    } catch (error) {
      console.warn('Error marking notification as read in Firestore:', error);
      const found = sampleNotifications.find(n => n.id === notificationId);
      if (found) found.isRead = true;
    }
  },

  markAllAsRead: async (userId?: string, memberId?: string): Promise<void> => {
    try {
      const list = await notificationService.getUserNotifications(userId, memberId);
      const unread = list.filter(n => !n.isRead);
      const batch = writeBatch(db);
      unread.forEach(n => {
        const docRef = doc(db, NOTIFICATIONS_COLLECTION, n.id);
        batch.update(docRef, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.warn('Error marking all notifications as read in Firestore:', error);
      sampleNotifications.forEach(n => {
        if (!n.recipientMemberId || n.recipientMemberId === memberId || !memberId) {
          n.isRead = true;
        }
      });
    }
  }
};
