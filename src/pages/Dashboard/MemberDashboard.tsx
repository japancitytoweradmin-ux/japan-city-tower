import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Receipt, 
  Coins, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Eye, 
  Printer, 
  Download, 
  AlertCircle, 
  Bell, 
  Sparkles,
  Layers,
  ArrowRight,
  PhoneCall,
  Calendar,
  CreditCard,
  ShieldCheck,
  Info,
  ChevronRight
} from 'lucide-react';
import { UserProfile, PaymentRecord, FlatUnit, Member, Notice, ExpenseItem } from '../../types';
import { sampleMembers, sampleUnits, samplePayments, sampleNotices, sampleExpensesJune2025 } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';
import { paymentService } from '../../services/paymentService';
import { expenseService } from '../../services/expenseService';
import { noticeService } from '../../services/noticeService';
import { calculateDualBilling, isKhalilurMember } from '../../utils/billingCalculator';
import { Modal } from '../../components/common/Modal';
import { resolveActiveMember, resolveMemberFlats, calculateMemberBillSummary } from '../../utils/memberResolver';
import { MemberSelectorBar } from '../../components/common/MemberSelectorBar';

interface MemberDashboardProps {
  currentUser: UserProfile;
  onViewReceipt: (payment: PaymentRecord) => void;
  onNavigateTab: (tab: any) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  currentUser,
  onViewReceipt,
  onNavigateTab,
}) => {
  const { billingPeriodId, periodLabel, selectedYear, selectedMonth, setBillingPeriod } = useBillingPeriod();
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();

  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [overrideMember, setOverrideMember] = useState<Member | null>(null);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isBangla ? 'সুপ্রভাত' : 'Good Morning';
    if (hour < 16) return isBangla ? 'শুভ দুপুর' : 'Good Afternoon';
    if (hour < 19) return isBangla ? 'শুভ অপরাহ্ন' : 'Good Afternoon';
    return isBangla ? 'শুভ সন্ধ্যা' : 'Good Evening';
  };

  // Resolve active member safely
  const activeMember: Member = overrideMember || resolveActiveMember(currentUser, members);

  useEffect(() => {
    const unsubMem = memberService.subscribeToMembers((loaded) => setMembers(loaded));
    const unsubFlats = flatService.subscribeToFlats((loaded) => setFlats(loaded));
    
    // Member-scoped payments with real-time updates
    const targetMemberId = activeMember.memberId || currentUser.memberId || 'JCT-001';
    const unsubPay = paymentService.subscribeToMemberPayments(
      targetMemberId,
      (loaded) => setPayments(loaded),
      billingPeriodId,
      activeMember.flatUnitNumbers || currentUser.flatUnits
    );

    const unsubExpenses = expenseService.subscribeToExpenses((loadedExp) => {
      setExpenses(loadedExp);
    }, billingPeriodId);

    const unsubNotices = noticeService.subscribeToPublishedNotices((loaded) => setNotices(loaded));

    return () => {
      unsubMem();
      unsubFlats();
      unsubPay();
      unsubExpenses();
      unsubNotices();
    };
  }, [activeMember.memberId, activeMember.flatUnitNumbers, currentUser.memberId, currentUser.flatUnits, billingPeriodId]);

  const member = activeMember;

  // Assigned flats for this member using robust resolver
  const memberFlats = resolveMemberFlats(member, currentUser, flats);
  const memberPayments = payments;

  // Multi-unit totals for current billing period using dual billing engine & resolver
  const periodExp = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
  const effectiveExp = periodExp.length > 0 ? periodExp : (billingPeriodId === '2025-06' ? sampleExpensesJune2025 : []);
  
  const { dualCalc, perFlatBill, totalUnits, totalBill, totalPaid, totalDue, isKh } = calculateMemberBillSummary(
    member,
    memberFlats,
    memberPayments,
    effectiveExp,
    flats.length || 28
  );

  const hasOverdueUnit = memberFlats.some(f => f.paymentStatus === 'OVERDUE');

  return (
    <div className="space-y-6 font-bengali">
      {/* Member Selector Bar if viewing as Admin or previewing */}
      <MemberSelectorBar
        members={members}
        activeMember={member}
        onSelectMember={(m) => setOverrideMember(m)}
        currentUserRole={currentUser.role}
      />

      {/* Member Hero / Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{getGreeting()} • {isBangla ? 'সদস্য পোর্টাল' : 'Member Portal'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {isBangla ? (member.banglaName || member.name) : member.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-300">
              <span className="bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-700 font-mono text-amber-400 font-bold">
                ID: {member.memberId}
              </span>
              <span className="bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-700">
                {isBangla ? (member.memberTypeBangla || 'ফ্ল্যাট মালিক') : member.memberType}
              </span>
              <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-xl border border-amber-500/40 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {t.members.totalUnits}: {formatNumber(totalUnits)} {t.members.unitsCount} ({memberFlats.map(f => f.unitNumber).join(', ')})
              </span>
            </div>
          </div>

          {/* Dues Status Alert Block in Header */}
          <div className="p-5 bg-slate-800/90 border border-slate-700/80 rounded-2xl flex flex-col justify-between min-w-[240px] shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>{t.members.totalDue}</span>
              <span className="font-semibold text-amber-400 font-mono">{periodLabel}</span>
            </div>
            
            <div className={`text-3xl font-black tracking-tight my-1 ${totalDue === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalDue === 0 ? (isBangla ? '৳০ (পরিশোধিত)' : '৳0 (Paid)') : formatCurrency(totalDue)}
            </div>

            <div className="flex items-center gap-1.5 text-xs pt-1">
              {totalDue === 0 ? (
                <div className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{isBangla ? `${periodLabel} বিল পরিশোধিত` : `${periodLabel} Bill Cleared`}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-400 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{isBangla ? 'বকেয়া পরিশোধের তাগিদ' : 'Payment Outstanding'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Due / Overdue Alert Banner (If Applicable) */}
      {totalDue > 0 && (
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          hasOverdueUnit 
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200' 
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                hasOverdueUnit ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">
                  {hasOverdueUnit 
                    ? (isBangla ? 'জরুরি বকেয়া সতর্কতা (Overdue Bill Notice)' : 'Urgent Overdue Bill Notice')
                    : (isBangla ? `আপনার ${periodLabel} মাসের মোট ৳${formatNumber(totalDue)} টাকা বকেয়া রয়েছে` : `You have an outstanding due of ৳${totalDue} for ${periodLabel}`)}
                </h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {isBangla 
                    ? 'বিল পরিশোধের জন্য জাপান সিটি টাওয়ার ম্যানেজমেন্ট অফিসে ক্যাশ প্রদান করুন অথবা ব্যাংক অ্যাকাউন্টে জমা দিয়ে মানি রসিদ সংগ্রহ করুন।'
                    : 'Please contact the management office to pay via cash or bank deposit and collect your official receipt.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('member-bills')}
              className={`px-4 py-2 text-xs font-bold rounded-xl shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                hasOverdueUnit 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <span>{isBangla ? 'বিলের বিস্তারিত দেখুন' : 'View Bill Details'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4 Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Units */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-medium">{t.members.totalUnits}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatNumber(totalUnits)} <span className="text-xs font-normal text-slate-500">{t.members.unitsCount}</span>
            </p>
            <p className="text-[11px] text-amber-600 font-medium">
              {memberFlats.map(f => f.unitNumber).join(', ') || '6-B, 7-B, 8-B'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* This Month's Bill */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-medium">{t.dashboard.thisMonthBill}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalBill)}
            </p>
            <p className="text-[11px] text-slate-400">
              {isKh ? (
                <span className="text-purple-600 dark:text-purple-400 font-semibold">
                  (৩টি ফ্ল্যাট বিশেষ সূত্রানুযায়ী মোট বিল)
                </span>
              ) : (
                `(${formatNumber(totalUnits)} ${t.members.unitsCount} × ${formatCurrency(dualCalc.regularRoundedPerFlat)})`
              )}
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-medium">{t.members.totalPaid}</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totalPaid)}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium font-mono">{periodLabel}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total Due */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-medium">{t.members.totalDue}</p>
            <p className={`text-2xl font-bold ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {formatCurrency(totalDue)}
            </p>
            <p className="text-[11px] text-slate-400">
              {totalDue === 0 ? (isBangla ? 'কোনো বকেয়া নেই' : 'No dues') : (isBangla ? 'পরিশোধের অপেক্ষায়' : 'Pending payment')}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${totalDue > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            <CheckCircle2 className="w-6 h-6 text-teal-600" />
          </div>
        </div>
      </div>

      {/* MULTI-UNIT OWNERSHIP CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              {isBangla 
                ? `আপনার মালিকানাধীন ফ্ল্যাট/ইউনিট (${formatNumber(memberFlats.length)}টি)`
                : `Your Owned Flats & Units (${formatNumber(memberFlats.length)})`}
            </h2>
            <p className="text-xs text-slate-500">
              {isBangla ? 'প্রতিটি ইউনিটের পৃথক বিল ও পরিশোধের বর্তমান অবস্থা' : 'Individual bill and payment status for each unit'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('member-flats')}
            className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
          >
            <span>{isBangla ? 'সকল ফ্ল্যাট দেখুন' : 'View All Flats'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {memberFlats.map((unit) => (
            <div
              key={unit.id || unit.unitNumber}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">
                      {isBangla ? 'ফ্ল্যাট' : 'Flat'} {unit.unitNumber}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatNumber(unit.floor)} {isBangla ? 'ম তলা' : 'Floor'} • {unit.unitType || 'আবাসিক'}
                    </span>
                  </div>
                  <StatusBadge status={unit.paymentStatus || (totalDue === 0 ? 'PAID' : 'DUE')} />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{t.flats.monthlyBill}:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {formatCurrency(isKh ? dualCalc.khalilur.perFlatBill : dualCalc.regularRoundedPerFlat)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{t.flats.paid}:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                      {formatCurrency(unit.currentPaid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-semibold">{t.flats.due}:</span>
                    <span className={`font-bold font-mono ${unit.currentDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrency(unit.currentDue)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">{periodLabel}</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('member-bills')}
                  className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>{isBangla ? 'বিলের বিস্তারিত' : 'Bill Details'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Unit Aggregation Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isBangla ? 'বহু-ফ্ল্যাট হিসাব একত্রীকরণ সারসংক্ষেপ' : 'Multi-Flat Financial Summary'}
            </h3>
            <p className="text-xs text-slate-500">
              {periodLabel} {isBangla ? 'বিলিং পিরিয়ডের সমন্বিত হিসাব' : 'Consolidated Ledger Statement'}
            </p>
          </div>
          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800 font-mono">
            {periodLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">{t.collections.flatNumber}</th>
                <th className="py-3 px-4">{t.flats.floor}</th>
                <th className="py-3 px-4 text-right">{t.flats.monthlyBill}</th>
                <th className="py-3 px-4 text-right">{t.flats.paid}</th>
                <th className="py-3 px-4 text-right">{t.flats.due}</th>
                <th className="py-3 px-4 text-center">{t.common.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              {memberFlats.map((flat) => (
                <tr key={flat.id || flat.unitNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {flat.unitNumber}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {formatNumber(flat.floor)} {isBangla ? 'ম তলা' : 'Floor'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    {formatCurrency(isKh ? dualCalc.khalilur.perFlatBill : (flat.monthlyBaseBill || dualCalc.regularRoundedPerFlat))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    {formatCurrency(flat.currentPaid)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(flat.currentDue)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={flat.paymentStatus || (totalDue === 0 ? 'PAID' : 'DUE')} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3.5 px-4 font-black" colSpan={2}>
                  {isBangla ? 'সর্বমোট (Total Demand & Payment)' : 'Total'}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm">
                  {formatCurrency(totalBill)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalPaid)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm text-rose-600 dark:text-rose-400">
                  {formatCurrency(totalDue)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <StatusBadge status={totalDue === 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'DUE')} size="sm" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Two Column Section: Recent Payments + Offline Payment Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments (2 Columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                {isBangla ? 'আপনার সাম্প্রতিক পেমেন্টসমূহ' : 'Your Recent Payments'}
              </h3>
              <p className="text-xs text-slate-500">{t.receipts.officialReceipt}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('member-payments')}
              className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
            >
              <span>{isBangla ? 'সকল পেমেন্ট' : 'All Payments'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {memberPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {t.memberPortal?.noPaymentsFound || (isBangla ? 'আপনার কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।' : 'No payment records found.')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {memberPayments.slice(0, 4).map((pay) => (
                <div key={pay.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm font-mono">{pay.billingPeriodId || pay.month}</span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold rounded-sm font-mono">
                        {isBangla ? 'ফ্ল্যাট' : 'Flat'} {pay.flatUnitNumber}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {pay.receiptNumber}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {pay.paymentDate} • {pay.paymentMethod || 'Cash'} • {isBangla ? 'সংগ্রাহক:' : 'Collector:'} {pay.collectedBy || 'Admin'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                        {formatCurrency(pay.paidAmount)}
                      </span>
                      <span className="text-[10px] text-teal-600 font-medium">{t.flats.paidStatus}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewReceipt(pay)}
                      className="px-3 py-1.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                      <span>{isBangla ? 'রসিদ' : 'Receipt'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offline Payment Guidance & Office Contact (1 Column) */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-white">
              {isBangla ? 'পেমেন্ট ও রসিদ নির্দেশনা' : 'Payment Instructions'}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isBangla
                ? 'জাপান সিটি টাওয়ারের সার্ভিস বিল ও কমন খরচ সম্পূর্ণ স্বচ্ছতার সাথে গ্রহণ করা হয়। অনলাইনে স্বয়ংক্রিয় গেটওয়ে নেই; সকল পেমেন্ট সরাসরি অফিসে অথবা নির্ধারিত ব্যাংক হিসাবে পরিশোধযোগ্য।'
                : 'All common service bills must be paid directly at the management office or via official bank transfer.'}
            </p>

            <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{isBangla ? 'অফিসিয়াল মানি রসিদ বাধ্যতামূলক' : 'Official Money Receipt Mandatory'}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isBangla 
                  ? 'টাকা জমা দেওয়ার সাথে সাথেই সিস্টেম-জেনারেটেড বারকোড সম্বলিত অফিসিয়াল মানি রসিদ সংগ্রহ করুন।'
                  : 'Ensure you collect the system-generated official money receipt upon making payment.'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{isBangla ? 'ম্যানেজমেন্ট অফিস: রুম #১০১, নিচতলা' : 'Office: Room #101, Ground Floor'}</span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneCall className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{isBangla ? 'হটলাইন: ০১৭০০-০০০০০০' : 'Hotline: 01700-000000'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Published Tower Notices */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              {isBangla ? 'টাওয়ার নোটিশ ও ঘোষণা' : 'Tower Notices & Announcements'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBangla ? 'নিরাপত্তা, রক্ষণাবেক্ষণ ও সাধারণ নোটিশ' : 'Safety, maintenance and official notices'}
            </p>
          </div>
          <span className="text-xs text-slate-400">{notices.length} {t.common.items}</span>
        </div>

        {notices.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            {t.memberPortal?.noNoticesFound || (isBangla ? 'বর্তমানে কোনো নোটিশ প্রকাশ করা হয়নি।' : 'No notices published at this time.')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notices.map((notice) => (
              <div 
                key={notice.id} 
                onClick={() => setSelectedNotice(notice)}
                className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md space-y-2 text-xs ${
                  notice.priority === 'URGENT' 
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800' 
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{notice.title}</h4>
                  <StatusBadge status={notice.priority} size="sm" />
                </div>
                <p className="text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{notice.content}</p>
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{notice.publishedDate}</span>
                  <span className="text-amber-600 font-medium flex items-center gap-0.5">
                    <span>{isBangla ? 'সম্পূর্ণ পড়ুন' : 'Read more'}</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <Modal
          isOpen={Boolean(selectedNotice)}
          onClose={() => setSelectedNotice(null)}
          title={selectedNotice.title}
          subtitle={`${isBangla ? 'প্রকাশের তারিখ:' : 'Published Date:'} ${selectedNotice.publishedDate}`}
          maxWidth="md"
        >
          <div className="space-y-4 font-bengali text-xs sm:text-sm">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-slate-500 font-medium">{isBangla ? 'অগ্রাধিকার (Priority):' : 'Priority:'}</span>
              <StatusBadge status={selectedNotice.priority} />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {selectedNotice.content}
            </div>

            <div className="pt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>{isBangla ? 'জারি করেছেন: ম্যানেজমেন্ট কমিটি' : 'Issued by: Management Authority'}</span>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
