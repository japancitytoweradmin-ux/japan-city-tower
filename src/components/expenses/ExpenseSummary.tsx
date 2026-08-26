import React from 'react';
import { 
  Building2, 
  Coins, 
  Users, 
  AlertTriangle, 
  Receipt, 
  CheckCircle2,
  FileCheck2,
  PieChart
} from 'lucide-react';
import { ExpenseItem, MonthlyExpenseSummary } from '../../types';
import { formatTaka, toBanglaNumber } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface CategoryBreakdown {
  categoryName: string;
  amount: number;
}

interface ExpenseSummaryProps {
  summary?: MonthlyExpenseSummary;
  month?: string;
  monthNameBangla?: string;
  totalAmount?: number;
  totalItems?: number;
  withVouchersCount?: number;
  missingVouchersCount?: number;
  categoryBreakdown?: CategoryBreakdown[];
  expensesList?: ExpenseItem[];
  onUploadMissingVoucher?: () => void;
  onFilterMissingVouchers?: () => void;
  isMissingVoucherFilterActive?: boolean;
}

export const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({
  summary,
  month = '2026-08',
  monthNameBangla = 'আগস্ট ২০২৬',
  totalAmount = 0,
  totalItems = 0,
  withVouchersCount = 0,
  missingVouchersCount = 0,
  categoryBreakdown,
  expensesList,
  onUploadMissingVoucher,
  onFilterMissingVouchers,
  isMissingVoucherFilterActive,
}) => {
  const displayMonthName = summary?.monthNameBangla || monthNameBangla;
  const displayTotal = summary?.totalExpense ?? totalAmount;
  const displayItemsCount = summary?.expenseCount ?? totalItems;
  const displayMissingCount = summary?.missingVouchersCount ?? missingVouchersCount;
  const displayFlats = summary?.totalFlats ?? 28;
  const displayPerFlat = summary?.finalPerFlatAmount ?? Math.round(displayTotal / displayFlats);

  // Compute category breakdown from expensesList if provided
  let breakdown: CategoryBreakdown[] = categoryBreakdown || [];
  if (breakdown.length === 0 && expensesList && expensesList.length > 0) {
    const map = new Map<string, number>();
    expensesList.forEach((e) => {
      const catName = e.categoryNameBangla || e.title || 'অন্যান্য';
      map.set(catName, (map.get(catName) || 0) + e.amount);
    });
    breakdown = Array.from(map.entries()).map(([categoryName, amount]) => ({
      categoryName,
      amount,
    }));
  }

  const handleMissingClick = () => {
    if (onFilterMissingVouchers) onFilterMissingVouchers();
    else if (onUploadMissingVoucher) onUploadMissingVoucher();
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 font-bengali space-y-6">
      {/* Top Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {displayMonthName} মাসের মোট কমন খরচ
              </h2>
              {summary && <StatusBadge status={summary.billStatus || summary.status} />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              মোট {toBanglaNumber(displayItemsCount)} টি খাত ভিত্তিক খরচ অন্তর্ভুক্ত
            </p>
          </div>
        </div>

        {/* Missing Voucher Warning Button */}
        {displayMissingCount > 0 ? (
          <button
            type="button"
            onClick={handleMissingClick}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              isMissingVoucherFilterActive
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ভাউচার ছাড়া খরচ: {toBanglaNumber(displayMissingCount)}টি</span>
            <span className="text-[10px] underline opacity-90">
              {isMissingVoucherFilterActive ? 'সব দেখুন' : 'ফিল্টার করুন'}
            </span>
          </button>
        ) : (
          <div className="px-3.5 py-2 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4" />
            <span>সকল খরচের ভাউচার সংযুক্ত আছে</span>
          </div>
        )}
      </div>

      {/* Stats Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Expense */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">এই মাসের মোট খরচ</p>
            <p className="text-2xl font-extrabold text-amber-400 tracking-tight mt-1">
              {formatTaka(displayTotal)}
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total Flats */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">মোট ফ্ল্যাট / ইউনিট সংখ্যা</p>
            <p className="text-2xl font-extrabold text-sky-400 tracking-tight mt-1">
              {toBanglaNumber(displayFlats)} টি
            </p>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Per Flat Amount Calculation */}
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-200 font-medium">প্রতি ফ্ল্যাট কমন সার্ভিস বিল</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">
                {formatTaka(displayPerFlat)}
              </span>
              <span className="text-[11px] text-amber-300/80">/ ফ্ল্যাট</span>
            </div>
          </div>
          <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Category Breakdown Chips Grid */}
      {breakdown.length > 0 && (
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
            <PieChart className="w-4 h-4 text-amber-400" />
            <span>খাত ভিত্তিক খরচের হিসাব (Category Breakdown):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs flex items-center gap-2"
              >
                <span className="text-slate-300 font-medium">{item.categoryName}:</span>
                <span className="font-bold text-amber-400">{formatTaka(item.amount)}</span>
              </div>
            ))}
            <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs font-bold text-white flex items-center gap-1.5">
              <span>মোট খরচ:</span>
              <span className="text-amber-300">{formatTaka(displayTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

