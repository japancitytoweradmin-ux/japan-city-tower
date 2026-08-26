import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  OpeningBalance, 
  FinancialMismatch, 
  UserProfile, 
  PaymentRecord, 
  ExpenseItem, 
  MonthlyBill 
} from '../types';
import { auditService } from './auditService';
import { paymentService } from './paymentService';
import { expenseService } from './expenseService';
import { billService } from './billService';

const OPENING_BALANCES_COLLECTION = 'openingBalances';

export interface CashBankBreakdown {
  cashCollection: number;
  bankCollection: number;
  otherCollection: number;
  totalCollection: number;

  cashExpense: number;
  bankExpense: number;
  otherExpense: number;
  totalExpense: number;

  openingBalance: number;
  netCashFlow: number;
  closingBalance: number;

  mismatches: FinancialMismatch[];
}

export const cashSummaryService = {
  /**
   * Get Opening Balance for a given billingPeriodId (e.g. "2026-08")
   */
  getOpeningBalance: async (periodId: string): Promise<number> => {
    try {
      const docRef = doc(db, OPENING_BALANCES_COLLECTION, periodId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as OpeningBalance;
        return data.openingBalance ?? 50000;
      }

      // Query collection
      const q = query(
        collection(db, OPENING_BALANCES_COLLECTION), 
        where('billingPeriodId', '==', periodId)
      );
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return (qSnap.docs[0].data() as OpeningBalance).openingBalance ?? 50000;
      }

      // Default opening balance for initial period
      return 50000;
    } catch (err) {
      console.warn('Error reading opening balance:', err);
      return 50000;
    }
  },

  /**
   * Set Opening Balance for a billing period
   */
  setOpeningBalance: async (
    periodId: string, 
    amount: number, 
    actorUser: UserProfile
  ): Promise<void> => {
    try {
      const docRef = doc(db, OPENING_BALANCES_COLLECTION, periodId);
      const record: OpeningBalance = {
        id: periodId,
        billingPeriodId: periodId,
        openingBalance: amount,
        createdBy: actorUser.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, record, { merge: true });

      await auditService.logAction(
        'UPDATE',
        'OPENING_BALANCE',
        `প্রারম্ভিক জের (Opening Balance) আপডেট করা হয়েছে: ৳${amount.toLocaleString('bn-BD')} [${periodId}]`,
        actorUser.id,
        actorUser.name,
        periodId,
        actorUser.role,
        periodId,
        null,
        { openingBalance: amount }
      );
    } catch (error) {
      console.error('Error setting opening balance:', error);
      throw error;
    }
  },

  /**
   * Compute comprehensive Cash & Bank Financial Breakdown & Discrepancies
   */
  getCashAndBankSummary: async (periodId: string): Promise<CashBankBreakdown> => {
    const openingBalance = await cashSummaryService.getOpeningBalance(periodId);

    // Fetch payments, expenses, and bill for periodId
    const [payments, expenses, bill] = await Promise.all([
      paymentService.getPaymentsByPeriod(periodId),
      expenseService.subscribeToExpenses ? new Promise<ExpenseItem[]>((resolve) => {
        const unsub = expenseService.subscribeToExpenses((list) => {
          unsub();
          resolve(list);
        }, periodId);
      }) : Promise.resolve([]),
      billService.getBillByPeriod(periodId)
    ]);

    // Active records only
    const activePayments = payments.filter(p => !p.isDeleted);
    const activeExpenses = expenses.filter(e => !e.isDeleted);

    // Collection Breakdown
    let cashCollection = 0;
    let bankCollection = 0;
    let otherCollection = 0;

    activePayments.forEach(p => {
      const method = String(p.paymentMethod || '').toUpperCase();
      const amount = Number(p.paidAmount || 0);
      if (method === 'CASH') {
        cashCollection += amount;
      } else if (method === 'BANK' || method === 'BANK_TRANSFER' || method === 'CHEQUE') {
        bankCollection += amount;
      } else {
        otherCollection += amount;
      }
    });

    const totalCollection = cashCollection + bankCollection + otherCollection;

    // Expense Breakdown
    let cashExpense = 0;
    let bankExpense = 0;
    let otherExpense = 0;
    let missingVouchersCount = 0;

    activeExpenses.forEach(e => {
      const method = String(e.paymentMethod || '').toUpperCase();
      const amount = Number(e.amount || 0);

      if (method === 'CASH') {
        cashExpense += amount;
      } else if (method === 'BANK' || method === 'BANK_TRANSFER' || method === 'CHEQUE') {
        bankExpense += amount;
      } else {
        otherExpense += amount;
      }

      const hasVoucher = !!(e.voucher || (e.voucherFiles && e.voucherFiles.length > 0) || e.voucherNumber);
      if (!hasVoucher) {
        missingVouchersCount++;
      }
    });

    const totalExpense = cashExpense + bankExpense + otherExpense;
    const netCashFlow = totalCollection - totalExpense;
    const closingBalance = openingBalance + netCashFlow;

    // Financial Mismatch Detection Engine
    const mismatches: FinancialMismatch[] = [];

    // 1. Check for Missing Vouchers
    if (missingVouchersCount > 0) {
      mismatches.push({
        type: 'MISSING_VOUCHER',
        title: 'ভাউচার বিহীন খরচ চিহ্নিত',
        expected: `${activeExpenses.length}টি খরচে ভাউচার আবশ্যক`,
        actual: `${missingVouchersCount}টি খরচে কোনো ভাউচার নেই`,
        difference: `${missingVouchersCount}টি ভাউচার ঘাটতি`,
        severity: 'WARNING',
        description: 'অনুমোদিত বাচাল / হিসাব নিরাপত্তার স্বার্থে সকল খরচের বিপরীতে প্রমাণক ভাউচার থাকা জরুরি।'
      });
    }

    // 2. Check for Bill Calculation vs Expense discrepancy
    if (bill) {
      const calculatedTotalBill = (bill.finalPerFlatAmount || bill.perFlatAmount || 0) * (bill.totalFlats || 24);
      if (Math.abs(calculatedTotalBill - bill.totalExpense) > 50) {
        mismatches.push({
          type: 'BILL_TOTAL_MISMATCH',
          title: 'মোট খরচ ও ফ্ল্যাট বিলের রাউন্ডিং ব্যবধান',
          expected: `৳${bill.totalExpense.toLocaleString('bn-BD')}`,
          actual: `৳${calculatedTotalBill.toLocaleString('bn-BD')}`,
          difference: `৳${Math.abs(calculatedTotalBill - bill.totalExpense).toLocaleString('bn-BD')}`,
          severity: 'WARNING',
          description: 'ফ্ল্যাট প্রতি সমান বিভাজনের সময় রাউন্ডিং রাউন্ডেড পার্থক্যের কারণে ক্ষুদ্র সমন্বয় ব্যবধান তৈরি হতে পারে।'
        });
      }
    }

    // 3. Negative Closing Balance Check
    if (closingBalance < 0) {
      mismatches.push({
        type: 'CLOSING_BALANCE_MISMATCH',
        title: 'সমাপনী জের ঋণাত্মক (Grave Deficit)',
        expected: '≥ ৳০ (ধনাত্মক প্রারম্ভিক/সমাপনী ক্যাশ)',
        actual: `৳${closingBalance.toLocaleString('bn-BD')}`,
        difference: `৳${Math.abs(closingBalance).toLocaleString('bn-BD')} ঘাটতি`,
        severity: 'ERROR',
        description: 'বিল আদায়ের চেয়ে মোট খরচ বেশি হওয়ায় ক্যাশ তহবিল ঘাটিতে পড়েছে।'
      });
    }

    return {
      cashCollection,
      bankCollection,
      otherCollection,
      totalCollection,
      cashExpense,
      bankExpense,
      otherExpense,
      totalExpense,
      openingBalance,
      netCashFlow,
      closingBalance,
      mismatches
    };
  }
};
