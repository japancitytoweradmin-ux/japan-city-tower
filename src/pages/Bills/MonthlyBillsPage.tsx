import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Send, 
  MessageSquare, 
  Printer, 
  Download, 
  CheckCircle2, 
  FileCheck, 
  Sparkles, 
  Calculator, 
  Building2,
  Calendar,
  Share2,
  Loader2,
  RefreshCw,
  Sliders,
  Info,
  Check,
  Lock
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { sampleUnits, sampleExpensesJune2025 } from '../../data/mockData';
import { useToast } from '../../components/common/Toast';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { billService } from '../../services/billService';
import { expenseService } from '../../services/expenseService';
import { flatService } from '../../services/flatService';
import { paymentService } from '../../services/paymentService';
import { MonthlyBill, FlatUnit, ExpenseItem, PaymentRecord } from '../../types';
import { calculateDualBilling, isKhalilurMember, KHALILUR_FLAT_UNITS } from '../../utils/billingCalculator';

export const MonthlyBillsPage: React.FC = () => {
  const { showToast } = useToast();
  const { billingPeriodId, periodLabel, selectedYear, selectedMonth } = useBillingPeriod();
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();

  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [monthlyBill, setMonthlyBill] = useState<MonthlyBill | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [customAdjustment, setCustomAdjustment] = useState<number>(0);
  const [activeCalculationTab, setActiveCalculationTab] = useState<'ALL' | 'GENERAL' | 'KHALILUR'>('ALL');

  useEffect(() => {
    const unsubFlats = flatService.subscribeToFlats((loaded) => setFlats(loaded));
    const unsubExp = expenseService.subscribeToExpenses((loaded) => setExpenses(loaded), billingPeriodId);
    const unsubPay = paymentService.subscribeToPayments((loaded) => setPayments(loaded), billingPeriodId);
    const unsubBills = billService.subscribeToBills((loaded) => {
      const match = loaded.find(b => (b.billingPeriodId || b.month) === billingPeriodId);
      setMonthlyBill(match || null);
      if (match?.customAdjustment !== undefined) {
        setCustomAdjustment(match.customAdjustment);
      } else {
        setCustomAdjustment(0);
      }
    }, billingPeriodId);

    return () => {
      unsubFlats();
      unsubExp();
      unsubPay();
      unsubBills();
    };
  }, [billingPeriodId]);

  // Compute calculated metrics using Dual Engine
  const totalUnits = flats.length || 28;
  const periodExpenses = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
  const effectiveExpenses = periodExpenses.length > 0 ? periodExpenses : (billingPeriodId === '2025-06' ? sampleExpensesJune2025 : []);
  
  const dualCalc = calculateDualBilling(effectiveExpenses, totalUnits);
  const totalExpense = dualCalc.totalExpense;
  
  // Regular flat amount
  const exactPerFlat = dualCalc.regularExactPerFlat;
  const roundedPerFlat = dualCalc.regularRoundedPerFlat;
  const finalRegularPerFlat = roundedPerFlat + customAdjustment;

  // Khalilur Rahman Special amount
  const khalilur = dualCalc.khalilur;
  const khalilurPerFlatAmount = khalilur.perFlatBill + customAdjustment;

  const currentStatus = monthlyBill?.status || (billingPeriodId === '2025-06' ? 'PUBLISHED' : 'DRAFT');

  const handleUpdateStatus = async (newStatus: 'DRAFT' | 'PUBLISHED' | 'CLOSED') => {
    setIsPublishing(true);
    try {
      await billService.upsertBill({
        id: `bill-${billingPeriodId}`,
        month: billingPeriodId,
        monthBangla: periodLabel,
        billingYear: selectedYear,
        billingMonth: selectedMonth,
        billingPeriodId: billingPeriodId,
        totalExpense: totalExpense,
        totalFlats: totalUnits,
        perFlatAmount: roundedPerFlat,
        customAdjustment: customAdjustment,
        finalPerFlatAmount: finalRegularPerFlat,
        status: newStatus,
        isApproved: newStatus === 'PUBLISHED' || newStatus === 'CLOSED',
        generatedDate: new Date().toISOString().split('T')[0],
        publishedDate: newStatus === 'PUBLISHED' ? new Date().toISOString().split('T')[0] : (monthlyBill?.publishedDate || ''),
        isMasterData: true,
        isDemo: false
      });
      showToast(`${periodLabel} ${isBangla ? 'বিলের স্ট্যাটাস পরিবর্তন হয়েছে:' : 'Bill status updated:'} ${newStatus}`, 'success');
    } catch (err: any) {
      showToast('Error updating status: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveAdjustment = async () => {
    setIsPublishing(true);
    try {
      await billService.upsertBill({
        id: `bill-${billingPeriodId}`,
        month: billingPeriodId,
        monthBangla: periodLabel,
        billingYear: selectedYear,
        billingMonth: selectedMonth,
        billingPeriodId: billingPeriodId,
        totalExpense: totalExpense,
        totalFlats: totalUnits,
        perFlatAmount: roundedPerFlat,
        customAdjustment: customAdjustment,
        finalPerFlatAmount: finalRegularPerFlat,
        status: currentStatus,
        isApproved: currentStatus !== 'DRAFT',
        generatedDate: new Date().toISOString().split('T')[0],
        isMasterData: true,
        isDemo: false
      });
      showToast(isBangla ? 'এডজাস্টমেন্ট সফলভাবে সংরক্ষিত হয়েছে' : 'Custom adjustment saved', 'success');
    } catch (err: any) {
      showToast('Error saving adjustment: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSendBulkSms = () => {
    showToast(isBangla 
      ? `সকল ${formatNumber(totalUnits)}টি ফ্ল্যাটের মালিককে ${periodLabel} মাসের বিলের SMS নোটিফিকেশন পাঠানো হয়েছে`
      : `SMS bill notification sent to all ${formatNumber(totalUnits)} flat owners for ${periodLabel}`, 'success');
  };

  const handleSendBulkWhatsApp = () => {
    showToast(isBangla
      ? `সকল সদস্যদের WhatsApp-এ ${periodLabel} মাসের বিল বিবরণী বার্তা পাঠানো হয়েছে`
      : `WhatsApp bill broadcast sent to all members for ${periodLabel}`, 'info');
  };

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title={t.bills.title}
        subtitle={t.bills.subtitle}
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSheet}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              {isBangla ? 'বিল বিবরণী প্রিন্ট' : 'Print Bill Sheet'}
            </button>

            {/* Bill Status Selector Actions */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => handleUpdateStatus('DRAFT')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  currentStatus === 'DRAFT'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>খসড়া (DRAFT)</span>
              </button>

              <button
                type="button"
                disabled={isPublishing}
                onClick={() => handleUpdateStatus('PUBLISHED')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  currentStatus === 'PUBLISHED'
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>প্রকাশিত (PUBLISHED)</span>
              </button>

              <button
                type="button"
                disabled={isPublishing}
                onClick={() => handleUpdateStatus('CLOSED')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  currentStatus === 'CLOSED'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>বন্ধ (CLOSED)</span>
              </button>
            </div>
          </div>
        }
      />

      {/* Month Formula Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                {t.period.billingPeriod}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {periodLabel}
              </h2>
              <StatusBadge status={currentStatus} size="md" />
              {monthlyBill?.isDemo && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bengali">
                  ডেমো বিল
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold font-mono">
              Period ID: {billingPeriodId}
            </span>
          </div>
        </div>

        {/* Dual Calculation Cards: General vs S.M. Khalilur Rahman */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
          {/* Card 1: General Flat Owners */}
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h3 className="text-sm font-bold text-white">
                  ১. সাধারণ ফ্ল্যাট মালিকদের হিসাব (মোট ২৮ টি ফ্ল্যাট)
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30">
                মোট খরচ ÷ ২৮
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">মাসিক মোট খরচ</span>
                <span className="text-lg font-black text-amber-400 mt-0.5 block">
                  {formatCurrency(totalExpense)}
                </span>
                <span className="text-[10px] text-slate-500">{formatNumber(effectiveExpenses.length)} টি খাতের বিল</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">মোট ফ্ল্যাট সংখ্যা</span>
                <span className="text-lg font-black text-white mt-0.5 block">
                  ২৮ টি
                </span>
                <span className="text-[10px] text-slate-500">ভাজক = ২৮</span>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/30 p-3 rounded-xl border border-amber-500/40">
                <span className="text-[11px] text-amber-300 font-bold block">প্রতি ফ্ল্যাটের বিল</span>
                <span className="text-lg font-black text-amber-300 mt-0.5 block">
                  {formatCurrency(finalRegularPerFlat)}
                </span>
                <span className="text-[10px] text-amber-200/70">
                  {formatCurrency(totalExpense)} ÷ ২৮
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span>গাণিতিক ভগ্নাংশ: <span className="font-mono text-amber-300 font-bold">৳{exactPerFlat.toFixed(2)}</span></span>
              <span>রাউন্ডিং: <span className="font-bold text-white">৳{roundedPerFlat}</span> {customAdjustment !== 0 && `(এডজাস্ট ৳${customAdjustment})`}</span>
            </div>
          </div>

          {/* Card 2: S. M. Khalilur Rahman Properties Special Formula */}
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-purple-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                <h3 className="text-sm font-bold text-white">
                  ২. খলিলুর রহমান প্রপার্টিস এর বিশেষ বিল (৩টি ফ্ল্যাট)
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-[11px] font-bold rounded-lg border border-purple-500/30">
                ফ্ল্যাট: 6-B, 7-B, 8-B
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">কমন খরচ (বিদ্যুৎ+লিফট+সিঁড়ি)</span>
                <span className="text-base font-bold text-purple-300 mt-0.5 block">
                  {formatCurrency(khalilur.sharedCommonExpense)}
                </span>
                <span className="text-[10px] text-slate-400">
                  (÷ ২৮) × ৩ = <span className="text-white font-bold">{formatCurrency(khalilur.flatsAmount)}</span>
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">দারোয়ানের বেতন শেয়ার</span>
                <span className="text-base font-bold text-purple-300 mt-0.5 block">
                  {formatCurrency(khalilur.guardSalary)}
                </span>
                <span className="text-[10px] text-slate-400">
                  (÷ ২৮) × ৫ = <span className="text-white font-bold">{formatCurrency(khalilur.guardAmount)}</span>
                </span>
              </div>

              <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/40 p-3 rounded-xl border border-purple-500/50">
                <span className="text-[11px] text-purple-200 font-bold block">খলিলুর প্রপার্টিস মোট</span>
                <span className="text-lg font-black text-white mt-0.5 block">
                  {formatCurrency(khalilur.totalBill + (customAdjustment * 3))}
                </span>
                <span className="text-[10px] text-purple-200/80">
                  প্রতি ফ্ল্যাটে {formatCurrency(khalilurPerFlatAmount)}
                </span>
              </div>
            </div>

            <div className="text-xs text-purple-200 bg-purple-950/40 p-3 rounded-xl border border-purple-900/60 font-mono flex items-center justify-between">
              <span>{formatCurrency(khalilur.flatsAmount)} (৩ ফ্ল্যাট) + {formatCurrency(khalilur.guardAmount)} (দারোয়ান ৫ গুণ)</span>
              <span className="font-bold text-amber-300">= {formatCurrency(khalilur.totalBill)}</span>
            </div>
          </div>
        </div>

        {/* Custom Adjustment Input Bar */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">কাস্টম এডজাস্টমেন্ট (Custom Adjustment Per Flat):</p>
              <p className="text-[11px] text-slate-400">মূল খরচের পরিবর্তন না করে প্রতি ফ্ল্যাটের বিলে ছাড় বা অতিরিক্ত ফি নির্ধারণ করুন</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="number"
              value={customAdjustment}
              onChange={(e) => setCustomAdjustment(parseFloat(e.target.value) || 0)}
              placeholder="যেমন: 100 বা -100"
              className="w-32 px-3 py-1.5 text-xs font-bold text-white bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleSaveAdjustment}
              disabled={isPublishing}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              সেভ করুন
            </button>
          </div>
        </div>

        {/* Bulk Messaging Broadcast Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isBangla ? 'সকল ফ্ল্যাট মালিককে বিল নোটিফিকেশন পাঠাতে নিচের বোতাম চাপুন:' : 'Send bill notifications to all owners in one click:'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendBulkSms}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {isBangla ? 'সকলকে SMS পাঠান' : 'Send Bulk SMS'}
            </button>
            <button
              type="button"
              onClick={handleSendBulkWhatsApp}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {isBangla ? 'সকলকে WhatsApp পাঠান' : 'Send Bulk WhatsApp'}
            </button>
          </div>
        </div>
      </div>

      {/* 28 Flats Bill Statement Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{periodLabel}: {isBangla ? 'ফ্ল্যাটভিত্তিক বিল বিবরণী' : 'Flat Statement'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {flats.length} Flats
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBangla 
                ? 'সাধারণ ফ্ল্যাটদের জন্য (মোট খরচ ÷ ২৮) এবং খলিলুর প্রপার্টিসের জন্য বিশেষ অনুমোদিত ফর্মুলা অনুযায়ী বিল'
                : 'Billed amounts calculated using general (Total / 28) and Khalilur Properties special formula'}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveCalculationTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeCalculationTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সকল ২৮টি ফ্ল্যাট
            </button>
            <button
              type="button"
              onClick={() => setActiveCalculationTab('GENERAL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeCalculationTab === 'GENERAL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সাধারণ ফ্ল্যাট (২৫টি)
            </button>
            <button
              type="button"
              onClick={() => setActiveCalculationTab('KHALILUR')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeCalculationTab === 'KHALILUR'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              খলিলুর প্রপার্টিস (৩টি)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">{isBangla ? 'ক্রমিক' : 'SL'}</th>
                <th className="p-3.5">{t.flats.unitNumber}</th>
                <th className="p-3.5">{t.flats.owner}</th>
                <th className="p-3.5">{t.members.memberId}</th>
                <th className="p-3.5 text-right">বিলের ক্যাটাগরি ও ফর্মুলা</th>
                <th className="p-3.5 text-right">{t.flats.monthlyBill}</th>
                <th className="p-3.5 text-right">এডজাস্টমেন্ট</th>
                <th className="p-3.5 text-right">মোট ধার্যকৃত বিল</th>
                <th className="p-3.5 text-right">{t.flats.paid}</th>
                <th className="p-3.5 text-right">{t.flats.due}</th>
                <th className="p-3.5 text-center">{t.common.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {flats
                .filter((unit) => {
                  const isKh = isKhalilurMember(unit.memberId, unit.unitNumber);
                  if (activeCalculationTab === 'GENERAL') return !isKh;
                  if (activeCalculationTab === 'KHALILUR') return isKh;
                  return true;
                })
                .map((unit, idx) => {
                  const isKh = isKhalilurMember(unit.memberId, unit.unitNumber);
                  const baseBill = isKh ? khalilur.perFlatBill : roundedPerFlat;
                  const finalBill = isKh ? khalilurPerFlatAmount : finalRegularPerFlat;

                  return (
                    <tr 
                      key={unit.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isKh ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
                      }`}
                    >
                      <td className="p-3.5 text-slate-400 font-mono">{formatNumber(idx + 1)}</td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-sm font-mono flex items-center gap-1.5">
                        <span>{unit.unitNumber}</span>
                        {isKh && (
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">
                            খলিলুর
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{unit.ownerName}</p>
                        <p className="text-[11px] text-slate-400">📞 {unit.ownerPhone}</p>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">{unit.memberId}</td>
                      <td className="p-3.5 text-right font-medium">
                        {isKh ? (
                          <span className="inline-block px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[11px] rounded font-semibold">
                            (কমন ÷ ২৮ × ৩) + (দারোয়ান ÷ ২৮ × ৫) ÷ ৩
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] rounded">
                            মোট খরচ ÷ ২৮
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-medium text-slate-800 dark:text-slate-200">
                        {formatCurrency(baseBill)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {customAdjustment >= 0 ? `+৳${customAdjustment}` : `-৳${Math.abs(customAdjustment)}`}
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">
                        {formatCurrency(finalBill)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(unit.currentPaid)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(unit.currentDue)}
                      </td>
                      <td className="p-3.5 text-center">
                        <StatusBadge status={unit.paymentStatus} size="sm" />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

