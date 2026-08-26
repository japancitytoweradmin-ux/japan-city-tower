import { FlatUnit, Member, PaymentRecord, Notice, BuildingSettings } from '../types';
import { 
  sampleUnits, 
  sampleMembers, 
  samplePayments, 
  sampleNotices, 
  initialBuildingSettings 
} from '../data/mockData';

export const unitService = {
  getAllUnits: async (): Promise<FlatUnit[]> => {
    return sampleUnits;
  },
  getUnitByNumber: async (unitNumber: string): Promise<FlatUnit | undefined> => {
    return sampleUnits.find(u => u.unitNumber === unitNumber);
  },
  getUnitsByMemberId: async (memberId: string): Promise<FlatUnit[]> => {
    return sampleUnits.filter(u => u.memberId === memberId);
  }
};

export const memberService = {
  getAllMembers: async (): Promise<Member[]> => {
    return sampleMembers;
  },
  getMemberById: async (idOrMemberId: string): Promise<Member | undefined> => {
    return sampleMembers.find(m => m.id === idOrMemberId || m.memberId === idOrMemberId);
  }
};

export const paymentService = {
  getAllPayments: async (): Promise<PaymentRecord[]> => {
    return samplePayments;
  },
  getPaymentsByMemberId: async (memberId: string): Promise<PaymentRecord[]> => {
    return samplePayments.filter(p => p.memberId === memberId);
  },
  getPaymentsByUnit: async (unitNumber: string): Promise<PaymentRecord[]> => {
    return samplePayments.filter(p => p.flatUnitNumber === unitNumber);
  }
};

export const noticeService = {
  getAllNotices: async (): Promise<Notice[]> => {
    return sampleNotices;
  }
};

export const settingsService = {
  getSettings: async (): Promise<BuildingSettings> => {
    return initialBuildingSettings;
  },
  updateSettings: async (settings: Partial<BuildingSettings>): Promise<boolean> => {
    return true;
  }
};
