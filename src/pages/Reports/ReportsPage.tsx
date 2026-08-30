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
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { sampleExpensesJune2025, sampleUnits } from '../../data/mockData';
import { useToast } from '../../components/common/Toast';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { expenseService } from '../../services/expenseService';
import { flatService } from '../../services/flatService';
import { paymentService } from '../../services/paymentService';
import { buildingSettingsService, DEFAULT_BUILDING_INFO } from '../../services/buildingSettingsService';
import { ExpenseItem, FlatUnit, PaymentRecord, BuildingInfoSettings } from '../../types';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const { billingPeriodId, periodLabel, selectedYear, selectedMonth, monthNameBangla } = useBillingPeriod();
  const { t, formatCurrency, formatNumber, isBangla } = useTranslation();

  const [reportType, setReportType] = useState<'INCOME_EXPENSE' | 'DUES_STATEMENT' | 'VOUCHER_AUDIT'>('INCOME_EXPENSE');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfoSettings>(DEFAULT_BUILDING_INFO);

  useEffect(() => {
    const unsubExp = expenseService.subscribeToExpenses((loaded) => setExpenses(loaded), billingPeriodId);
    const unsubFlats = flatService.subscribeToFlats((loaded) => setFlats(loaded));
    const unsubPay = paymentService.subscribeToPayments((loaded) => setPayments(loaded), billingPeriodId);
    const unsubBuilding = buildingSettingsService.subscribeToBuildingInfo((info) => setBuildingInfo(info));

    return () => {
      unsubExp();
      unsubFlats();
      unsubPay();
      unsubBuilding();
    };
  }, [billingPeriodId]);

  const handlePrint = () => {
    window.print();
  };

  const periodExpenses = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
  const totalExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const periodPayments = payments.filter(p => (p.billingPeriodId || p.month) === billingPeriodId);
  const totalCollected = periodPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalDues = Math.max(0, totalExpense - totalCollected);

  const handleExportCsv = () => {
    try {
      let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Bengali character compatibility
      const buildingName = buildingInfo.buildingNameBangla || 'জাপান সিটি টাওয়ার';
      
      if (reportType === 'INCOME_EXPENSE') {
        csvContent += `"${buildingName}"\n`;
        csvContent += `"আয় ও ব্যয়ের বিবরণী (${periodLabel})"\n`;
        csvContent += `"মোট খরচ:","${totalExpense}","মোট আদায়:","${totalCollected}","মোট বকেয়া:","${totalDues}"\n\n`;
        csvContent += `"ক্রমিক","বিবরণ","ভাউচার / ক্যাশ মেমো","ভাউচার স্ট্যাটাস","টাকার পরিমাণ (৳)"\n`;
        
        periodExpenses.forEach((exp, idx) => {
          const vStatus = exp.voucher ? 'ভাউচার সংযুক্ত' : 'ভাউচার মিসিং';
          csvContent += `"${idx + 1}","${exp.title}","${exp.voucherNumber || '—'}","${vStatus}","${exp.amount}"\n`;
        });
        csvContent += `"","সর্বমোট খরচ","","","${totalExpense}"\n`;
      } else if (reportType === 'DUES_STATEMENT') {
        csvContent += `"${buildingName}"\n`;
        csvContent += `"বকেয়া ও আদায় বিবরণী (${periodLabel})"\n\n`;
        csvContent += `"ফ্ল্যাট নং","মালিকের নাম","মোবাইল","মাসিক বিল","পরিশোধিত","বকেয়া"\n`;
        
        flats.forEach((unit) => {
          csvContent += `"${unit.unitNumber}","${unit.ownerName}","${unit.ownerPhone}","${unit.monthlyBaseBill}","${unit.currentPaid}","${unit.currentDue}"\n`;
        });
      } else {
        csvContent += `"${buildingName}"\n`;
        csvContent += `"ভাউচার অডিট রিপোর্ট (${periodLabel})"\n\n`;
        csvContent += `"ক্রমিক","বিবরণ","ভাউচার নং","পেমেন্ট মাধ্যম","টাকার পরিমাণ (৳)","অডিট স্ট্যাটাস"\n`;
        
        periodExpenses.forEach((exp, idx) => {
          csvContent += `"${idx + 1}","${exp.title}","${exp.voucherNumber || '—'}","${exp.paymentMethod}","${exp.amount}","${exp.voucher ? 'VERIFIED' : 'PENDING'}"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${buildingInfo.buildingCode || 'JCT'}_Report_${billingPeriodId}_${reportType}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(isBangla ? 'রিপোর্ট সফলভাবে এক্সেল/CSV ফাইল হিসেবে ডাউনলোড হয়েছে' : 'Report exported successfully as CSV', 'success');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      showToast(isBangla ? 'এক্সপোর্ট ব্যর্থ হয়েছে' : 'Export failed', 'error');
    }
  };

  const buildingAddress = isBangla
    ? (buildingInfo.addressBangla || buildingInfo.addressEnglish || 'প্লট নং ২৪/বি, রিং রোড, শ্যামলী, ঢাকা-১২০৭')
    : (buildingInfo.addressEnglish || buildingInfo.addressBangla || 'Plot # 24/B, Ring Road, Shyamoli, Dhaka-1207');

  const buildingTitle = isBangla
    ? (buildingInfo.buildingNameBangla || 'জাপান সিটি টাওয়ার')
    : (buildingInfo.buildingNameEnglish || 'Japan City Tower');

  const committeeSubTitle = `${buildingInfo.buildingNameEnglish || 'Japan City Tower'} – Flat Owners & Management Committee`;

  const reportPillTitle = reportType === 'INCOME_EXPENSE'
    ? `${isBangla ? 'আয় ও ব্যয়ের বিবরণী' : 'Income & Expense Statement'} (${periodLabel})`
    : reportType === 'DUES_STATEMENT'
    ? `${isBangla ? 'বকেয়া তালিকা' : 'Dues Statement'} (${periodLabel})`
    : `${isBangla ? 'ভাউচার অডিট রিপোর্ট' : 'Voucher Audit Report'} (${periodLabel})`;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions - Hidden in Print */}
      <div className="no-print print:hidden">
        <PageHeader
          title={t.reports.title}
          subtitle={`${t.reports.subtitle} • ${periodLabel}`}
          actionButton={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{t.reports.exportExcel}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                <span>{t.common.print}</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Report Filter Tabs - Hidden in Print */}
      <div className="no-print print:hidden bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReportType('INCOME_EXPENSE')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              reportType === 'INCOME_EXPENSE'
                ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {isBangla ? 'ভাউচার অডিট রিপোর্ট' : 'Voucher Audit Report'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 dark:text-slate-400 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
            {t.period.billingPeriod}: {billingPeriodId}
          </span>
        </div>
      </div>

      {/* Printable Report Document (Office Purpose Clean Statement) */}
      <div 
        id="printable-report" 
        className="bg-white text-slate-900 rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6 print:border-none print:p-0 print:m-0 print:shadow-none print:rounded-none"
      >
        {/* Report Official Letterhead */}
        <div className="text-center border-b pb-5 border-slate-200">
          <div className="flex items-center justify-center gap-2.5 mb-1.5">
            {buildingInfo.logoUrl ? (
              <img 
                src={buildingInfo.logoUrl} 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-lg border border-slate-200 p-0.5 print:w-8 print:h-8" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold print:hidden">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {buildingTitle}
            </h2>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-700 font-sans tracking-wide">
            {committeeSubTitle}
          </p>

          <p className="text-xs text-slate-600 mt-1">
            {buildingAddress}
            {buildingInfo.managementOfficeMobile && ` • মোবা: ${buildingInfo.managementOfficeMobile}`}
          </p>

          <div className="inline-block mt-3 px-4 py-1.5 bg-slate-900 text-amber-300 text-xs font-extrabold rounded-full tracking-wider uppercase print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300">
            {reportPillTitle}
          </div>
        </div>

        {/* 3 Summary Figures */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs p-4 bg-slate-50 rounded-2xl border border-slate-200 print:bg-slate-50 print:border-slate-300">
          <div className="space-y-0.5">
            <span className="text-slate-600 font-medium">{t.reports.totalCost}</span>
            <p className="text-lg sm:text-xl font-black text-slate-900">
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="space-y-0.5 border-x border-slate-200">
            <span className="text-slate-600 font-medium">{t.reports.totalRevenue}</span>
            <p className="text-lg sm:text-xl font-black text-emerald-800">
              {formatCurrency(totalCollected)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-600 font-medium">{isBangla ? 'মোট বকেয়া' : 'Total Dues'}</span>
            <p className="text-lg sm:text-xl font-black text-rose-700">
              {formatCurrency(totalDues)}
            </p>
          </div>
        </div>

        {/* Dynamic Table based on Report Type */}
        {reportType === 'INCOME_EXPENSE' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {isBangla ? `টাওয়ার খরচের হিসাব ও ভাউচার ভল্ট (${periodLabel})` : `Tower Expense Account & Voucher Vault (${periodLabel})`}
              </h3>
              <span className="text-xs text-slate-500 font-medium print:text-[11px]">
                {isBangla ? `মোট আইটেম: ${formatNumber(periodExpenses.length)}টি` : `Total items: ${periodExpenses.length}`}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs print:border-slate-300">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 print:bg-slate-200">
                  <tr>
                    <th className="p-3 w-14 text-center">{isBangla ? 'ক্রমিক' : 'SL'}</th>
                    <th className="p-3">{isBangla ? 'বিবরণ' : 'Description'}</th>
                    <th className="p-3 w-36">{isBangla ? 'ভাউচার / ক্যাশ মেমো' : 'Voucher / Cash Memo'}</th>
                    <th className="p-3 w-36">{isBangla ? 'সংযুক্ত ভাউচার' : 'Attached Voucher'}</th>
                    <th className="p-3 text-right w-32">{isBangla ? 'টাকার পরিমাণ' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-200">
                  {periodExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                        {isBangla ? 'এই মাসে কোনো খরচের হিসাব রেকর্ড নেই।' : 'No expense records found for this period.'}
                      </td>
                    </tr>
                  ) : (
                    periodExpenses.map((exp, idx) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70">
                        <td className="p-3 text-center font-mono text-slate-600">{formatNumber(idx + 1)}</td>
                        <td className="p-3 font-bold text-slate-900">{exp.title}</td>
                        <td className="p-3 font-mono text-slate-600">{exp.voucherNumber || '—'}</td>
                        <td className="p-3">
                          {exp.voucher ? (
                            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                              ✓ {isBangla ? 'ভাউচার সংযুক্ত' : 'Attached'}
                            </span>
                          ) : (
                            <span className="text-amber-800 font-bold inline-flex items-center gap-1">
                              ⚠ {isBangla ? 'ভাউচার মিসিং' : 'Missing'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900 font-mono">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300 print:bg-slate-200">
                    <td colSpan={4} className="p-3 text-right text-xs uppercase tracking-wide">
                      {isBangla ? 'সর্বমোট খরচ:' : 'Total Expense:'}
                    </td>
                    <td className="p-3 text-right text-sm font-extrabold text-slate-950 font-mono">
                      {formatCurrency(totalExpense)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'DUES_STATEMENT' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {isBangla ? `বকেয়া ও আদায় বিবরণী তালিকা (${periodLabel})` : `Dues & Collections Statement (${periodLabel})`}
              </h3>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs print:border-slate-300">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 print:bg-slate-200">
                  <tr>
                    <th className="p-3 w-20">{t.flats.unitNumber}</th>
                    <th className="p-3">{t.flats.owner}</th>
                    <th className="p-3">{t.flats.phone}</th>
                    <th className="p-3 text-right">{t.flats.monthlyBill}</th>
                    <th className="p-3 text-right">{t.flats.paid}</th>
                    <th className="p-3 text-right">{t.flats.due}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-200">
                  {flats.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold font-mono text-slate-900">{unit.unitNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{unit.ownerName}</td>
                      <td className="p-3 font-mono text-slate-600">{unit.ownerPhone}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(unit.monthlyBaseBill)}</td>
                      <td className="p-3 text-right font-medium text-emerald-800">{formatCurrency(unit.currentPaid)}</td>
                      <td className="p-3 text-right font-bold text-rose-700">{formatCurrency(unit.currentDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'VOUCHER_AUDIT' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {isBangla ? `টাওয়ার খরচের ভাউচার অডিট রিপোর্ট (${periodLabel})` : `Tower Voucher Audit Report (${periodLabel})`}
              </h3>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs print:border-slate-300">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 print:bg-slate-200">
                  <tr>
                    <th className="p-3 w-14 text-center">{isBangla ? 'ক্রমিক' : 'SL'}</th>
                    <th className="p-3">{t.expenses.description}</th>
                    <th className="p-3">{t.expenses.voucher}</th>
                    <th className="p-3">{t.expenses.paymentMethod}</th>
                    <th className="p-3 text-right">{t.expenses.amount}</th>
                    <th className="p-3 text-center">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-200">
                  {periodExpenses.map((exp, idx) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70">
                      <td className="p-3 text-center font-mono text-slate-600">{formatNumber(idx + 1)}</td>
                      <td className="p-3 font-bold text-slate-900">{exp.title}</td>
                      <td className="p-3 font-mono text-slate-600">{exp.voucherNumber || '—'}</td>
                      <td className="p-3 font-mono text-slate-600">{exp.paymentMethod}</td>
                      <td className="p-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(exp.amount)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          exp.voucher ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {exp.voucher ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300 print:bg-slate-200">
                    <td colSpan={4} className="p-3 text-right text-xs uppercase tracking-wide">
                      {isBangla ? 'সর্বমোট খরচ:' : 'Total Expense:'}
                    </td>
                    <td className="p-3 text-right text-sm font-extrabold text-slate-950 font-mono">
                      {formatCurrency(totalExpense)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signature Box (Office Purpose Clean Approval Section) */}
        <div className="grid grid-cols-2 gap-8 pt-12 text-xs text-center border-t border-slate-200 mt-6">
          <div className="space-y-1">
            <div className="w-48 border-b-2 border-dashed border-slate-400 mx-auto mb-2"></div>
            <p className="font-extrabold text-slate-900 text-sm">
              {isBangla ? 'হিসাবরক্ষক / ম্যানেজার' : 'Accountant / Manager'}
            </p>
            <p className="text-xs text-slate-600 font-medium">
              {buildingInfo.buildingNameEnglish || 'Japan City Tower'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="w-48 border-b-2 border-dashed border-slate-400 mx-auto mb-2"></div>
            <p className="font-extrabold text-slate-900 text-sm">
              {isBangla ? 'সভাপতি / সাধারণ সম্পাদক' : 'President / General Secretary'}
            </p>
            <p className="text-xs text-slate-600 font-medium">
              {isBangla ? 'ম্যানেজমেন্ট কমিটি' : 'Management Committee'}
            </p>
          </div>
        </div>

        {/* Fine-print print generation footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>
            {isBangla 
              ? `রিপোর্ট তৈরির তারিখ: ${new Date().toLocaleDateString('bn-BD')} • ${buildingTitle} অফিসিয়াল ম্যানেজমেন্ট সিস্টেম` 
              : `Generated on: ${new Date().toLocaleDateString()} • ${buildingTitle} Official Management System`}
          </span>
          <span className="print:hidden">
            {isBangla ? 'অফিসিয়াল প্রিন্ট ফরম্যাট' : 'Official Print Format'}
          </span>
        </div>
      </div>
    </div>
  );
};

