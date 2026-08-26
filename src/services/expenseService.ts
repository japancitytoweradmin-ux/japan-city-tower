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
import { ExpenseItem, MonthlyExpenseSummary } from '../types';
import { sampleExpensesJune2025, sampleMonthlySummaryJune2025 } from '../data/mockData';
import { auditService } from './auditService';
import { parseBillingPeriodId, getBillingPeriodId } from '../contexts/BillingPeriodContext';

const EXPENSES_COLLECTION = 'expenses';

export const expenseService = {
  // Get all expenses
  getAllExpenses: async (): Promise<ExpenseItem[]> => {
    try {
      const q = query(collection(db, EXPENSES_COLLECTION), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return [];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ExpenseItem[];
    } catch (error) {
      console.warn('Error loading expenses from Firestore:', error);
      return [];
    }
  },

  // Get expenses by billing period (e.g. "2026-08")
  getExpensesByPeriod: async (periodId: string): Promise<ExpenseItem[]> => {
    try {
      const q = query(
        collection(db, EXPENSES_COLLECTION),
        where('billingPeriodId', '==', periodId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        // Fallback check by legacy 'month' field
        const fallbackQ = query(
          collection(db, EXPENSES_COLLECTION),
          where('month', '==', periodId)
        );
        const fallbackSnap = await getDocs(fallbackQ);
        if (!fallbackSnap.empty) {
          return fallbackSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as ExpenseItem[];
        }
        return [];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ExpenseItem[];
    } catch (error) {
      console.warn('Error loading expenses by period:', error);
      return [];
    }
  },

  // Get expenses by month (legacy support)
  getExpensesByMonth: async (month: string): Promise<ExpenseItem[]> => {
    return expenseService.getExpensesByPeriod(month);
  },

  // Subscribe to real-time expenses with optional billingPeriod filter
  subscribeToExpenses: (
    callback: (expenses: ExpenseItem[]) => void,
    periodId?: string
  ) => {
    try {
      let q = query(collection(db, EXPENSES_COLLECTION), orderBy('date', 'desc'));
      
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback([]);
          } else {
            let expenses = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as ExpenseItem[];

            // Filter out soft-deleted items
            expenses = expenses.filter(e => !e.isDeleted);

            if (periodId) {
              expenses = expenses.filter(e => (e.billingPeriodId || e.month) === periodId);
            }
            callback(expenses);
          }
        },
        (error) => {
          console.warn('Expenses listener error:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to expenses:', error);
      callback([]);
      return () => {};
    }
  },

  // Add new expense (default isDemo = false for real user entries)
  addExpense: async (expense: Omit<ExpenseItem, 'id' | 'createdAt'> & { isDemo?: boolean }): Promise<ExpenseItem> => {
    try {
      const parsed = parseBillingPeriodId(expense.billingPeriodId || expense.month);
      const periodId = expense.billingPeriodId || getBillingPeriodId(parsed.year, parsed.month);

      const newRecord = {
        ...expense,
        billingYear: expense.billingYear || parsed.year,
        billingMonth: expense.billingMonth || parsed.month,
        billingPeriodId: periodId,
        month: periodId,
        isDemo: expense.isDemo !== undefined ? expense.isDemo : false,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), newRecord);
      
      await auditService.logAction(
        'CREATE',
        'EXPENSES',
        `খরচ এন্ট্রি: ${expense.title} (৳${expense.amount}) [${periodId}]`,
        'admin',
        'Admin',
        docRef.id
      );

      return {
        id: docRef.id,
        ...newRecord
      } as ExpenseItem;
    } catch (error) {
      console.error('Error adding expense to Firestore:', error);
      throw error;
    }
  },

  // Update existing expense
  updateExpense: async (id: string, updates: Partial<ExpenseItem>): Promise<boolean> => {
    try {
      const docRef = doc(db, EXPENSES_COLLECTION, id);
      let calculatedUpdates = { ...updates };
      if (updates.billingPeriodId && (!updates.billingYear || !updates.billingMonth)) {
        const parsed = parseBillingPeriodId(updates.billingPeriodId);
        calculatedUpdates.billingYear = parsed.year;
        calculatedUpdates.billingMonth = parsed.month;
        calculatedUpdates.month = updates.billingPeriodId;
      }

      await updateDoc(docRef, {
        ...calculatedUpdates,
        updatedAt: new Date().toISOString()
      });
      await auditService.logAction('UPDATE', 'EXPENSES', `খরচ আপডেট ID: ${id}`, 'admin', 'Admin', id);
      return true;
    } catch (error) {
      console.error('Error updating expense in Firestore:', error);
      throw error;
    }
  },

  // Delete expense
  deleteExpense: async (id: string): Promise<boolean> => {
    try {
      const docRef = doc(db, EXPENSES_COLLECTION, id);
      await deleteDoc(docRef);
      await auditService.logAction('DELETE', 'EXPENSES', `খরচ মুছে ফেলা হয়েছে ID: ${id}`, 'admin', 'Admin', id);
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },

  // Upsert for seeding
  upsertExpense: async (expense: ExpenseItem): Promise<void> => {
    try {
      const docRef = doc(db, EXPENSES_COLLECTION, expense.id);
      await setDoc(docRef, expense, { merge: true });
    } catch (error) {
      console.error('Error upserting expense:', error);
      throw error;
    }
  },

  getMonthlySummary: async (month: string): Promise<MonthlyExpenseSummary> => {
    return sampleMonthlySummaryJune2025;
  }
};
