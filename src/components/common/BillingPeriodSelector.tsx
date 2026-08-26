import React from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Sparkles 
} from 'lucide-react';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';

interface BillingPeriodSelectorProps {
  className?: string;
  variant?: 'header' | 'compact' | 'card';
}

export const BillingPeriodSelector: React.FC<BillingPeriodSelectorProps> = ({
  className = '',
  variant = 'header'
}) => {
  const {
    selectedYear,
    selectedMonth,
    billingPeriodId,
    setBillingPeriod,
    goToCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    isCurrentMonth,
    availableYears,
    periodLabel,
    minYear,
    maxYear
  } = useBillingPeriod();

  const { t, formatNumber } = useTranslation();

  const isAtMin = selectedYear === minYear && selectedMonth === 1;
  const isAtMax = selectedYear === maxYear && selectedMonth === 12;

  if (variant === 'card') {
    return (
      <div className={`p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold">{t.period.selectPeriod}</p>
              <h3 className="text-base font-bold text-amber-300">{periodLabel}</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={goToPreviousMonth}
              disabled={isAtMin}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
              title={t.period.prevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setBillingPeriod(selectedYear, Number(e.target.value))}
              aria-label={t.period.month}
              className="bg-slate-800 border border-slate-700 text-slate-100 px-2.5 py-1 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            >
              {t.period.months.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setBillingPeriod(Number(e.target.value), selectedMonth)}
              aria-label={t.period.year}
              className="bg-slate-800 border border-slate-700 text-slate-100 px-2.5 py-1 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {formatNumber(yr)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={goToNextMonth}
              disabled={isAtMax}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
              title={t.period.nextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToCurrentMonth}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold border border-amber-500/30 transition-colors ml-1"
              >
                {t.period.currentMonth}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs ${className}`}>
      {/* Prev Month Button */}
      <button
        type="button"
        onClick={goToPreviousMonth}
        disabled={isAtMin}
        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 disabled:opacity-30 transition-colors"
        title={t.period.prevMonth}
        aria-label={t.period.prevMonth}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Month Dropdown */}
      <select
        value={selectedMonth}
        onChange={(e) => setBillingPeriod(selectedYear, Number(e.target.value))}
        aria-label={t.period.month}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold px-2 py-1 rounded-lg text-xs cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
      >
        {t.period.months.map((mName, idx) => (
          <option key={idx + 1} value={idx + 1}>
            {mName}
          </option>
        ))}
      </select>

      {/* Year Dropdown (2026 - 2035) */}
      <select
        value={selectedYear}
        onChange={(e) => setBillingPeriod(Number(e.target.value), selectedMonth)}
        aria-label={t.period.year}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold px-2 py-1 rounded-lg text-xs cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
      >
        {availableYears.map((yr) => (
          <option key={yr} value={yr}>
            {formatNumber(yr)}
          </option>
        ))}
      </select>

      {/* Next Month Button */}
      <button
        type="button"
        onClick={goToNextMonth}
        disabled={isAtMax}
        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 disabled:opacity-30 transition-colors"
        title={t.period.nextMonth}
        aria-label={t.period.nextMonth}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Quick "Current Month" Indicator / Button */}
      {isCurrentMonth ? (
        <span 
          className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-200"
          title="বর্তমানে চলমান মাস প্রদর্শিত হচ্ছে"
        >
          <Sparkles className="w-3 h-3 text-amber-600" />
          {t.period.currentMonth}
        </span>
      ) : (
        <button
          type="button"
          onClick={goToCurrentMonth}
          className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold shadow-xs transition-colors"
          title={t.period.currentMonth}
        >
          <Clock className="w-3 h-3" />
          {t.period.currentMonth}
        </button>
      )}
    </div>
  );
};
