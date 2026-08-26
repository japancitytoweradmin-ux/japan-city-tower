import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, AuditModuleType } from '../types';
import { auditService } from './auditService';

export interface ArchivedItem {
  id: string;
  module: AuditModuleType;
  title: string;
  amount?: number;
  date?: string;
  billingPeriodId?: string;
  deletedBy: string;
  deletedAt: string;
  deleteReason: string;
  originalData: any;
}

export const archiveService = {
  /**
   * Soft Delete / Archive a financial or system record
   */
  softDeleteRecord: async (
    collectionName: 'expenses' | 'payments' | 'receipts' | 'monthlyBills' | 'notices',
    recordId: string,
    reason: string,
    actorUser: UserProfile,
    recordTitle?: string
  ): Promise<boolean> => {
    if (!reason || reason.trim().length < 3) {
      throw new Error('আর্কাইভ করার জন্য উপযুক্ত কারণ উল্লেখ করা আবশ্যক।');
    }

    try {
      const docRef = doc(db, collectionName, recordId);
      const deleteInfo = {
        isDeleted: true,
        deletedBy: `${actorUser.name} (${actorUser.role})`,
        deletedAt: new Date().toISOString(),
        deleteReason: reason.trim()
      };

      await updateDoc(docRef, deleteInfo);

      const moduleMap: Record<string, AuditModuleType> = {
        expenses: 'EXPENSES',
        payments: 'PAYMENTS',
        receipts: 'RECEIPTS',
        monthlyBills: 'BILLS',
        notices: 'NOTICES'
      };

      await auditService.logAction(
        'DELETE',
        moduleMap[collectionName] || 'ARCHIVE',
        `আর্কাইভ করা হয়েছে: ${recordTitle || recordId} (কারণ: ${reason})`,
        actorUser.id,
        actorUser.name,
        recordId,
        actorUser.role,
        undefined,
        null,
        deleteInfo
      );

      return true;
    } catch (error) {
      console.error('Error soft deleting record:', error);
      throw error;
    }
  },

  /**
   * Restore an archived record (SUPER_ADMIN or authorized)
   */
  restoreRecord: async (
    collectionName: 'expenses' | 'payments' | 'receipts' | 'monthlyBills' | 'notices',
    recordId: string,
    actorUser: UserProfile,
    recordTitle?: string
  ): Promise<boolean> => {
    try {
      const docRef = doc(db, collectionName, recordId);
      await updateDoc(docRef, {
        isDeleted: false,
        restoredBy: actorUser.name,
        restoredAt: new Date().toISOString()
      });

      const moduleMap: Record<string, AuditModuleType> = {
        expenses: 'EXPENSES',
        payments: 'PAYMENTS',
        receipts: 'RECEIPTS',
        monthlyBills: 'BILLS',
        notices: 'NOTICES'
      };

      await auditService.logAction(
        'RESTORE',
        moduleMap[collectionName] || 'ARCHIVE',
        `পুনরুদ্ধার (Restore) করা হয়েছে: ${recordTitle || recordId}`,
        actorUser.id,
        actorUser.name,
        recordId,
        actorUser.role
      );

      return true;
    } catch (error) {
      console.error('Error restoring record:', error);
      throw error;
    }
  },

  /**
   * Fetch all archived records across collections
   */
  getAllArchivedRecords: async (
    billingPeriodId?: string,
    moduleFilter?: string
  ): Promise<ArchivedItem[]> => {
    const collectionsToSearch: Array<{ name: 'expenses' | 'payments' | 'receipts' | 'monthlyBills' | 'notices'; module: AuditModuleType }> = [
      { name: 'expenses', module: 'EXPENSES' },
      { name: 'payments', module: 'PAYMENTS' },
      { name: 'receipts', module: 'RECEIPTS' },
      { name: 'monthlyBills', module: 'BILLS' },
      { name: 'notices', module: 'NOTICES' }
    ];

    let results: ArchivedItem[] = [];

    for (const item of collectionsToSearch) {
      if (moduleFilter && moduleFilter !== 'ALL' && moduleFilter !== item.module) {
        continue;
      }

      try {
        const q = query(
          collection(db, item.name),
          where('isDeleted', '==', true)
        );
        const snap = await getDocs(q);

        snap.docs.forEach((doc) => {
          const data = doc.data();
          const pId = data.billingPeriodId || data.month || '';

          if (!billingPeriodId || billingPeriodId === 'ALL' || pId === billingPeriodId) {
            results.push({
              id: doc.id,
              module: item.module,
              title: data.title || data.receiptNumber || data.monthBangla || data.memberName || 'আর্কাইভকৃত রেকর্ড',
              amount: data.amount || data.totalExpense || data.paidAmount || 0,
              date: data.date || data.paymentDate || data.publishedDate || data.deletedAt?.split('T')[0] || '',
              billingPeriodId: pId,
              deletedBy: data.deletedBy || 'অ্যাডমিন',
              deletedAt: data.deletedAt || new Date().toISOString(),
              deleteReason: data.deleteReason || 'কারণ নির্দিষ্ট নয়',
              originalData: { collectionName: item.name, ...data }
            });
          }
        });
      } catch (err) {
        console.warn(`Error querying archive for ${item.name}:`, err);
      }
    }

    // Sort by deletedAt desc
    results.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    return results;
  }
};
