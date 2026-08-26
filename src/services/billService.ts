import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MonthlyBill, BillStatus } from '../types';
import { sampleMonthlyBills } from '../data/mockData';
import { auditService } from './auditService';
import { parseBillingPeriodId, getBillingPeriodId } from '../contexts/BillingPeriodContext';

const BILLS_COLLECTION = 'monthlyBills';

export const billService = {
  getAllBills: async (): Promise<MonthlyBill[]> => {
    try {
      const q = query(collection(db, BILLS_COLLECTION), orderBy('month', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as MonthlyBill[];
    } catch (error) {
      console.warn('Error loading bills from Firestore:', error);
      return [];
    }
  },

  getBillByPeriod: async (periodId: string): Promise<MonthlyBill | null> => {
    try {
      const q = query(collection(db, BILLS_COLLECTION), where('billingPeriodId', '==', periodId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as MonthlyBill;
      }
      // Fallback check by legacy month field
      const fallbackQ = query(collection(db, BILLS_COLLECTION), where('month', '==', periodId));
      const fallbackSnap = await getDocs(fallbackQ);
      if (!fallbackSnap.empty) {
        const doc = fallbackSnap.docs[0];
        return { id: doc.id, ...doc.data() } as MonthlyBill;
      }
      return null;
    } catch (error) {
      console.warn('Error loading bill by period:', error);
      return null;
    }
  },

  subscribeToBills: (
    callback: (bills: MonthlyBill[]) => void,
    periodId?: string
  ) => {
    try {
      const q = query(collection(db, BILLS_COLLECTION), orderBy('month', 'desc'));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
          } else {
            let bills = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as MonthlyBill[];

            // Filter out soft-deleted records
            bills = bills.filter(b => !b.isDeleted);

            if (periodId) {
              bills = bills.filter(b => (b.billingPeriodId || b.month) === periodId);
            }
            callback(bills);
          }
        },
        (error) => {
          console.warn('Bills snapshot listener error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to bills:', error);
      callback([]);
      return () => {};
    }
  },

  updateBillStatus: async (billId: string, status: BillStatus): Promise<void> => {
    try {
      const docRef = doc(db, BILLS_COLLECTION, billId);
      await updateDoc(docRef, {
        status,
        billStatus: status,
        publishedAt: status === 'PUBLISHED' ? new Date().toISOString().split('T')[0] : undefined,
        updatedAt: new Date().toISOString()
      });
      await auditService.logAction('UPDATE', 'BILLS', `বিল স্ট্যাটাস পরিবর্তিত: ${status} (ID: ${billId})`);
    } catch (error) {
      console.error('Error updating bill status:', error);
      throw error;
    }
  },

  createBill: async (bill: Omit<MonthlyBill, 'id'> & { isDemo?: boolean }): Promise<MonthlyBill> => {
    try {
      const parsed = parseBillingPeriodId(bill.billingPeriodId || bill.month);
      const periodId = bill.billingPeriodId || getBillingPeriodId(parsed.year, parsed.month);

      const newBill = {
        ...bill,
        billingYear: bill.billingYear || parsed.year,
        billingMonth: bill.billingMonth || parsed.month,
        billingPeriodId: periodId,
        month: periodId,
        isDemo: bill.isDemo !== undefined ? bill.isDemo : false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, BILLS_COLLECTION), newBill);
      await auditService.logAction('CREATE', 'BILLS', `নতুন মাসিক বিল তৈরি: ${periodId}`, 'admin', 'Admin', docRef.id);
      return { id: docRef.id, ...newBill } as MonthlyBill;
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  },

  upsertBill: async (bill: MonthlyBill): Promise<void> => {
    try {
      const parsed = parseBillingPeriodId(bill.billingPeriodId || bill.month);
      const periodId = bill.billingPeriodId || getBillingPeriodId(parsed.year, parsed.month);

      const billToSave = {
        ...bill,
        billingYear: bill.billingYear || parsed.year,
        billingMonth: bill.billingMonth || parsed.month,
        billingPeriodId: periodId,
        month: periodId
      };

      const docRef = doc(db, BILLS_COLLECTION, bill.id || bill.billId || `bill-${periodId}`);
      await setDoc(docRef, billToSave, { merge: true });
    } catch (error) {
      console.error('Error upserting bill:', error);
      throw error;
    }
  },

  /**
   * Reopen a CLOSED billing period (SUPER_ADMIN ONLY)
   */
  reopenBillingPeriod: async (
    periodId: string,
    reason: string,
    actorUser: { id: string; name: string; role: string }
  ): Promise<void> => {
    if (actorUser.role !== 'SUPER_ADMIN') {
      throw new Error('শুধুমাত্র সুপার অ্যাডমিন বন্ধ ঘোষিত বিলিং পিরিয়ড পুনঃউন্মুক্ত করতে পারবেন।');
    }
    if (!reason || reason.trim().length < 3) {
      throw new Error('পুনঃউন্মুক্ত করার জন্য কারণ উল্লেখ করা আবশ্যক।');
    }

    try {
      const docRef = doc(db, BILLS_COLLECTION, `bill-${periodId}`);
      await setDoc(docRef, {
        status: 'PUBLISHED',
        billStatus: 'PUBLISHED',
        isApproved: true,
        reopenedBy: actorUser.name,
        reopenedAt: new Date().toISOString(),
        reopenReason: reason.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await auditService.logAction(
        'REOPEN',
        'BILLS',
        `বিলিং পিরিয়ড পুনঃউন্মুক্ত করা হয়েছে: ${periodId} (কারণ: ${reason.trim()})`,
        actorUser.id,
        actorUser.name,
        `bill-${periodId}`,
        actorUser.role as any,
        periodId
      );
    } catch (error) {
      console.error('Error reopening billing period:', error);
      throw error;
    }
  }
};
