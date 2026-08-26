import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Printer, 
  Download, 
  Filter, 
  FileSpreadsheet, 
  TrendingUp, 
  CreditCard, 
  Coins, 
  Building2 
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { sampleExpensesJune2025, sampleUnits } from '../../data/mockData';
import { useToast } from '../../components/common/Toast';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { expenseService } from '../../services/expenseService';
import { flatService } from '../../services/flatService';
import { paymentService } from '../../services/paymentService';
import { ExpenseItem, FlatUnit, PaymentRecord } from '../../types';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const { billingPeriodId, periodLabel, selectedYear, selectedMonth } = useBillingPeriod();
  const { t, formatCurrency, formatNumber, isBangla } = useTranslation();

  const [reportType, setReportType] = useState<'INCOME_EXPENSE' | 'DUES_STATEMENT' | 'VOUCHER_AUDIT'>('INCOME_EXPENSE');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    const unsubExp = expenseService.subscribeToExpenses((loaded) => setExpenses(loaded), billingPeriodId);
    const unsubFlats = flatService.subscribeToFlats((loaded) => setFlats(loaded));
    const unsubPay = paymentService.subscribeToPayments((loaded) => setPayments(loaded), billingPeriodId);

    return () => {
      unsubExp();
      unsubFlats();
      unsubPay();
    };
  }, [billingPeriodId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    showToast(isBangla ? 'রিপোর্ট এক্সেল/CSV ফাইল হিসেবে প্রস্তুত হচ্ছে' : 'Generating Excel/CSV report', 'success');
  };

  const periodExpenses = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
  const totalExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const periodPayments = payments.filter(p => (p.billingPeriodId || p.month) === billingPeriodId);
  const totalCollected = periodPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalDues = Math.max(0, totalExpense - totalCollected);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.reports.title}
        subtitle={`${t.reports.subtitle} • ${periodLabel}`}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              {t.reports.exportExcel}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              {t.common.print}
            </button>
          </div>
        }
      />

      {/* Report Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReportType('INCOME_EXPENSE')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              reportType === 'INCOME_EXPENSE'
                ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {isBangla ? 'আয় ও ব্যয়ের বিবরণী' : 'Income & Expense Statement'} ({periodLabel})
          </button>

          <button
            type="button"
            onClick={() => setReportType('DUES_STATEMENT')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              reportType === 'DUES_STATEMENT'
                ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {isBangla ? 'বকেয়া তালিকা' : 'Dues Statement'}
          </button>

          <button
            type="button"
            onClick={() => setReportType('VOUCHER_AUDIT')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              reportType === 'VOUCHER_AUDIT'
                ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {isBangla ? 'ভাউচার অডিট রিপোর্ট' : 'Voucher Audit Report'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
            {t.period.billingPeriod}: {billingPeriodId}
          </span>
        </div>
      </div>

      {/* Report Content */}
      <div id="printable-report" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 space-y-6">
        {/* Report Official Letterhead */}
        <div className="text-center border-b pb-4 border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t.app.title}</h2>
          <p className="text-xs text-slate-500 font-sans">
            Japan City Tower – Flat Owners & Management Committee
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Plot 24/B, Ring Road, Shyamoli, Dhaka-1207
          </p>
          <div className="inline-block mt-3 px-4 py-1 bg-slate-900 dark:bg-amber-500 text-amber-300 dark:text-slate-950 text-xs font-bold rounded-full">
            {reportType === 'INCOME_EXPENSE'
              ? `${isBangla ? 'আয় ও ব্যয়ের বিবরণী' : 'Income & Expense Statement'} (${periodLabel})`
              : reportType === 'DUES_STATEMENT'
              ? `${isBangla ? 'বকেয়া তালিকা' : 'Dues Statement'} (${periodLabel})`
              : `${isBangla ? 'ভাউচার অডিট রিপোর্ট' : 'Voucher Audit Report'} (${periodLabel})`}
          </div>
        </div>

        {/* 3 Overview Figures */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-slate-500">{t.reports.totalCost}</span>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div>
            <span className="text-slate-500">{t.reports.totalRevenue}</span>
            <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
              {formatCurrency(totalCollected)}
            </p>
          </div>
          <div>
            <span className="text-slate-500">{isBangla ? 'মোট বকেয়া' : 'Total Dues'}</span>
            <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {formatCurrency(totalDues)}
            </p>
          </div>
        </div>

        {/* Dynamic Table based on Report Type */}
        {reportType === 'INCOME_EXPENSE' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.expenses.title} ({periodLabel})
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-3">{isBangla ? 'ক্রমিক' : 'SL'}</th>
                    <th className="p-3">{t.expenses.description}</th>
                    <th className="p-3">{t.expenses.voucher}</th>
                    <th className="p-3">{isBangla ? 'সংযুক্ত ভাউচার' : 'Attached Voucher'}</th>
                    <th className="p-3 text-right">{t.expenses.amount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periodExpenses.map((exp, idx) => (
                    <tr key={exp.id}>
                      <td className="p-3 font-mono text-slate-500">{formatNumber(idx + 1)}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{exp.title}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{exp.voucherNumber || '—'}</td>
                      <td className="p-3">
                        {exp.voucher ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">✓ {isBangla ? 'ভাউচার সংযুক্ত' : 'Voucher Attached'}</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-bold">⚠ {t.expenses.voucherMissing}</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(exp.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                    <td colSpan={4} className="p-3 text-right">{isBangla ? 'সর্বমোট খরচ:' : 'Total Expense:'}</td>
                    <td className="p-3 text-right text-base text-amber-600 dark:text-amber-400">{formatCurrency(totalExpense)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'DUES_STATEMENT' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isBangla ? 'বকেয়া তালিকা' : 'Dues Statement'}
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-3">{t.flats.unitNumber}</th>
                    <th className="p-3">{t.flats.owner}</th>
                    <th className="p-3">{t.flats.phone}</th>
                    <th className="p-3 text-right">{t.flats.monthlyBill}</th>
                    <th className="p-3 text-right">{t.flats.paid}</th>
                    <th className="p-3 text-right">{t.flats.due}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {flats.filter(u => u.currentDue > 0).map((unit) => (
                    <tr key={unit.id}>
                      <td className="p-3 font-bold font-mono text-slate-900 dark:text-white">{unit.unitNumber}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{unit.ownerName}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{unit.ownerPhone}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(unit.monthlyBaseBill)}</td>
                      <td className="p-3 text-right font-medium text-emerald-700 dark:text-emerald-400">{formatCurrency(unit.currentPaid)}</td>
                      <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">{formatCurrency(unit.currentDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'VOUCHER_AUDIT' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isBangla ? 'ভাউচার অডিট রিপোর্ট' : 'Voucher Audit Report'} ({periodLabel})
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-3">{isBangla ? 'ক্রমিক' : 'SL'}</th>
                    <th className="p-3">{t.expenses.description}</th>
                    <th className="p-3">{t.expenses.voucher}</th>
                    <th className="p-3">{t.expenses.paymentMethod}</th>
                    <th className="p-3 text-right">{t.expenses.amount}</th>
                    <th className="p-3 text-center">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periodExpenses.map((exp, idx) => (
                    <tr key={exp.id}>
                      <td className="p-3 font-mono text-slate-500">{formatNumber(idx + 1)}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{exp.title}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{exp.voucherNumber || '—'}</td>
                      <td className="p-3 font-mono text-slate-500">{exp.paymentMethod}</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(exp.amount)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          exp.voucher ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {exp.voucher ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signature Box */}
        <div className="grid grid-cols-2 gap-8 pt-10 text-xs text-center border-t border-slate-200 dark:border-slate-800">
          <div>
            <div className="w-40 border-b border-slate-400 dark:border-slate-600 mx-auto mb-1"></div>
            <p className="font-bold text-slate-800 dark:text-slate-200">{isBangla ? 'হিসাবরক্ষক / ম্যানেজার' : 'Accountant / Manager'}</p>
            <p className="text-[11px] text-slate-400">Japan City Tower</p>
          </div>

          <div>
            <div className="w-40 border-b border-slate-400 dark:border-slate-600 mx-auto mb-1"></div>
            <p className="font-bold text-slate-800 dark:text-slate-200">{isBangla ? 'সভাপতি / সাধারণ সম্পাদক' : 'President / General Secretary'}</p>
            <p className="text-[11px] text-slate-400">{isBangla ? 'ম্যানেজমেন্ট কমিটি' : 'Management Committee'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
