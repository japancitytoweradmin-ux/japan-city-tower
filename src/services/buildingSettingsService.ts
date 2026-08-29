import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  BuildingInfoSettings, 
  SystemBillingSettings, 
  ReceiptConfigSettings, 
  OfficeConfigSettings 
} from '../types';
import { auditService } from './auditService';

export const DEFAULT_BUILDING_INFO: BuildingInfoSettings = {
  buildingNameBangla: 'জাপান সিটি টাওয়ার',
  buildingNameEnglish: 'Japan City Tower',
  addressBangla: 'প্লট নং ২৪/বি, রিং রোড, শ্যামলী, ঢাকা-১২০৭',
  addressEnglish: 'Plot # 24/B, Ring Road, Shyamoli, Dhaka-1207',
  buildingCode: 'JCT-01',
  totalFloors: 9,
  totalFlats: 28,
  managementOfficeMobile: '+880 1711-000000',
  managementOfficeEmail: 'info@japancitytower.com',
  emergencyContact: '+880 1800-000000',
  logoUrl: ''
};

export const DEFAULT_SYSTEM_BILLING: SystemBillingSettings = {
  startYear: 2026,
  endYear: 2035,
  defaultMonthlyBill: 1997,
  billDueDate: 10,
  currency: '৳',
  roundingMethod: 'NEAREST_INTEGER'
};

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfigSettings = {
  receiptPrefix: 'JCT-',
  receiptFormat: 'JCT-YYYY-XXXXXX',
  startingNumber: 1001,
  receiptHeader: 'জাপান সিটি টাওয়ার – সাধারণ বিল মানি রসিদ',
  footerText: 'ধন্যবাদান্তে, জাপান সিটি টাওয়ার ফ্ল্যাট মালিক ব্যবস্থাপনা সমিতি।'
};

export const DEFAULT_OFFICE_CONFIG: OfficeConfigSettings = {
  officeName: 'জাপান সিটি টাওয়ার ফ্ল্যাট মালিক সমিতি কার্যালয়',
  phone: '+880 2-9110000',
  mobile: '+880 1711-000000',
  email: 'info@japancitytower.com',
  address: 'গ্রাউন্ড ফ্লোর, প্লট ২৪/বি, রিং রোড, শ্যামলী, ঢাকা-১২০৭',
  officeHours: 'সকাল ৯:০০ - রাত ৮:০০ (প্রতিদিন)',
  emergencyContact: '+880 1800-000000'
};

export const buildingSettingsService = {
  // 1. Building Info
  getBuildingInfo: async (): Promise<BuildingInfoSettings> => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'building_info'));
      if (snap.exists()) {
        return { ...DEFAULT_BUILDING_INFO, ...snap.data() } as BuildingInfoSettings;
      }
      return DEFAULT_BUILDING_INFO;
    } catch {
      return DEFAULT_BUILDING_INFO;
    }
  },

  subscribeToBuildingInfo: (callback: (info: BuildingInfoSettings) => void) => {
    try {
      return onSnapshot(
        doc(db, 'settings', 'building_info'),
        (snap) => {
          if (snap.exists()) {
            callback({ ...DEFAULT_BUILDING_INFO, ...snap.data() } as BuildingInfoSettings);
          } else {
            callback(DEFAULT_BUILDING_INFO);
          }
        },
        (error) => {
          console.warn('Building info subscription error:', error);
          callback(DEFAULT_BUILDING_INFO);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to building info:', error);
      callback(DEFAULT_BUILDING_INFO);
      return () => {};
    }
  },

  updateBuildingInfo: async (
    updates: Partial<BuildingInfoSettings>,
    userId = 'usr-admin',
    userName = 'Admin'
  ): Promise<BuildingInfoSettings> => {
    const current = await buildingSettingsService.getBuildingInfo();
    const merged = { ...current, ...updates };
    await setDoc(doc(db, 'settings', 'building_info'), merged, { merge: true });
    await auditService.logAction(
      'UPDATE',
      'SETTINGS',
      'বিল্ডিং সাধারণ তথ্য ও লোগো আপডেট করা হয়েছে',
      userId,
      userName,
      'settings-building-info',
      'ADMIN',
      undefined,
      current,
      merged
    );
    return merged;
  },

  // 2. Billing Settings
  getSystemBilling: async (): Promise<SystemBillingSettings> => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'billing_config'));
      if (snap.exists()) {
        return { ...DEFAULT_SYSTEM_BILLING, ...snap.data() } as SystemBillingSettings;
      }
      return DEFAULT_SYSTEM_BILLING;
    } catch {
      return DEFAULT_SYSTEM_BILLING;
    }
  },

  updateSystemBilling: async (
    updates: Partial<SystemBillingSettings>,
    userId = 'usr-admin',
    userName = 'Admin'
  ): Promise<SystemBillingSettings> => {
    const current = await buildingSettingsService.getSystemBilling();
    const merged = { ...current, ...updates };
    await setDoc(doc(db, 'settings', 'billing_config'), merged, { merge: true });
    await auditService.logAction(
      'UPDATE',
      'SETTINGS',
      'সিস্টেম বিলিং সেটিংস (২০২৬-২০৩৫ বছর ও ডিফল্ট বিল) পরিবর্তন করা হয়েছে',
      userId,
      userName,
      'settings-billing',
      'ADMIN',
      undefined,
      current,
      merged
    );
    return merged;
  },

  // 3. Receipt Settings
  getReceiptConfig: async (): Promise<ReceiptConfigSettings> => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'receipt_config'));
      if (snap.exists()) {
        return { ...DEFAULT_RECEIPT_CONFIG, ...snap.data() } as ReceiptConfigSettings;
      }
      return DEFAULT_RECEIPT_CONFIG;
    } catch {
      return DEFAULT_RECEIPT_CONFIG;
    }
  },

  updateReceiptConfig: async (
    updates: Partial<ReceiptConfigSettings>,
    userId = 'usr-admin',
    userName = 'Admin'
  ): Promise<ReceiptConfigSettings> => {
    const current = await buildingSettingsService.getReceiptConfig();
    const merged = { ...current, ...updates };
    await setDoc(doc(db, 'settings', 'receipt_config'), merged, { merge: true });
    await auditService.logAction(
      'UPDATE',
      'SETTINGS',
      'মানি রসিদ ফরম্যাট ও হেডার-ফুটার সেটিংস আপডেট করা হয়েছে',
      userId,
      userName,
      'settings-receipt',
      'ADMIN',
      undefined,
      current,
      merged
    );
    return merged;
  },

  // 4. Office Settings
  getOfficeConfig: async (): Promise<OfficeConfigSettings> => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'office_config'));
      if (snap.exists()) {
        return { ...DEFAULT_OFFICE_CONFIG, ...snap.data() } as OfficeConfigSettings;
      }
      return DEFAULT_OFFICE_CONFIG;
    } catch {
      return DEFAULT_OFFICE_CONFIG;
    }
  },

  updateOfficeConfig: async (
    updates: Partial<OfficeConfigSettings>,
    userId = 'usr-admin',
    userName = 'Admin'
  ): Promise<OfficeConfigSettings> => {
    const current = await buildingSettingsService.getOfficeConfig();
    const merged = { ...current, ...updates };
    await setDoc(doc(db, 'settings', 'office_config'), merged, { merge: true });
    await auditService.logAction(
      'UPDATE',
      'SETTINGS',
      'ব্যবস্থাপনা অফিস তথ্য ও জরুরি নম্বর আপডেট করা হয়েছে',
      userId,
      userName,
      'settings-office',
      'ADMIN',
      undefined,
      current,
      merged
    );
    return merged;
  }
};
