import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Wallet, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit3, 
  Lock, 
  Unlock, 
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { cashSummaryService, CashBankBreakdown } from '../../services/cashSummaryService';
import { billService } from '../../services/billService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { MonthlyBill } from '../../types';

export const FinancialSummaryPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { isBangla } = useTranslation();
  const { billingPeriodId, monthNameBangla, selectedYear } = useBillingPeriod();
  const isBn = isBangla;

  const [breakdown, setBreakdown] = useState<CashBankBreakdown | null>(null);
  const [bill, setBill] = useState<MonthlyBill | null>(null);
  const [loading, setLoading] = useState(true);

  // Opening balance editor modal
  const [editingOpening, setEditingOpening] = useState(false);
  const [newOpeningAmount, setNewOpeningAmount] = useState<number>(50000);
  const [savingOpening, setSavingOpening] = useState(false);

  // Reopen period modal
  const [reopenModal, setReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const data = await cashSummaryService.getCashAndBankSummary(billingPeriodId);
      const b = await billService.getBillByPeriod(billingPeriodId);
      setBreakdown(data);
      setBill(b);
      setNewOpeningAmount(data.openingBalance);
    } catch (err) {
      console.error('Failed to load financial summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [billingPeriodId]);

  const handleSaveOpening = async () => {
    if (!userProfile) return;
    setSavingOpening(true);
    try {
      await cashSummaryService.setOpeningBalance(billingPeriodId, Number(newOpeningAmount), userProfile);
      setEditingOpening(false);
      await loadFinancialData();
    } catch (err: any) {
      alert(err.message || 'Opening balance update failed');
    } finally {
      setSavingOpening(false);
    }
  };

  const handleReopenPeriod = async () => {
    if (!userProfile) return;
    if (userProfile.role !== 'SUPER_ADMIN') {
      alert(isBn ? 'শুধুমাত্র সুপার অ্যাডমিন বন্ধ পিরিয়ড পুনঃউন্মুক্ত করতে পারবেন।' : 'Only SUPER_ADMIN can reopen closed periods.');
      return;
    }
    if (!reopenReason || reopenReason.trim().length < 3) {
      alert(isBn ? 'পুনঃউন্মুক্ত করার কারণ উল্লেখ করুন।' : 'Provide a reason for reopening.');
      return;
    }

    setReopening(true);
    try {
      await billService.reopenBillingPeriod(billingPeriodId, reopenReason, userProfile);
      setReopenModal(false);
      setReopenReason('');
      await loadFinancialData();
    } catch (err: any) {
      alert(err.message || 'Reopen failed');
    } finally {
      setReopening(false);
    }
  };

  const isClosed = bill?.status === 'CLOSED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isBn ? `আর্থিক সারসংক্ষেপ ও ক্যাশ মিলকরণ - ${monthNameBangla} ${selectedYear}` : `Financial Summary & Cash Reconciliation - ${billingPeriodId}`}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isBn ? 'প্রারম্ভিক জের, ক্যাশ-ব্যাংক কালেকশন ও খরচ বনাম সমাপনী ব্যালেন্সের নিখুঁত মিলকরণ' : 'Opening balance, Cash & Bank collections/expenses and closing balance verification'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isClosed ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                {isBn ? 'বন্ধ ঘোষিত পিরিয়ড (Closed)' : 'Closed Period'}
              </span>
              {userProfile?.role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => setReopenModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition flex items-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  {isBn ? 'পুনঃউন্মুক্ত করুন' : 'Reopen'}
                </button>
              )}
            </div>
          ) : (
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isBn ? 'সক্রিয় হিসাব পিরিয়ড' : 'Active Period'}
            </span>
          )}

          <button
            onClick={loadFinancialData}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition border border-slate-200 dark:border-slate-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Discrepancy Warnings Panel */}
      {breakdown && breakdown.mismatches.length > 0 && (
        <div className="space-y-3">
          {breakdown.mismatches.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                m.severity === 'ERROR'
                  ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-200'
                  : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${m.severity === 'ERROR' ? 'text-rose-600' : 'text-amber-600'}`} />
                <div>
                  <h3 className="font-bold text-sm">{m.title}</h3>
                  <p className="text-xs opacity-90 mt-0.5">{m.description}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono">
                    <span>প্রত্যাশিত: {m.expected}</span>
                    <span>বাস্তব: {m.actual}</span>
                    <span className="font-bold text-rose-700 dark:text-rose-300">ব্যবধান: {m.difference}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Financial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Opening Balance Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isBn ? 'প্রারম্ভিক জের (Opening)' : 'Opening Balance'}
              </span>
            </div>
            {userProfile?.role === 'SUPER_ADMIN' || userProfile?.role === 'ADMIN' ? (
              <button
                onClick={() => setEditingOpening(true)}
                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                title="Edit Opening Balance"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              ৳{(breakdown?.openingBalance || 0).toLocaleString('bn-BD')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isBn ? `${monthNameBangla} ১ তারিখের নগদ ও ব্যাংক জের` : `Balance at 1st of month`}
            </p>
          </div>
        </div>

        {/* Net Cash Flow Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 rounded-xl ${
              (breakdown?.netCashFlow || 0) >= 0 
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
            }`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isBn ? 'নিট ক্যাশ ফ্লো (Net Flow)' : 'Net Cash Flow'}
            </span>
          </div>

          <div>
            <div className={`text-2xl font-black font-mono ${
              (breakdown?.netCashFlow || 0) >= 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {(breakdown?.netCashFlow || 0) >= 0 ? '+' : ''}৳{(breakdown?.netCashFlow || 0).toLocaleString('bn-BD')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isBn ? 'মোট কালেকশন - মোট খরচ' : 'Total Collection - Total Expense'}
            </p>
          </div>
        </div>

        {/* Closing Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {isBn ? 'সমাপনী জের (Closing Balance)' : 'Closing Balance'}
            </span>
          </div>

          <div>
            <div className="text-3xl font-black font-mono text-amber-400">
              ৳{(breakdown?.closingBalance || 0).toLocaleString('bn-BD')}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isBn ? 'প্রারম্ভিক জের + নিট ক্যাশ ফ্লো' : 'Opening Balance + Net Cash Flow'}
            </p>
          </div>
        </div>
      </div>

      {/* Cash vs Bank Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              {isBn ? 'আদায় ও জমার মাধ্যমভিত্তিক বিভাজন' : 'Collection Breakdown'}
            </h2>
            <span className="text-xs font-bold text-emerald-600 font-mono">
              মোট: ৳{(breakdown?.totalCollection || 0).toLocaleString('bn-BD')}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-700 dark:text-slate-300">নগদ আদায় (Cash Collection)</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                ৳{(breakdown?.cashCollection || 0).toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-700 dark:text-slate-300">ব্যাংক জমার হিসাব (Bank Collection)</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                ৳{(breakdown?.bankCollection || 0).toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-700 dark:text-slate-300">বিকাশ / নগদ / অন্যান্য</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                ৳{(breakdown?.otherCollection || 0).toLocaleString('bn-BD')}
              </span>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-rose-500" />
              {isBn ? 'পরিশোধ ও খরচের মাধ্যমভিত্তিক বিভাজন' : 'Expense Breakdown'}
            </h2>
            <span className="text-xs font-bold text-rose-600 font-mono">
              মোট: ৳{(breakdown?.totalExpense || 0).toLocaleString('bn-BD')}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-700 dark:text-slate-300">নগদ খরচ (Cash Expenses)</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                ৳{(breakdown?.cashExpense || 0).toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-700 dark:text-slate-300">ব্যাংক ট্রান্সফার / চেক খরচ</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                ৳{(breakdown?.bankExpense || 0).toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-slate-700 dark:text-slate-300">মোবাইল ব্যাংকিং ও অন্যান্য খরচ</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                ৳{(breakdown?.otherExpense || 0).toLocaleString('bn-BD')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Opening Balance Modal */}
      {editingOpening && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isBn ? 'প্রারম্ভিক জের (Opening Balance) আপডেট' : 'Edit Opening Balance'}
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">
                {isBn ? `${monthNameBangla} ১ তারিখের শুরুর ব্যালেন্স (টাকা)` : 'Opening Balance Amount'}
              </label>
              <input
                type="number"
                value={newOpeningAmount}
                onChange={(e) => setNewOpeningAmount(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-lg font-bold"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingOpening(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveOpening}
                disabled={savingOpening}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                {savingOpening ? 'Saving...' : (isBn ? 'সংরক্ষণ' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Billing Period Modal */}
      {reopenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-amber-600 font-bold">
              <Unlock className="w-5 h-5" />
              <h3>{isBn ? 'বন্ধ পিরিয়ড পুনঃউন্মুক্তকরণের নিশ্চয়তা' : 'Reopen Closed Period'}</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {isBn ? `আপনি ${billingPeriodId} পিরিয়ড পুনঃউন্মুক্ত করতে যাচ্ছেন। পুনঃউন্মুক্তকরণের সঠিক কারণ উল্লেখ করুন (অডিট লগে সংরক্ষিত হবে)।` : 'State reason for reopening this billing period.'}
            </p>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder={isBn ? 'পুনঃউন্মুক্ত করার স্পষ্ট কারণ লিখুন...' : 'Type reason...'}
              rows={3}
              className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReopenModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleReopenPeriod}
                disabled={reopening || !reopenReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50"
              >
                {reopening ? 'Reopening...' : (isBn ? 'পুনঃউন্মুক্ত করুন' : 'Confirm Reopen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
