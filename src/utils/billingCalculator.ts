import { ExpenseItem } from '../types';

export interface KhalilurBillBreakdown {
  sharedCommonExpense: number; // বিদ্যুৎ + লিফট সার্ভিস + সিঁড়ি মুছা
  sharedPerUnit: number;       // sharedCommonExpense / 28
  flatsCount: number;          // 3
  flatsAmount: number;         // (sharedCommonExpense / 28) * 3
  guardSalary: number;         // দারোয়ানের বেতন
  guardPerUnit: number;        // guardSalary / 28
  guardMultiplier: number;     // 5
  guardAmount: number;         // (guardSalary / 28) * 5
  totalBill: number;           // flatsAmount + guardAmount
  perFlatBill: number;         // totalBill / 3
  details: {
    electricity: number;
    lift: number;
    stair: number;
    guard: number;
  };
}

export interface DualBillingCalculation {
  totalExpense: number;
  totalFlats: number;
  // Regular 25 units / 24 individual owners
  regularExactPerFlat: number;
  regularRoundedPerFlat: number;
  regularTotalBilled: number;
  // S.M. Khalilur Rahman Properties (JCT-006: 6-B, 7-B, 8-B)
  khalilur: KhalilurBillBreakdown;
}

export const KHALILUR_MEMBER_ID = 'JCT-006';
export const KHALILUR_FLAT_UNITS = ['6-B', '7-B', '8-B'];

export const isKhalilurMember = (memberId?: string, unitNumber?: string): boolean => {
  if (memberId && (memberId === KHALILUR_MEMBER_ID || memberId.includes('006') || memberId.toLowerCase().includes('khalilur'))) {
    return true;
  }
  if (unitNumber && KHALILUR_FLAT_UNITS.includes(unitNumber.toUpperCase())) {
    return true;
  }
  return false;
};

export const calculateDualBilling = (
  expenses: ExpenseItem[],
  totalFlats: number = 28
): DualBillingCalculation => {
  const totalUnits = totalFlats || 28;
  const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // 1. Regular Flat Calculation
  const regularExactPerFlat = totalUnits > 0 ? totalExpense / totalUnits : 0;
  const regularRoundedPerFlat = Math.round(regularExactPerFlat);
  const regularTotalBilled = regularRoundedPerFlat * totalUnits;

  // 2. Khalilur Rahman Special Calculation
  let electricity = 0;
  let lift = 0;
  let stair = 0;
  let guard = 0;

  expenses.forEach((exp) => {
    const title = (exp.title || '').toLowerCase();
    const cat = exp.category;

    if (cat === 'ELECTRICITY' || title.includes('বিদ্যুৎ') || title.includes('electric')) {
      electricity += exp.amount;
    } else if (cat === 'LIFT_SERVICE' || title.includes('লিফট') || title.includes('lift')) {
      lift += exp.amount;
    } else if (cat === 'STAIR_CLEANING' || title.includes('সিঁড়ি') || title.includes('stair')) {
      stair += exp.amount;
    } else if (cat === 'GUARD_SALARY' || title.includes('দারোয়ান') || title.includes('guard') || title.includes('বেতন') || title.includes('salary')) {
      guard += exp.amount;
    }
  });

  const sharedCommonExpense = electricity + lift + stair;
  const sharedPerUnit = totalUnits > 0 ? sharedCommonExpense / totalUnits : 0;
  const flatsAmount = Math.round(sharedPerUnit * 3);

  const guardSalary = guard;
  const guardPerUnit = totalUnits > 0 ? guardSalary / totalUnits : 0;
  const guardAmount = Math.round(guardPerUnit * 5);

  const totalKhalilurBill = flatsAmount + guardAmount;
  const perFlatBill = Math.round(totalKhalilurBill / 3);

  return {
    totalExpense,
    totalFlats: totalUnits,
    regularExactPerFlat,
    regularRoundedPerFlat,
    regularTotalBilled,
    khalilur: {
      sharedCommonExpense,
      sharedPerUnit,
      flatsCount: 3,
      flatsAmount,
      guardSalary,
      guardPerUnit,
      guardMultiplier: 5,
      guardAmount,
      totalBill: totalKhalilurBill,
      perFlatBill,
      details: {
        electricity,
        lift,
        stair,
        guard
      }
    }
  };
};
