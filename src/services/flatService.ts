import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FlatUnit, OwnershipHistoryRecord } from '../types';
import { sampleUnits } from '../data/mockData';
import { auditService } from './auditService';
import { deleteDoc } from 'firebase/firestore';

const FLATS_COLLECTION = 'flats';

const isMasterCleared = (): boolean => {
  return typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true';
};

export const flatService = {
  // Fetch all flats
  getAllFlats: async (): Promise<FlatUnit[]> => {
    try {
      const q = query(collection(db, FLATS_COLLECTION), orderBy('floor', 'asc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return isMasterCleared() ? [] : sampleUnits;
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as FlatUnit[];
    } catch (error) {
      console.warn('Error loading flats from Firestore, falling back to initial master data:', error);
      return isMasterCleared() ? [] : sampleUnits;
    }
  },

  // Get single flat by unitNumber/id
  getFlatById: async (unitNumber: string): Promise<FlatUnit | null> => {
    try {
      const docRef = doc(db, FLATS_COLLECTION, unitNumber);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as FlatUnit;
      }
      if (isMasterCleared()) return null;
      const local = sampleUnits.find(u => u.unitNumber === unitNumber || u.id === unitNumber);
      return local || null;
    } catch {
      if (isMasterCleared()) return null;
      const local = sampleUnits.find(u => u.unitNumber === unitNumber || u.id === unitNumber);
      return local || null;
    }
  },

  // Subscribe to real-time flats updates
  subscribeToFlats: (callback: (flats: FlatUnit[]) => void) => {
    try {
      const q = query(collection(db, FLATS_COLLECTION), orderBy('floor', 'asc'));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback(isMasterCleared() ? [] : sampleUnits);
          } else {
            const flats = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as FlatUnit[];
            callback(flats);
          }
        },
        (error) => {
          console.warn('Flats snapshot listener error, using fallback:', error);
          callback(isMasterCleared() ? [] : sampleUnits);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to flats:', error);
      callback(isMasterCleared() ? [] : sampleUnits);
      return () => {};
    }
  },

  // Delete flat from Firestore
  deleteFlat: async (unitNumber: string): Promise<void> => {
    try {
      const flatRef = doc(db, FLATS_COLLECTION, unitNumber);
      await deleteDoc(flatRef);
    } catch (error) {
      console.error('Error deleting flat:', error);
      throw error;
    }
  },

  // Update a flat
  updateFlat: async (flatId: string, updates: Partial<FlatUnit>): Promise<void> => {
    try {
      const flatRef = doc(db, FLATS_COLLECTION, flatId);
      await updateDoc(flatRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating flat in Firestore:', error);
      throw error;
    }
  },

  // Change Ownership of Flat (with audit & ownership history)
  changeFlatOwnership: async (
    unitNumber: string,
    newMemberId: string,
    newOwnerName: string,
    newOwnerPhone: string,
    changedBy = 'Admin',
    reason = ''
  ): Promise<void> => {
    try {
      const existingFlat = await flatService.getFlatById(unitNumber);
      const prevMemberId = existingFlat?.memberId || 'UNASSIGNED';
      const prevOwnerName = existingFlat?.ownerName || 'Unknown';

      const historyRecord: OwnershipHistoryRecord = {
        id: `own-${Date.now()}`,
        previousMemberId: prevMemberId,
        previousOwnerName: prevOwnerName,
        newMemberId,
        newOwnerName,
        changedBy,
        changedAt: new Date().toISOString(),
        reason
      };

      const existingHistory = existingFlat?.ownershipHistory || [];
      const updatedHistory = [...existingHistory, historyRecord];

      const flatRef = doc(db, FLATS_COLLECTION, unitNumber);
      await setDoc(flatRef, {
        memberId: newMemberId,
        ownerName: newOwnerName,
        ownerPhone: newOwnerPhone,
        status: newMemberId === 'UNASSIGNED' ? 'VACANT' : 'OCCUPIED_OWNER',
        ownershipHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await auditService.logAction(
        'UPDATE',
        'FLATS',
        `ফ্ল্যাট ${unitNumber}-এর মালিকানা পরিবর্তন: ${prevOwnerName} (${prevMemberId}) -> ${newOwnerName} (${newMemberId})`,
        'usr-admin',
        changedBy,
        unitNumber,
        'ADMIN',
        undefined,
        { memberId: prevMemberId, ownerName: prevOwnerName },
        { memberId: newMemberId, ownerName: newOwnerName }
      );
    } catch (error) {
      console.error('Error changing flat ownership:', error);
      throw error;
    }
  },

  // Unlink Flat from Member (keeps Flat Master record intact!)
  unlinkFlat: async (
    unitNumber: string,
    unlinkedBy = 'Admin',
    reason = ''
  ): Promise<void> => {
    await flatService.changeFlatOwnership(
      unitNumber,
      'UNASSIGNED',
      'অবরাদ্দকৃত (Unassigned)',
      '',
      unlinkedBy,
      reason || 'ফ্ল্যাট লিংক বাতিল করা হয়েছে'
    );
  },

  // Upsert flat (for master data seeding)
  upsertFlat: async (flat: FlatUnit): Promise<void> => {
    try {
      const flatRef = doc(db, FLATS_COLLECTION, flat.unitNumber || flat.id);
      await setDoc(flatRef, {
        ...flat,
        isMasterData: true,
        isDemo: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error upserting flat in Firestore:', error);
      throw error;
    }
  }
};
