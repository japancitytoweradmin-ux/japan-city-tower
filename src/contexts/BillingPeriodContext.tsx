import React, { createContext, useContext, useState, useMemo } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

export interface BillingPeriod {
  year: number; // 2026 - 2035
  month: number; // 1 - 12
  periodId: string; // "YYYY-MM", e.g. "2026-08"
}

export interface BillingPeriodContextValue {
  selectedYear: number;
  selectedMonth: number;
  billingPeriodId: string;
  activeYear?: number;
  activeMonth?: number;
  currentPeriod?: string;
  setBillingPeriod: (year: number, month: number) => void;
  goToCurrentMonth: () => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  isCurrentMonth: boolean;
  availableYears: number[];
  periodLabel: string;
  monthName: string;
  monthNameBangla: string;
  minYear: number;
  maxYear: number;
}

const BillingPeriodContext = createContext<BillingPeriodContextValue | null>(null);

const MIN_YEAR = 2026;
const MAX_YEAR = 2035;
const AVAILABLE_YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

// Helper to format 1-12 to "01"-"12"
export const formatMonthTwoDigits = (month: number): string => {
  return month < 10 ? `0${month}` : `${month}`;
};

export const getBillingPeriodId = (year: number, month: number): string => {
  return `${year}-${formatMonthTwoDigits(month)}`;
};

export const parseBillingPeriodId = (periodId?: string): { year: number; month: number } => {
  if (!periodId || typeof periodId !== 'string') {
    const now = new Date();
    return {
      year: Math.min(Math.max(now.getFullYear(), MIN_YEAR), MAX_YEAR),
      month: now.getMonth() + 1
    };
  }
  const parts = periodId.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return {
    year: isNaN(y) ? MIN_YEAR : Math.min(Math.max(y, MIN_YEAR), MAX_YEAR),
    month: isNaN(m) ? 1 : Math.max(1, Math.min(12, m))
  };
};

export const BillingPeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getMonthName, t, formatNumber } = useTranslation();

  // Determine current real-world date
  const now = new Date();
  const currentRealYear = Math.min(Math.max(now.getFullYear(), MIN_YEAR), MAX_YEAR);
  const currentRealMonth = now.getMonth() + 1;

  // Initialize with current real month (August 2026)
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentRealMonth);

  const billingPeriodId = useMemo(
    () => getBillingPeriodId(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const isCurrentMonth = useMemo(
    () => selectedYear === currentRealYear && selectedMonth === currentRealMonth,
    [selectedYear, selectedMonth, currentRealYear, currentRealMonth]
  );

  const setBillingPeriod = (year: number, month: number) => {
    const clampedYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
    const clampedMonth = Math.max(1, Math.min(12, month));
    setSelectedYear(clampedYear);
    setSelectedMonth(clampedMonth);
  };

  const goToCurrentMonth = () => {
    setSelectedYear(currentRealYear);
    setSelectedMonth(currentRealMonth);
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      if (selectedYear > MIN_YEAR) {
        setSelectedYear(selectedYear - 1);
        setSelectedMonth(12);
      }
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      if (selectedYear < MAX_YEAR) {
        setSelectedYear(selectedYear + 1);
        setSelectedMonth(1);
      }
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const monthName = useMemo(
    () => getMonthName(selectedMonth),
    [selectedMonth, getMonthName]
  );

  const periodLabel = useMemo(
    () => getMonthName(selectedMonth, selectedYear),
    [selectedMonth, selectedYear, getMonthName]
  );

  const value: BillingPeriodContextValue = {
    selectedYear,
    selectedMonth,
    billingPeriodId,
    activeYear: selectedYear,
    activeMonth: selectedMonth,
    currentPeriod: billingPeriodId,
    setBillingPeriod,
    goToCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    isCurrentMonth,
    availableYears: AVAILABLE_YEARS,
    periodLabel,
    monthName,
    monthNameBangla: monthName,
    minYear: MIN_YEAR,
    maxYear: MAX_YEAR
  };

  return (
    <BillingPeriodContext.Provider value={value}>
      {children}
    </BillingPeriodContext.Provider>
  );
};

const banglaMonthsFallback = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const fallbackBillingValue: BillingPeriodContextValue = {
  selectedYear: 2026,
  selectedMonth: 8,
  billingPeriodId: '2026-08',
  activeYear: 2026,
  activeMonth: 8,
  currentPeriod: '2026-08',
  setBillingPeriod: () => {},
  goToCurrentMonth: () => {},
  goToPreviousMonth: () => {},
  goToNextMonth: () => {},
  isCurrentMonth: true,
  availableYears: AVAILABLE_YEARS,
  periodLabel: 'আগস্ট ২০২৬',
  monthName: 'আগস্ট',
  monthNameBangla: 'আগস্ট',
  minYear: MIN_YEAR,
  maxYear: MAX_YEAR
};

export const useBillingPeriod = () => {
  const context = useContext(BillingPeriodContext);
  if (!context) {
    console.warn('useBillingPeriod was called outside BillingPeriodProvider; using safe fallback context');
    return fallbackBillingValue;
  }
  return context;
};
