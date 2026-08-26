import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ReceiptRecord } from '../types';
import { samplePayments } from '../data/mockData';

const RECEIPTS_COLLECTION = 'receipts';

// Generate initial sample receipts from sample payments
const sampleReceipts: ReceiptRecord[] = samplePayments.map((p) => ({
  id: `rcpt-${p.id}`,
  receiptNumber: p.receiptNumber,
  paymentId: p.id,
  memberId: p.memberId,
  memberName: p.memberName,
  flatUnitNumber: p.flatUnitNumber,
  amount: p.paidAmount,
  paymentDate: p.paymentDate,
  paymentMethod: p.paymentMethod,
  isDemo: true,
  createdAt: p.paymentDate
}));

export const receiptService = {
  getAllReceipts: async (): Promise<ReceiptRecord[]> => {
    try {
      const q = query(collection(db, RECEIPTS_COLLECTION), orderBy('paymentDate', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ReceiptRecord[];
    } catch (error) {
      console.warn('Error loading receipts from Firestore:', error);
      return [];
    }
  },

  getReceiptsByMember: async (memberId: string): Promise<ReceiptRecord[]> => {
    try {
      const q = query(
        collection(db, RECEIPTS_COLLECTION),
        where('memberId', '==', memberId),
        orderBy('paymentDate', 'desc')
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ReceiptRecord[];
    } catch (error) {
      console.warn('Error loading member receipts:', error);
      return [];
    }
  },

  subscribeToReceipts: (callback: (receipts: ReceiptRecord[]) => void) => {
    try {
      const q = query(collection(db, RECEIPTS_COLLECTION), orderBy('paymentDate', 'desc'));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
          } else {
            let receipts = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as ReceiptRecord[];
            receipts = receipts.filter(r => !r.isDeleted);
            callback(receipts);
          }
        },
        (error) => {
          console.warn('Receipts snapshot listener error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to receipts:', error);
      callback([]);
      return () => {};
    }
  },

  subscribeToMemberReceipts: (memberId: string, callback: (receipts: ReceiptRecord[]) => void) => {
    try {
      const q = query(
        collection(db, RECEIPTS_COLLECTION),
        where('memberId', '==', memberId),
        orderBy('paymentDate', 'desc')
      );
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
          } else {
            let receipts = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as ReceiptRecord[];
            receipts = receipts.filter(r => !r.isDeleted);
            callback(receipts);
          }
        },
        (error) => {
          console.warn('Member receipts snapshot listener error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to member receipts:', error);
      callback([]);
      return () => {};
    }
  },

  createReceipt: async (receipt: Omit<ReceiptRecord, 'id'>): Promise<ReceiptRecord> => {
    try {
      const newReceipt = {
        ...receipt,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, RECEIPTS_COLLECTION), newReceipt);
      return { id: docRef.id, ...newReceipt } as ReceiptRecord;
    } catch (error) {
      console.error('Error creating receipt in Firestore:', error);
      throw error;
    }
  },

  upsertReceipt: async (receipt: ReceiptRecord): Promise<void> => {
    try {
      const docRef = doc(db, RECEIPTS_COLLECTION, receipt.id);
      await setDoc(docRef, receipt, { merge: true });
    } catch (error) {
      console.error('Error upserting receipt:', error);
      throw error;
    }
  }
};
