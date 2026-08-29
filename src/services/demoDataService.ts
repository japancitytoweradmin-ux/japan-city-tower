import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  query, 
  where,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  sampleUnits, 
  sampleMembers, 
  sampleExpensesJune2025, 
  sampleMonthlySummaryJune2025, 
  samplePayments, 
  sampleNotices,
  initialBuildingSettings 
} from '../data/mockData';
import { DemoDataSummary } from '../types';
import { auditService } from './auditService';

export const demoDataService = {
  // Get counts and summary of Master vs Demo data
  getDemoDataSummary: async (): Promise<DemoDataSummary> => {
    try {
      const isMasterCleared = typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true';
      const isDemoCleared = typeof window !== 'undefined' && localStorage.getItem('jct_demo_cleared') === 'true';

      const [
        flatsSnap,
        membersSnap,
        expensesSnap,
        billsSnap,
        paymentsSnap,
        receiptsSnap,
        noticesSnap
      ] = await Promise.all([
        getDocs(collection(db, 'flats')),
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'monthlyBills')),
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'receipts')),
        getDocs(collection(db, 'notices'))
      ]);

      const demoExpensesCount = expensesSnap.size;
      const demoBillsCount = billsSnap.size;
      const demoPaymentsCount = paymentsSnap.size;
      const demoReceiptsCount = receiptsSnap.size;
      const demoNoticesCount = noticesSnap.size;

      const demoVouchersCount = expensesSnap.docs.filter((d) => {
        const data = d.data();
        return Boolean(data.voucher) || Boolean(data.voucherFiles && data.voucherFiles.length > 0);
      }).length;

      return {
        masterFlatsCount: isMasterCleared ? flatsSnap.size : (flatsSnap.size || (isDemoCleared ? 0 : sampleUnits.length)),
        masterMembersCount: isMasterCleared ? membersSnap.size : (membersSnap.size || (isDemoCleared ? 0 : sampleMembers.length)),
        demoExpensesCount,
        demoBillsCount,
        demoPaymentsCount,
        demoReceiptsCount,
        demoNoticesCount,
        demoVouchersCount,
        realExpensesCount: 0,
        realBillsCount: 0,
        realPaymentsCount: 0,
        realReceiptsCount: 0,
        realNoticesCount: 0
      };
    } catch (error) {
      console.warn('Error fetching demo data summary:', error);
      const isMasterCleared = typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true';
      return {
        masterFlatsCount: isMasterCleared ? 0 : sampleUnits.length,
        masterMembersCount: isMasterCleared ? 0 : sampleMembers.length,
        demoExpensesCount: 0,
        demoBillsCount: 0,
        demoPaymentsCount: 0,
        demoReceiptsCount: 0,
        demoNoticesCount: 0,
        demoVouchersCount: 0,
        realExpensesCount: 0,
        realBillsCount: 0,
        realPaymentsCount: 0,
        realReceiptsCount: 0,
        realNoticesCount: 0
      };
    }
  },

  // Check if demo data was explicitly cleared by user
  isDemoCleared: async (): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('jct_demo_cleared') === 'true') {
        return true;
      }
      const demoStatusDoc = await getDoc(doc(db, 'settings', 'demoStatus'));
      if (demoStatusDoc.exists() && demoStatusDoc.data()?.isDemoCleared === true) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('jct_demo_cleared', 'true');
        }
        return true;
      }
      return false;
    } catch {
      return typeof window !== 'undefined' && localStorage.getItem('jct_demo_cleared') === 'true';
    }
  },

  // Seed Master Data (28 Flats & Members)
  seedMasterData: async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jct_master_cleared');
      }
      const masterStatusRef = doc(db, 'settings', 'masterStatus');
      await setDoc(masterStatusRef, { isMasterCleared: false, updatedAt: new Date().toISOString() }, { merge: true });

      const batch = writeBatch(db);

      // Seed 28 Master Flats
      for (const flat of sampleUnits) {
        const flatRef = doc(db, 'flats', flat.unitNumber);
        batch.set(flatRef, {
          ...flat,
          id: flat.unitNumber,
          isMasterData: true,
          isDemo: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Seed Master Members (with SM Khalilur Rahman owning 6-B, 7-B, 8-B)
      for (const member of sampleMembers) {
        const memberRef = doc(db, 'members', member.memberId);
        batch.set(memberRef, {
          ...member,
          id: member.memberId,
          flatIds: member.flatUnitNumbers,
          isMasterData: true,
          isDemo: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Seed Building Settings
      const settingsRef = doc(db, 'settings', 'building');
      batch.set(settingsRef, {
        ...initialBuildingSettings,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await batch.commit();
      await auditService.logAction('SEED', 'MEMBERS', 'Master Data (২৮টি ফ্ল্যাট ও সদস্য তথ্য) সিডিং সম্পন্ন');
    } catch (error) {
      console.error('Failed to seed master data:', error);
      throw error;
    }
  },

  // Seed Demo Transactional Data
  seedDemoTransactions: async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jct_demo_cleared');
      }
      const statusRef = doc(db, 'settings', 'demoStatus');
      await setDoc(statusRef, { isDemoCleared: false, updatedAt: new Date().toISOString() }, { merge: true });

      const batch = writeBatch(db);

      // Expenses
      for (const exp of sampleExpensesJune2025) {
        const expRef = doc(db, 'expenses', exp.id);
        batch.set(expRef, {
          ...exp,
          isDemo: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Bills
      const billRef = doc(db, 'monthlyBills', `bill-${sampleMonthlySummaryJune2025.month}`);
      batch.set(billRef, {
        ...sampleMonthlySummaryJune2025,
        id: `bill-${sampleMonthlySummaryJune2025.month}`,
        isDemo: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Payments
      for (const pay of samplePayments) {
        const payRef = doc(db, 'payments', pay.id);
        batch.set(payRef, {
          ...pay,
          isDemo: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Receipts
        const rcptRef = doc(db, 'receipts', `rcpt-${pay.id}`);
        batch.set(rcptRef, {
          id: `rcpt-${pay.id}`,
          receiptNumber: pay.receiptNumber,
          paymentId: pay.id,
          memberId: pay.memberId,
          memberName: pay.memberName,
          flatUnitNumber: pay.flatUnitNumber,
          amount: pay.paidAmount,
          paymentDate: pay.paymentDate,
          paymentMethod: pay.paymentMethod,
          isDemo: true,
          createdAt: pay.paymentDate
        }, { merge: true });
      }

      // Notices
      for (const notice of sampleNotices) {
        const notRef = doc(db, 'notices', notice.id);
        batch.set(notRef, {
          ...notice,
          isDemo: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await batch.commit();
      await auditService.logAction('SEED', 'EXPENSES', 'ডেমো লেনদেন ও ভাউচার ডাটা সিডিং সম্পন্ন');
    } catch (error) {
      console.error('Failed to seed demo transactions:', error);
      throw error;
    }
  },

  // CRITICAL SAFETY FUNCTION: Clears ONLY demo transaction data
  // NEVER DELETES Master Flats, Master Members, Users, or Settings.
  clearDemoTransactionalData: async (actorName: string = 'Admin'): Promise<{ 
    deletedCount: number;
    breakdown: { expenses: number; bills: number; payments: number; receipts: number; notices: number; vouchers: number; }
  }> => {
    console.log('Starting clearDemoTransactionalData...');
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('jct_demo_cleared', 'true');
      }
      const statusRef = doc(db, 'settings', 'demoStatus');
      await setDoc(statusRef, { isDemoCleared: true, clearedAt: new Date().toISOString() }, { merge: true });

      const collectionsToCheck = [
        { name: 'expenses', key: 'expenses' },
        { name: 'monthlyBills', key: 'bills' },
        { name: 'payments', key: 'payments' },
        { name: 'receipts', key: 'receipts' },
        { name: 'notices', key: 'notices' },
        { name: 'notifications', key: 'notices' },
        { name: 'smsLogs', key: 'notices' },
        { name: 'openingBalances', key: 'bills' }
      ] as const;

      const breakdown = {
        expenses: 0,
        bills: 0,
        payments: 0,
        receipts: 0,
        notices: 0,
        vouchers: 0
      };

      let totalDeleted = 0;

      for (const col of collectionsToCheck) {
        try {
          console.log(`Clearing collection: ${col.name}`);
          const snapshot = await getDocs(collection(db, col.name));

          if (!snapshot.empty) {
            const batch = writeBatch(db);
            let batchCount = 0;
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              // Allow deleting monthlyBills even if they were marked as isMasterData (e.g. from the bills creation page)
              if (data.isMasterData && col.name !== 'monthlyBills') return;

              if (col.key === 'expenses' && (data.voucher || (data.voucherFiles && data.voucherFiles.length > 0))) {
                breakdown.vouchers++;
              }
              batch.delete(docSnap.ref);
              batchCount++;
              if (col.key in breakdown) {
                breakdown[col.key as keyof typeof breakdown]++;
              }
              totalDeleted++;
            });
            
            if (batchCount > 0) {
              console.log(`Committing batch for ${col.name} with ${batchCount} deletes...`);
              await batch.commit();
            }
          }
        } catch (colErr) {
          console.warn(`Error clearing collection ${col.name}:`, colErr);
        }
      }

      // Reset flat balances to 0
      try {
        console.log('Resetting flat balances...');
        const flatsSnap = await getDocs(collection(db, 'flats'));
        if (!flatsSnap.empty) {
          const flatBatch = writeBatch(db);
          let flatCount = 0;
          flatsSnap.docs.forEach(fDoc => {
            flatBatch.update(fDoc.ref, {
              currentPaid: 0,
              currentDue: 0,
              paymentStatus: 'DUE',
              updatedAt: new Date().toISOString()
            });
            flatCount++;
          });
          if (flatCount > 0) {
            await flatBatch.commit();
          }
        }
      } catch (fErr) {
        console.warn('Reset flats error during demo clear:', fErr);
      }

      // Reset members total paid/due
      try {
        console.log('Resetting members paid/due sums...');
        const membersSnap = await getDocs(collection(db, 'members'));
        if (!membersSnap.empty) {
          const memBatch = writeBatch(db);
          let memCount = 0;
          membersSnap.docs.forEach(mDoc => {
            memBatch.update(mDoc.ref, {
              totalPaid: 0,
              totalDue: 0,
              updatedAt: new Date().toISOString()
            });
            memCount++;
          });
          if (memCount > 0) {
            await memBatch.commit();
          }
        }
      } catch (mErr) {
        console.warn('Reset members error during demo clear:', mErr);
      }

      // If mock vouchers were present
      if (breakdown.expenses > 0 && breakdown.vouchers === 0) {
        breakdown.vouchers = sampleExpensesJune2025.filter(e => !!e.voucher).length;
      }

      console.log('Writing audit log...');
      try {
        await auditService.logAction(
          'DELETE',
          'SETTINGS',
          `CLEAR_DEMO_DATA: ${actorName} দ্বারা মোট ${totalDeleted}টি ডেমো রেকর্ড মুছে ফেলা হয়েছে। ফ্ল্যাট ও সদস্যদের মোবাইল নম্বর ও নাম সুরক্ষিত রেখে সব লেনদেন পরিষ্কার করা হয়েছে।`,
          'usr-admin',
          actorName,
          'demo-clear',
          'ADMIN'
        );
      } catch (auditErr) {
        console.warn('Failed to log clear demo audit action:', auditErr);
      }

      console.log('Clearing completed successfully, totalDeleted:', totalDeleted);
      return { deletedCount: totalDeleted, breakdown };
    } catch (error) {
      console.error('Error clearing demo data:', error);
      throw error;
    }
  },

  // Clear Master Members and Master Flats completely
  clearMasterMembersAndFlats: async (actorName: string = 'Admin'): Promise<{ deletedMembersCount: number; deletedFlatsCount: number }> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('jct_master_cleared', 'true');
      }
      const statusRef = doc(db, 'settings', 'masterStatus');
      await setDoc(statusRef, { isMasterCleared: true, clearedAt: new Date().toISOString() }, { merge: true });

      let deletedMembersCount = 0;
      let deletedFlatsCount = 0;

      // 1. Delete all members
      const membersSnap = await getDocs(collection(db, 'members'));
      if (!membersSnap.empty) {
        const batch = writeBatch(db);
        membersSnap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
          deletedMembersCount++;
        });
        await batch.commit();
      }

      // 2. Delete all flats
      const flatsSnap = await getDocs(collection(db, 'flats'));
      if (!flatsSnap.empty) {
        const batch = writeBatch(db);
        flatsSnap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
          deletedFlatsCount++;
        });
        await batch.commit();
      }

      await auditService.logAction(
        'DELETE',
        'SETTINGS',
        `CLEAR_MASTER_DATA: ${actorName} দ্বারা সকল ডিফল্ট ২৮টি ফ্ল্যাট ও ২৫টি সদস্য তথ্য পুরোপুরি মুছে ফেলা হয়েছে।`,
        'usr-admin',
        actorName,
        'master-clear',
        'ADMIN'
      );

      return { deletedMembersCount, deletedFlatsCount };
    } catch (error) {
      console.error('Error clearing master members and flats:', error);
      throw error;
    }
  },

  // CRITICAL FUNCTION: Clears EVERYTHING completely (All Members, All Flats, All Transactions, All Bills, All Receipts)
  clearAllDatabaseData: async (actorName: string = 'Admin'): Promise<{
    deletedMembersCount: number;
    deletedFlatsCount: number;
    deletedTransactionsCount: number;
  }> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('jct_master_cleared', 'true');
        localStorage.setItem('jct_demo_cleared', 'true');
      }
      
      const masterStatusRef = doc(db, 'settings', 'masterStatus');
      await setDoc(masterStatusRef, { isMasterCleared: true, clearedAt: new Date().toISOString() }, { merge: true });

      const demoStatusRef = doc(db, 'settings', 'demoStatus');
      await setDoc(demoStatusRef, { isDemoCleared: true, clearedAt: new Date().toISOString() }, { merge: true });

      let deletedMembersCount = 0;
      let deletedFlatsCount = 0;
      let deletedTransactionsCount = 0;

      const allCollections = [
        'members',
        'flats',
        'expenses',
        'monthlyBills',
        'payments',
        'receipts',
        'notices',
        'notifications',
        'smsLogs',
        'openingBalances'
      ];

      for (const colName of allCollections) {
        try {
          const snap = await getDocs(collection(db, colName));
          if (!snap.empty) {
            const batch = writeBatch(db);
            snap.docs.forEach((d) => {
              batch.delete(d.ref);
              if (colName === 'members') deletedMembersCount++;
              else if (colName === 'flats') deletedFlatsCount++;
              else deletedTransactionsCount++;
            });
            await batch.commit();
          }
        } catch (colErr) {
          console.warn(`Error deleting collection ${colName}:`, colErr);
        }
      }

      await auditService.logAction(
        'DELETE',
        'SETTINGS',
        `FACTORY_RESET_ALL: ${actorName} দ্বারা সমস্ত সদস্য, ফ্ল্যাট এবং ডেমো লেনদেন ডেটাবেজ থেকে মুছে সম্পূর্ণ খালি করা হয়েছে।`,
        'usr-admin',
        actorName,
        'factory-reset',
        'ADMIN'
      );

      return {
        deletedMembersCount,
        deletedFlatsCount,
        deletedTransactionsCount
      };
    } catch (error) {
      console.error('Error in clearAllDatabaseData:', error);
      throw error;
    }
  },

  // Seed Full Database (Master Flats & Members + All Demo Transactions)
  seedFullDatabase: async (): Promise<void> => {
    await demoDataService.seedMasterData();
    await demoDataService.seedDemoTransactions();
  },

  // Auto-initialize master data if database is fresh and master hasn't been cleared
  initializeDatabaseIfEmpty: async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true') {
        return;
      }
      const masterStatusDoc = await getDoc(doc(db, 'settings', 'masterStatus'));
      if (masterStatusDoc.exists() && masterStatusDoc.data()?.isMasterCleared === true) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('jct_master_cleared', 'true');
        }
        return;
      }
      const flatsSnap = await getDocs(collection(db, 'flats'));
      if (flatsSnap.empty) {
        console.log('Initializing master data in Firestore...');
        await demoDataService.seedMasterData();
      }
    } catch (error) {
      console.warn('Auto initialization check error (offline/rules):', error);
    }
  }
};
