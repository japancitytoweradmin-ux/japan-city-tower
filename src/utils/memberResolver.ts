import { UserProfile, Member, FlatUnit, PaymentRecord, ExpenseItem } from '../types';
import { calculateDualBilling, isKhalilurMember, DualBillingCalculation } from './billingCalculator';
import { sampleMembers, sampleUnits } from '../data/mockData';

export interface MemberBillSummary {
  activeMember: Member;
  memberFlats: FlatUnit[];
  totalUnits: number;
  totalBill: number;
  totalPaid: number;
  totalDue: number;
  perFlatBill: number;
  isKh: boolean;
  dualCalc: DualBillingCalculation;
}

/**
 * Normalizes string for comparisons (strips spaces, dashes, converts to uppercase)
 */
export const normalizeIdentifier = (val?: string): string => {
  if (!val) return '';
  return val.replace(/[^a border-zA-Z0-9]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

/**
 * Normalizes phone numbers to last 10 digits
 */
export const normalizePhone = (num?: string): string => {
  if (!num) return '';
  const digits = num.replace(/[^0-9]/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/**
 * Resolves the currently active member details safely from database list
 */
export const resolveActiveMember = (
  currentUser: UserProfile,
  membersList: Member[] = []
): Member => {
  const availableMembers = membersList.length > 0 ? membersList : sampleMembers;
  
  const currentMemberIdNorm = normalizeIdentifier(currentUser.memberId);
  const currentFlatsNorm = (currentUser.flatUnits || []).map(normalizeIdentifier);
  const currentPhoneNorm = normalizePhone(currentUser.phone);

  const matched = availableMembers.find((m) => {
    // 1. Member ID match
    const mIdNorm = normalizeIdentifier(m.memberId);
    if (currentMemberIdNorm && mIdNorm && (mIdNorm === currentMemberIdNorm || mIdNorm.endsWith(currentMemberIdNorm) || currentMemberIdNorm.endsWith(mIdNorm))) {
      return true;
    }
    // 2. Flat unit match
    if (currentFlatsNorm.length > 0) {
      const memberFlatsNorm = [
        ...(m.flatUnitNumbers || []),
        ...((m as any).unitNumber ? [(m as any).unitNumber] : [])
      ].map(normalizeIdentifier);
      if (memberFlatsNorm.some((f) => currentFlatsNorm.includes(f))) {
        return true;
      }
    }
    // 3. Phone match
    if (currentPhoneNorm && m.phone) {
      const mPhoneNorm = normalizePhone(m.phone);
      if (mPhoneNorm && (mPhoneNorm === currentPhoneNorm || mPhoneNorm.endsWith(currentPhoneNorm) || currentPhoneNorm.endsWith(mPhoneNorm))) {
        return true;
      }
    }
    // 4. Exact user id match
    if (m.id === currentUser.id || m.memberId === currentUser.id) {
      return true;
    }
    return false;
  });

  if (matched) return matched;

  // Ultimate fallback based directly on current logged in user (do NOT return arbitrary member[0])
  return {
    id: currentUser.id || 'usr-member-default',
    memberId: currentUser.memberId || 'JCT-001',
    name: currentUser.name || 'সদস্য',
    banglaName: currentUser.banglaName || currentUser.name || 'সদস্য',
    email: currentUser.email || 'info@japancitytower.com',
    phone: currentUser.phone || '',
    memberType: 'FLAT_OWNER',
    memberTypeBangla: 'ফ্ল্যাট মালিক',
    flatUnitNumbers: currentUser.flatUnits || ['2-A'],
    totalUnits: (currentUser.flatUnits || ['2-A']).length,
    status: 'ACTIVE'
  };
};

/**
 * Resolves owned flats for an active member, guaranteeing non-empty list for members with flats
 */
export const resolveMemberFlats = (
  activeMember: Member,
  currentUser: UserProfile,
  flatsList: FlatUnit[] = []
): FlatUnit[] => {
  const availableFlats = flatsList.length > 0 ? flatsList : sampleUnits;
  
  const memberUnitsNorm = [
    ...(activeMember.flatUnitNumbers || []),
    ...(currentUser.flatUnits || [])
  ].map(normalizeIdentifier);

  const activeMemberIdNorm = normalizeIdentifier(activeMember.memberId);
  const activePhoneNorm = normalizePhone(activeMember.phone || currentUser.phone);

  const matchedFlats = availableFlats.filter((f) => {
    const flatUnitNorm = normalizeIdentifier(f.unitNumber);
    if (memberUnitsNorm.includes(flatUnitNorm)) return true;
    if (activeMemberIdNorm && normalizeIdentifier(f.memberId) === activeMemberIdNorm) return true;
    if (activePhoneNorm && f.ownerPhone) {
      const flatPhoneNorm = normalizePhone(f.ownerPhone);
      if (flatPhoneNorm && (flatPhoneNorm === activePhoneNorm || flatPhoneNorm.endsWith(activePhoneNorm) || activePhoneNorm.endsWith(flatPhoneNorm))) {
        return true;
      }
    }
    return false;
  });

  if (matchedFlats.length > 0) return matchedFlats;

  // Fallback: Generate virtual flat objects based on activeMember.flatUnitNumbers or currentUser.flatUnits
  const fallbackUnits = activeMember.flatUnitNumbers?.length 
    ? activeMember.flatUnitNumbers 
    : (currentUser.flatUnits?.length ? currentUser.flatUnits : ['2-A']);

  return fallbackUnits.map((unitStr) => {
    const existingSample = availableFlats.find(u => normalizeIdentifier(u.unitNumber) === normalizeIdentifier(unitStr));
    if (existingSample) return existingSample;

    const floorMatch = unitStr.match(/^(\d+)/);
    const floorNum = floorMatch ? parseInt(floorMatch[1]) : 2;

    return {
      id: `flat-${unitStr}`,
      unitNumber: unitStr,
      floor: floorNum,
      unitType: 'Residential',
      ownerName: activeMember.name || currentUser.name || 'ফ্ল্যাট মালিক',
      ownerPhone: activeMember.phone || currentUser.phone || '',
      memberId: activeMember.memberId || currentUser.memberId || 'JCT-001',
      status: 'OCCUPIED_OWNER',
      monthlyBaseBill: 0,
      currentPaid: 0,
      currentDue: 0,
      paymentStatus: 'DUE'
    };
  });
};

/**
 * Computes exact bill, payment, and due summaries for a member
 */
export const calculateMemberBillSummary = (
  activeMember: Member,
  memberFlats: FlatUnit[],
  payments: PaymentRecord[],
  expenses: ExpenseItem[],
  totalBuildingFlats: number = 28,
  currentPeriodId?: string
): MemberBillSummary => {
  const isKh = isKhalilurMember(activeMember.memberId);
  const dualCalc = calculateDualBilling(expenses, (totalBuildingFlats !== undefined && totalBuildingFlats !== null) ? totalBuildingFlats : 28);
  
  const totalUnits = memberFlats.length || activeMember.flatUnitNumbers?.length || 1;
  const perFlatBill = isKh
    ? (dualCalc.totalExpense > 0 ? dualCalc.khalilur.perFlatBill : 0)
    : (dualCalc.totalExpense > 0 ? dualCalc.regularRoundedPerFlat : 0);

  let totalBill = 0;
  if (isKh) {
    totalBill = dualCalc.totalExpense > 0 ? dualCalc.khalilur.totalBill : 0;
  } else {
    if (dualCalc.totalExpense > 0) {
      totalBill = totalUnits * dualCalc.regularRoundedPerFlat;
    } else {
      totalBill = memberFlats.reduce((sum, f) => {
        const base = f.monthlyBaseBill && f.monthlyBaseBill > 0 && f.monthlyBaseBill !== 1997 ? f.monthlyBaseBill : 0;
        return sum + base;
      }, 0);
    }
  }

  const periodPayments = currentPeriodId 
    ? payments.filter(p => (p.billingPeriodId || p.month) === currentPeriodId)
    : payments;

  const totalPaid = periodPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalDue = Math.max(0, totalBill - totalPaid);

  return {
    activeMember,
    memberFlats,
    totalUnits,
    totalBill,
    totalPaid,
    totalDue,
    perFlatBill,
    isKh,
    dualCalc
  };
};
