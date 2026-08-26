import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PaymentRecord, FlatUnit } from '../types';
import { samplePayments } from '../data/mockData';
import { auditService } from './auditService';
import { receiptService } from './receiptService';
import { flatService } from './flatService';
import { notificationService } from './notificationService';
import { smsService } from './smsService';
import { communicationSettingsService } from './communicationSettingsService';
import { templateService } from './templateService';
import { parseBillingPeriodId, getBillingPeriodId } from '../contexts/BillingPeriodContext';

const PAYMENTS_COLLECTION = 'payments';

export const paymentService = {
  getAllPayments: async (): Promise<PaymentRecord[]> => {
    try {
      const q = query(collection(db, PAYMENTS_COLLECTION), orderBy('paymentDate', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRecord[];
    } catch (error) {
      console.warn('Error loading payments from Firestore:', error);
      return [];
    }
  },

  getPaymentsByPeriod: async (periodId: string): Promise<PaymentRecord[]> => {
    try {
      const q = query(collection(db, PAYMENTS_COLLECTION), where('billingPeriodId', '==', periodId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as PaymentRecord[];
      }
      // Fallback check by legacy month field
      const fallbackQ = query(collection(db, PAYMENTS_COLLECTION), where('month', '==', periodId));
      const fallbackSnap = await getDocs(fallbackQ);
      if (!fallbackSnap.empty) {
        return fallbackSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as PaymentRecord[];
      }
      return [];
    } catch (error) {
      console.warn('Error loading payments by period:', error);
      return [];
    }
  },

  getPaymentsByMember: async (memberId: string): Promise<PaymentRecord[]> => {
    try {
      const q = query(
        collection(db, PAYMENTS_COLLECTION), 
        where('memberId', '==', memberId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRecord[];
    } catch (error) {
      console.warn('Error fetching member payments:', error);
      return [];
    }
  },

  subscribeToPayments: (
    callback: (payments: PaymentRecord[]) => void,
    periodId?: string
  ) => {
    try {
      const q = query(collection(db, PAYMENTS_COLLECTION), orderBy('paymentDate', 'desc'));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
          } else {
            let payments = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as PaymentRecord[];

            // Filter out soft-deleted records
            payments = payments.filter(p => !p.isDeleted);

            if (periodId) {
              payments = payments.filter(p => (p.billingPeriodId || p.month) === periodId);
            }
            callback(payments);
          }
        },
        (error) => {
          console.warn('Payments snapshot listener error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to payments:', error);
      callback([]);
      return () => {};
    }
  },

  subscribeToMemberPayments: (
    memberId: string,
    callback: (payments: PaymentRecord[]) => void,
    periodId?: string
  ) => {
    try {
      const q = query(
        collection(db, PAYMENTS_COLLECTION), 
        where('memberId', '==', memberId),
        orderBy('paymentDate', 'desc')
      );
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
          } else {
            let payments = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as PaymentRecord[];

            // Filter out soft-deleted records
            payments = payments.filter(p => !p.isDeleted);

            if (periodId) {
              payments = payments.filter(p => (p.billingPeriodId || p.month) === periodId);
            }
            callback(payments);
          }
        },
        (error) => {
          console.warn('Member payments snapshot listener error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to member payments:', error);
      callback([]);
      return () => {};
    }
  },

  generateNextReceiptNumber: async (year: number): Promise<string> => {
    try {
      const snapshot = await getDocs(collection(db, PAYMENTS_COLLECTION));
      let count = snapshot.size + 1;
      let candidate = `JCT-${year}-${String(count).padStart(6, '0')}`;
      
      const existing = snapshot.docs.map(d => d.data().receiptNumber);
      while (existing.includes(candidate)) {
        count++;
        candidate = `JCT-${year}-${String(count).padStart(6, '0')}`;
      }
      return candidate;
    } catch (error) {
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      return `JCT-${year}-${randomPart}`;
    }
  },

  addPayment: async (paymentData: Omit<PaymentRecord, 'id' | 'receiptNumber'> & { receiptNumber?: string; isDemo?: boolean }): Promise<PaymentRecord> => {
    try {
      const parsed = parseBillingPeriodId(paymentData.billingPeriodId || paymentData.month || '2026-08');
      const periodId = paymentData.billingPeriodId || getBillingPeriodId(parsed.year, parsed.month);

      const billAmount = paymentData.billAmount ?? 1997;
      const previousDue = paymentData.previousDue ?? 0;
      const paidAmount = paymentData.paidAmount ?? 0;

      // Validation check
      if (paidAmount < 0) {
        throw new Error('Invalid payment amount. (টাকার পরিমাণ সঠিক নয়)');
      }
      if (paidAmount > billAmount + previousDue) {
        throw new Error('Payment amount exceeds the bill. (পেমেন্টের পরিমাণ বিলের চেয়ে বেশি)');
      }

      const calculatedDue = Math.max(0, previousDue + billAmount - paidAmount);
      
      let status: 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE' = 'DUE';
      if (calculatedDue === 0 && (paidAmount > 0 || billAmount + previousDue === 0)) {
        status = 'PAID';
      } else if (paidAmount > 0 && calculatedDue > 0) {
        status = 'PARTIAL';
      } else {
        status = 'DUE';
      }

      const receiptNumber = paymentData.receiptNumber || await paymentService.generateNextReceiptNumber(parsed.year);

      const newPayment: Omit<PaymentRecord, 'id'> = {
        ...paymentData,
        billingYear: paymentData.billingYear || parsed.year,
        billingMonth: paymentData.billingMonth || parsed.month,
        billingPeriodId: periodId,
        month: periodId,
        monthBangla: paymentData.monthBangla || `${periodId}`,
        billAmount,
        previousDue,
        paidAmount,
        currentDue: calculatedDue,
        dueAmount: calculatedDue,
        status,
        receiptNumber,
        flatId: paymentData.flatId || paymentData.flatUnitNumber,
        paymentMethod: paymentData.paymentMethod || 'Cash',
        remarks: paymentData.remarks || paymentData.notes || '',
        collectedBy: paymentData.collectedBy || 'Admin',
        isDemo: paymentData.isDemo !== undefined ? paymentData.isDemo : false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), newPayment);
      const createdPayment = { id: docRef.id, ...newPayment } as PaymentRecord;

      // Automatically create corresponding receipt document
      try {
        await receiptService.createReceipt({
          receiptNumber,
          paymentId: docRef.id,
          memberId: paymentData.memberId,
          memberName: paymentData.memberName,
          flatUnitNumber: paymentData.flatUnitNumber,
          flatId: paymentData.flatId || paymentData.flatUnitNumber,
          billingYear: newPayment.billingYear,
          billingMonth: newPayment.billingMonth,
          billingPeriodId: periodId,
          billAmount,
          previousDue,
          paidAmount,
          currentDue: calculatedDue,
          amount: paidAmount,
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod || 'Cash',
          remarks: paymentData.remarks || paymentData.notes || '',
          collectedBy: paymentData.collectedBy || 'Admin',
          isDemo: newPayment.isDemo,
          createdAt: new Date().toISOString()
        });
      } catch (receiptErr) {
        console.warn('Auto receipt creation warning:', receiptErr);
      }

      // Sync flat status in Firestore
      try {
        const flatRef = doc(db, 'flats', paymentData.flatUnitNumber);
        await setDoc(flatRef, {
          unitNumber: paymentData.flatUnitNumber,
          currentPaid: paidAmount,
          currentDue: calculatedDue,
          paymentStatus: status,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (flatErr) {
        console.warn('Flat status update warning:', flatErr);
      }

      // Automatically create in-app notification for the member
      try {
        await notificationService.createNotification({
          recipientMemberId: paymentData.memberId,
          title: 'পেমেন্ট জমা গৃহীত হয়েছে',
          message: `ফ্ল্যাট ${paymentData.flatUnitNumber}-এর বিল বাবদ ৳${paidAmount.toLocaleString('bn-BD')}/- জমা হয়েছে। রসিদ নং: ${receiptNumber}`,
          type: 'PAYMENT_RECEIVED',
          billingPeriodId: periodId,
          relatedDocumentId: docRef.id,
          isDemo: newPayment.isDemo,
        });
      } catch (notifErr) {
        console.warn('Auto notification warning:', notifErr);
      }

      // Check auto-send SMS setting
      try {
        const commSettings = await communicationSettingsService.getSettings();
        if (commSettings.smsEnabled && commSettings.autoSendPaymentSms) {
          const tmpl = await templateService.getTemplateByType('PAYMENT_CONFIRMATION');
          const message = templateService.replaceVariables(tmpl.body, {
            memberName: paymentData.memberName,
            flatNumber: paymentData.flatUnitNumber,
            billingMonth: paymentData.monthBangla || periodId,
            billingYear: String(newPayment.billingYear),
            paidAmount: paidAmount.toLocaleString('bn-BD'),
            receiptNumber,
            dueAmount: calculatedDue.toLocaleString('bn-BD'),
          });

          // Fetch member's phone if available
          let phone = '01711-000000';
          try {
            const memberDoc = await getDoc(doc(db, 'members', paymentData.memberId));
            if (memberDoc.exists() && memberDoc.data().phone) {
              phone = memberDoc.data().phone;
            }
          } catch (_) {}

          await smsService.sendSms({
            recipientMobile: phone,
            recipientName: paymentData.memberName,
            message,
            memberId: paymentData.memberId,
            flatNumber: paymentData.flatUnitNumber,
            templateType: 'PAYMENT_CONFIRMATION',
            billingPeriodId: periodId,
            relatedDocumentId: docRef.id,
            sentBy: paymentData.collectedBy || 'Admin',
            isDemo: newPayment.isDemo,
          });
        }
      } catch (smsErr) {
        console.warn('Auto SMS trigger warning:', smsErr);
      }

      await auditService.logAction(
        'CREATE',
        'PAYMENTS',
        `টাকা জমা গ্রহণ (${receiptNumber}): ${paymentData.memberName} (ফ্ল্যাট ${paymentData.flatUnitNumber}) - ৳${paidAmount} [${periodId}]`,
        'admin',
        paymentData.collectedBy || 'Admin',
        docRef.id
      );

      return createdPayment;
    } catch (error) {
      console.error('Error adding payment to Firestore:', error);
      throw error;
    }
  },

  upsertPayment: async (payment: PaymentRecord): Promise<void> => {
    try {
      const parsed = parseBillingPeriodId(payment.billingPeriodId || payment.month || '2026-08');
      const periodId = payment.billingPeriodId || getBillingPeriodId(parsed.year, parsed.month);

      const billAmount = payment.billAmount ?? 1997;
      const previousDue = payment.previousDue ?? 0;
      const paidAmount = payment.paidAmount ?? 0;

      const calculatedDue = Math.max(0, previousDue + billAmount - paidAmount);
      let status: 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE' = 'DUE';
      if (calculatedDue === 0 && (paidAmount > 0 || billAmount + previousDue === 0)) {
        status = 'PAID';
      } else if (paidAmount > 0 && calculatedDue > 0) {
        status = 'PARTIAL';
      } else {
        status = 'DUE';
      }

      const paymentToSave = {
        ...payment,
        billingYear: payment.billingYear || parsed.year,
        billingMonth: payment.billingMonth || parsed.month,
        billingPeriodId: periodId,
        month: periodId,
        billAmount,
        previousDue,
        paidAmount,
        currentDue: calculatedDue,
        dueAmount: calculatedDue,
        status,
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(db, PAYMENTS_COLLECTION, payment.id);
      await setDoc(docRef, paymentToSave, { merge: true });

      // Update associated receipt
      try {
        const rcptQ = query(collection(db, 'receipts'), where('paymentId', '==', payment.id));
        const rcptSnap = await getDocs(rcptQ);
        if (!rcptSnap.empty) {
          const rcptDoc = rcptSnap.docs[0];
          await updateDoc(rcptDoc.ref, {
            amount: paidAmount,
            paidAmount,
            currentDue: calculatedDue,
            previousDue,
            billAmount,
            paymentMethod: payment.paymentMethod,
            paymentDate: payment.paymentDate,
            remarks: payment.remarks || payment.notes || '',
            updatedAt: new Date().toISOString()
          });
        }
      } catch (rcptErr) {
        console.warn('Associated receipt update error:', rcptErr);
      }

      // Sync flat status
      try {
        const flatRef = doc(db, 'flats', payment.flatUnitNumber);
        await setDoc(flatRef, {
          currentPaid: paidAmount,
          currentDue: calculatedDue,
          paymentStatus: status,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (flatErr) {
        console.warn('Flat sync error:', flatErr);
      }
    } catch (error) {
      console.error('Error upserting payment:', error);
      throw error;
    }
  },

  deletePayment: async (paymentId: string, flatUnitNumber?: string): Promise<void> => {
    try {
      const docRef = doc(db, PAYMENTS_COLLECTION, paymentId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() : null;

      await deleteDoc(docRef);

      // Delete associated receipt
      try {
        const rcptQ = query(collection(db, 'receipts'), where('paymentId', '==', paymentId));
        const rcptSnap = await getDocs(rcptQ);
        for (const rDoc of rcptSnap.docs) {
          await deleteDoc(rDoc.ref);
        }
      } catch (rcptErr) {
        console.warn('Error removing receipt during payment delete:', rcptErr);
      }

      if (data && data.flatUnitNumber) {
        try {
          const flatRef = doc(db, 'flats', data.flatUnitNumber);
          await setDoc(flatRef, {
            currentPaid: 0,
            currentDue: (data.billAmount || 1997) + (data.previousDue || 0),
            paymentStatus: 'DUE',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fErr) {
          console.warn('Error resetting flat status after payment delete:', fErr);
        }
      }

      await auditService.logAction(
        'DELETE',
        'PAYMENTS',
        `পেমেন্ট রেকর্ড মুছে ফেলা হয়েছে: ID ${paymentId}`,
        'admin',
        'Admin',
        paymentId
      );
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }
};

