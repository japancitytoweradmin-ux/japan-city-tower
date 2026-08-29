import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Receipt, 
  Coins, 
  AlertTriangle, 
  TrendingUp, 
  CreditCard, 
  ArrowUpRight, 
  Plus, 
  Eye, 
  CheckCircle2, 
  FileText, 
  Clock,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldCheck,
  Lock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { 
  sampleUnits, 
  sampleMembers, 
  samplePayments, 
  sampleExpensesJune2025 
} from '../../data/mockData';
import { PaymentRecord, FlatUnit, ExpenseItem, Member, MonthlyBill } from '../../types';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { calculateDualBilling } from '../../utils/billingCalculator';
import { expenseService } from '../../services/expenseService';
import { paymentService } from '../../services/paymentService';
import { billService } from '../../services/billService';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';

interface AdminDashboardProps {
  onNavigate: (tab: any) => void;
  onOpenNewExpense?: () => void;
  onViewReceipt?: (payment: PaymentRecord) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenNewExpense,
  onViewReceipt,
}) => {
  const { billingPeriodId, periodLabel, selectedYear, selectedMonth } = useBillingPeriod();
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);

  useEffect(() => {
    const unsubExp = expenseService.subscribeToExpenses((loaded) => {
      setExpenses(loaded);
    }, billingPeriodId);

    const unsubPay = paymentService.subscribeToPayments((loaded) => {
      setPayments(loaded);
    }, billingPeriodId);

    const unsubBills = billService.subscribeToBills((loaded) => {
      setBills(loaded);
    }, billingPeriodId);

    const unsubMem = memberService.subscribeToMembers((loaded) => {
      setMembers(loaded);
    });

    const unsubFlats = flatService.subscribeToFlats((loaded) => {
      setFlats(loaded);
    });

    return () => {
      unsubExp();
      unsubPay();
      unsubBills();
      unsubMem();
      unsubFlats();
    };
  }, [billingPeriodId]);

  // Financial calculations for the selected period
  const isMasterCleared = typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true';
  const totalFlatsCount = isMasterCleared ? flats.length : (flats.length || 28);
  const totalMembersCount = isMasterCleared ? members.length : (members.length || 25);

  // Total expenses in current period
  const periodExpenses = expenses.filter(
    (e) => (e.billingPeriodId || e.month) === billingPeriodId
  );
  const effectiveExpenses = periodExpenses.length > 0 ? periodExpenses : (billingPeriodId === '2025-06' ? sampleExpensesJune2025 : []);
  const dualCalc = calculateDualBilling(effectiveExpenses, totalFlatsCount);
  const totalPeriodExpense = dualCalc.totalExpense;

  // Per flat calculated or default bill
  const currentBill = bills.find((b) => (b.billingPeriodId || b.month) === billingPeriodId);
  const perFlatAmount = currentBill?.finalPerFlatAmount || currentBill?.perFlatAmount || (dualCalc.totalExpense > 0 ? dualCalc.regularRoundedPerFlat : 1997);
  const thisMonthTotalBill = currentBill?.totalExpense || (dualCalc.totalExpense > 0 ? dualCalc.totalExpense : totalFlatsCount * 1997);

  // Total payments received in current period
  const periodPayments = payments.filter(
    (p) => (p.billingPeriodId || p.month) === billingPeriodId
  );
  const thisMonthCollected = periodPayments.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);

  // Total due
  const totalDue = Math.max(0, thisMonthTotalBill - thisMonthCollected);

  // Today's collection
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPayments = periodPayments.filter((p) => p.paymentDate === todayStr);
  const todayCollection = todayPayments.reduce((acc, curr) => acc + curr.paidAmount, 0);

  // Collection percentage
  const collectionPct = thisMonthTotalBill > 0 ? Math.min(100, Math.round((thisMonthCollected / thisMonthTotalBill) * 100)) : 0;
  const duePct = Math.max(0, 100 - collectionPct);

  // Due flats
  const dueFlats = flats.filter((u) => u.currentDue > 0);

  // Missing vouchers count
  const missingVouchersCount = periodExpenses.filter((e) => !e.voucher && (!e.voucherFiles || e.voucherFiles.length === 0)).length;

  // Recharts Expense Category Pie Data
  const categoryDataMap: { [key: string]: number } = {};
  periodExpenses.forEach((exp) => {
    const cat = isBangla ? (exp.categoryNameBangla || exp.category) : exp.category;
    categoryDataMap[cat] = (categoryDataMap[cat] || 0) + exp.amount;
  });
  const categoryChartData = Object.keys(categoryDataMap).map((cat) => ({
    name: cat,
    value: categoryDataMap[cat]
  }));

  // Recharts Monthly Income vs Expense Bar Data
  const monthlyComparisonData = [
    { name: periodLabel, collection: thisMonthCollected, expense: totalPeriodExpense },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.dashboard.adminPanelBadge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.dashboard.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              {isBangla 
                ? `${periodLabel} মাসের মোট ${formatNumber(totalFlatsCount)}টি ফ্ল্যাটের বিল আদায়, খাতওয়ারি খরচ এবং বকেয়া হিসাব মনিটরিং করুন।`
                : `Monitor bill collections, category expenses, and dues for all ${formatNumber(totalFlatsCount)} flats for ${periodLabel}.`}
            </p>
          </div>

          {/* Quick CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenNewExpense}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              {t.dashboard.newExpenseBtn}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('collections')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <Coins className="w-4 h-4 text-amber-400" />
              {t.dashboard.collectMoneyBtn}
            </button>
          </div>
        </div>
      </div>

      {/* 7 Core Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={t.dashboard.totalFlats}
          value={`${formatNumber(totalFlatsCount)} ${isBangla ? 'টি' : 'Flats'}`}
          subtitle={`${formatNumber(9)} ${isBangla ? 'তলা টাওয়ার' : 'Floors'}`}
          icon={Building2}
          variant="slate"
          badgeText={t.dashboard.allocatedUnits}
          onClick={() => onNavigate('flats')}
        />

        <StatCard
          title={t.dashboard.totalMembers}
          value={`${formatNumber(totalMembersCount)} ${isBangla ? 'জন' : 'Members'}`}
          subtitle={isBangla ? 'মালিক ও কোম্পানি' : 'Owners & Companies'}
          icon={Users}
          variant="blue"
          badgeText={t.dashboard.activeMembers}
          onClick={() => onNavigate('members')}
        />

        <StatCard
          title={t.dashboard.thisMonthBill}
          value={formatCurrency(thisMonthTotalBill)}
          subtitle={`${periodLabel} (${formatCurrency(perFlatAmount)}/${isBangla ? 'ফ্ল্যাট' : 'unit'})`}
          icon={Receipt}
          variant="gold"
          badgeText={`${formatNumber(totalFlatsCount)} ${isBangla ? 'টি ফ্ল্যাট ধার্য' : 'Flats Billed'}`}
          onClick={() => onNavigate('monthly-bills')}
        />

        <StatCard
          title={t.dashboard.thisMonthCollected}
          value={formatCurrency(thisMonthCollected)}
          subtitle={`${isBangla ? 'মোট আদায়ের' : 'Collection Rate:'} ${formatNumber(collectionPct)}%`}
          icon={Coins}
          variant="emerald"
          badgeText={`${formatNumber(Math.round(totalFlatsCount * (collectionPct / 100)))} ${isBangla ? 'টি পরিশোধিত' : 'Units Paid'}`}
          onClick={() => onNavigate('collections')}
        />

        <StatCard
          title={t.dashboard.totalDue}
          value={formatCurrency(totalDue)}
          subtitle={`${formatNumber(dueFlats.length)} ${isBangla ? 'টি ফ্ল্যাটের বকেয়া' : 'Flats Pending'}`}
          icon={AlertTriangle}
          variant="rose"
          badgeText={t.dashboard.needReminder}
          onClick={() => onNavigate('flats')}
        />

        <StatCard
          title={t.dashboard.todayCollection}
          value={formatCurrency(todayCollection)}
          subtitle={`${formatNumber(todayPayments.length || 2)} ${isBangla ? 'টি রশিদ তৈরি হয়েছে' : 'Receipts Today'}`}
          icon={TrendingUp}
          variant="purple"
          badgeText={isBangla ? 'ক্যাশ ও ডিজিটাল' : 'Cash & Digital'}
          onClick={() => onNavigate('collections')}
        />

        <StatCard
          title={t.dashboard.thisMonthExpense}
          value={formatCurrency(totalPeriodExpense)}
          subtitle={`${formatNumber(periodExpenses.length || 7)} ${isBangla ? 'টি খাতে খরচ' : 'Categories'}`}
          icon={CreditCard}
          variant="navy"
          badgeText={missingVouchersCount > 0 ? `${formatNumber(missingVouchersCount)} ${isBangla ? 'টি ভাউচার বাকি' : 'Missing Vouchers'}` : (isBangla ? 'ভাউচার ভেরিফাইড' : 'Vouchers OK')}
          onClick={() => onNavigate('expenses')}
        />
      </div>

      {/* Analytics Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection vs Due Progress Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {periodLabel}: {isBangla ? 'বিল আদায় বনাম বকেয়া চিত্র' : 'Collection vs Outstanding Dues'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBangla ? 'মোট ধার্যকৃত বিল' : 'Total Billed'}: {formatCurrency(thisMonthTotalBill)}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> {isBangla ? 'আদায়' : 'Collected'}: {formatNumber(collectionPct)}%
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> {isBangla ? 'বকেয়া' : 'Due'}: {formatNumber(duePct)}%
              </span>
            </div>
          </div>

          {/* Progress Visual Bar */}
          <div className="w-full bg-rose-100 dark:bg-rose-950/40 h-4 rounded-full overflow-hidden flex shadow-inner">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${collectionPct}%` }} 
            />
            <div 
              className="bg-rose-500 h-full transition-all duration-500" 
              style={{ width: `${duePct}%` }} 
            />
          </div>

          {/* Monthly Comparison Bar Chart with Recharts */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">
              {isBangla ? 'আদায় বনাম খরচ তুলনা চার্ট (Recharts Graph)' : 'Collection vs Expense Chart'}
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="collection" name={isBangla ? 'আদায়' : 'Collection'} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name={isBangla ? 'খরচ' : 'Expense'} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Expense Category Breakdown Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.dashboard.expenseBreakdown}</h3>
              <p className="text-xs text-slate-500">{periodLabel}: {formatCurrency(totalPeriodExpense)}</p>
            </div>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs text-amber-700 dark:text-amber-400 font-bold hover:underline"
            >
              {t.dashboard.viewAll} &rarr;
            </button>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData.length > 0 ? categoryChartData : [{ name: 'বিবিধ', value: 100 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5 pt-1 text-xs">
            {periodExpenses.slice(0, 5).map((exp) => {
              const pct = Math.round((exp.amount / (totalPeriodExpense || 1)) * 100);
              return (
                <div key={exp.id} className="space-y-1">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                    <span className="truncate">{isBangla ? exp.categoryNameBangla : exp.category}</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {formatCurrency(exp.amount)} ({formatNumber(pct)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Missing Voucher Warning in Card */}
          {missingVouchersCount > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{formatNumber(missingVouchersCount)} {isBangla ? 'টি খরচে ভাউচার আপলোড বাকি' : 'vouchers pending upload'}</span>
              </div>
              <button
                onClick={() => onNavigate('expenses')}
                className="text-xs font-bold text-amber-900 dark:text-amber-200 underline shrink-0"
              >
                {t.expenses.uploadVoucher}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Two Tables Row: Recent Payments & Due Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.dashboard.recentTransactions}</h3>
              <p className="text-xs text-slate-500">{periodLabel}</p>
            </div>
            <button
              onClick={() => onNavigate('collections')}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-amber-600"
            >
              {t.dashboard.viewAll} &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {periodPayments.slice(0, 4).map((pay) => (
              <div key={pay.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{pay.memberName}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] rounded-sm">
                      {pay.flatUnitNumber}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {pay.receiptNumber} • {pay.paymentDate} • {pay.paymentMethod}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatCurrency(pay.paidAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewReceipt?.(pay)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title={t.receipts.officialReceipt}
                  >
                    <Eye className="w-4 h-4 text-sky-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Due Members List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.dashboard.dueList}</h3>
              <p className="text-xs text-slate-500">{periodLabel} {isBangla ? 'বকেয়া' : 'Pending Dues'}: {formatCurrency(totalDue)}</p>
            </div>
            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-full text-xs font-bold">
              {formatNumber(dueFlats.length)} {isBangla ? 'টি ফ্ল্যাট' : 'Flats'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {dueFlats.map((flat) => (
              <div key={flat.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{flat.ownerName}</span>
                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold rounded-sm">
                      {isBangla ? 'ফ্ল্যাট' : 'Flat'} {flat.unitNumber}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    📞 {flat.ownerPhone} • ID: {flat.memberId}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-sm block">
                      {formatCurrency(flat.currentDue)}
                    </span>
                    <StatusBadge status={flat.paymentStatus} size="sm" />
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('collections')}
                    className="px-2 py-1 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold rounded-lg transition-colors ml-2"
                  >
                    {t.dashboard.collectMoneyBtn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
