import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Notice } from '../types';
import { sampleNotices } from '../data/mockData';
import { auditService } from './auditService';

const NOTICES_COLLECTION = 'notices';

export const noticeService = {
  getAllNotices: async (): Promise<Notice[]> => {
    try {
      const q = query(collection(db, NOTICES_COLLECTION), orderBy('publishedDate', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Notice[];
    } catch (error) {
      console.warn('Error loading notices from Firestore:', error);
      return [];
    }
  },

  subscribeToNotices: (callback: (notices: Notice[]) => void) => {
    try {
      const q = query(collection(db, NOTICES_COLLECTION), orderBy('publishedDate', 'desc'));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
          } else {
            const notices = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as Notice[];
            callback(notices);
          }
        },
        (error) => {
          console.warn('Notices listener error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to notices:', error);
      callback([]);
      return () => {};
    }
  },

  subscribeToPublishedNotices: (callback: (notices: Notice[]) => void) => {
    try {
      const q = query(
        collection(db, NOTICES_COLLECTION), 
        where('status', '==', 'PUBLISHED'),
        orderBy('publishedDate', 'desc')
      );
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
          } else {
            const notices = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as Notice[];
            callback(notices);
          }
        },
        (error) => {
          console.warn('Published notices listener error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to published notices:', error);
      callback([]);
      return () => {};
    }
  },

  addNotice: async (notice: Omit<Notice, 'id'> & { isDemo?: boolean }): Promise<Notice> => {
    try {
      const newNotice = {
        ...notice,
        isDemo: notice.isDemo !== undefined ? notice.isDemo : false,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, NOTICES_COLLECTION), newNotice);
      await auditService.logAction('CREATE', 'NOTICES', `নোটিশ প্রকাশ: ${notice.title}`);
      return { id: docRef.id, ...newNotice } as Notice;
    } catch (error) {
      console.error('Error adding notice:', error);
      throw error;
    }
  },

  deleteNotice: async (id: string): Promise<boolean> => {
    try {
      const docRef = doc(db, NOTICES_COLLECTION, id);
      await deleteDoc(docRef);
      await auditService.logAction('DELETE', 'NOTICES', `নোটিশ মুছে ফেলা হয়েছে ID: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting notice:', error);
      throw error;
    }
  },

  upsertNotice: async (notice: Notice): Promise<void> => {
    try {
      const docRef = doc(db, NOTICES_COLLECTION, notice.id || `notice-${Date.now()}`);
      await setDoc(docRef, notice, { merge: true });
    } catch (error) {
      console.error('Error upserting notice:', error);
      throw error;
    }
  }
};
