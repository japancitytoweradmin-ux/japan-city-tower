import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Receipt, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Home,
  User,
  Clock
} from 'lucide-react';
import { UserProfile, FlatUnit, Member, PaymentRecord, ExpenseItem } from '../../types';
import { sampleMembers, sampleUnits, samplePayments, sampleExpensesJune2025 } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { flatService } from '../../services/flatService';
import { memberService } from '../../services/memberService';
import { paymentService } from '../../services/paymentService';
import { expenseService } from '../../services/expenseService';
import { calculateDualBilling, isKhalilurMember } from '../../utils/billingCalculator';
import { resolveActiveMember, resolveMemberFlats, calculateMemberBillSummary } from '../../utils/memberResolver';
import { MemberSelectorBar } from '../../components/common/MemberSelectorBar';

interface MemberFlatsPageProps {
  currentUser: UserProfile;
  onNavigateTab?: (tab: string) => void;
}

export const MemberFlatsPage: React.FC<MemberFlatsPageProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const { billingPeriodId, periodLabel } = useBillingPeriod();
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();

  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [overrideMember, setOverrideMember] = useState<Member | null>(null);

  const activeMember: Member = overrideMember || resolveActiveMember(currentUser, members);

  useEffect(() => {
    const unsubFlats = flatService.subscribeToFlats((loaded) => setFlats(loaded));
    const unsubMem = memberService.subscribeToMembers((loaded) => setMembers(loaded));
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

    return () => {
      unsubFlats();
      unsubMem();
      unsubPay();
      unsubExpenses();
    };
  }, [activeMember.memberId, activeMember.flatUnitNumbers, currentUser.memberId, currentUser.flatUnits, billingPeriodId]);

  const member = activeMember;

  // Owned flats resolved safely
  const memberFlats = resolveMemberFlats(member, currentUser, flats);

  const periodExp = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
  const effectiveExp = periodExp.length > 0 ? periodExp : (billingPeriodId === '2025-06' ? sampleExpensesJune2025 : []);
  
  const isMasterCleared = typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true';
  const { dualCalc, perFlatBill, totalUnits, totalBill, totalPaid, totalDue, isKh } = calculateMemberBillSummary(
    member,
    memberFlats,
    payments,
    effectiveExp,
    isMasterCleared ? flats.length : (flats.length || 28)
  );

  return (
    <div className="space-y-6 font-bengali">
      <MemberSelectorBar
        members={members}
        activeMember={member}
        onSelectMember={(m) => setOverrideMember(m)}
        currentUserRole={currentUser.role}
      />

      <PageHeader
        title={isBangla ? 'আমার ফ্ল্যাট ও ইউনিটসমূহ' : 'My Flats & Units'}
        subtitle={isBangla 
          ? `আপনার মালিকানাধীন ${formatNumber(memberFlats.length)}টি ইউনিটের বিবরণ ও পেমেন্ট হিসেব` 
          : `Details and payment records for your ${formatNumber(memberFlats.length)} owned units`}
      />

      {/* Top Financial Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{t.members.totalUnits}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1">
              {formatNumber(totalUnits)} <span className="text-xs font-normal text-slate-500">{t.members.unitsCount}</span>
            </p>
            <p className="text-[11px] text-amber-600 font-medium">
              {memberFlats.map(f => f.unitNumber).join(', ')}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{t.dashboard.thisMonthBill}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1">
              {formatCurrency(totalBill)}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">{periodLabel}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">{t.members.totalDue}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {formatCurrency(totalDue)}
            </p>
            <p className="text-[11px] text-slate-400">
              {totalDue === 0 ? (isBangla ? 'কোনো বকেয়া নেই' : 'No dues') : (isBangla ? 'পরিশোধের অপেক্ষায়' : 'Payment pending')}
            </p>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-teal-600" />
          </div>
        </div>
      </div>

      {/* Flats List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {memberFlats.map((flat) => {
          const flatPaid = payments
            .filter((p) => p.flatUnitNumber === flat.unitNumber)
            .reduce((sum, p) => sum + p.paidAmount, 0);
          const flatBill = isKh ? dualCalc.khalilur.perFlatBill : (flat.monthlyBaseBill || dualCalc.regularRoundedPerFlat);
          const flatDue = Math.max(0, flatBill - flatPaid);
          const flatStatus = flatDue === 0 ? 'PAID' : (flatPaid > 0 ? 'PARTIAL' : 'DUE');

          return (
            <div
              key={flat.id || flat.unitNumber}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all shadow-xs p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                      {flat.unitType || (isBangla ? 'আবাসিক ফ্ল্যাট' : 'Residential')}
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white font-mono pt-1">
                      {isBangla ? 'ফ্ল্যাট' : 'Flat'} {flat.unitNumber}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-amber-500" />
                      <span>{formatNumber(flat.floor)} {isBangla ? 'ম তলা' : 'Floor'} • জাপান সিটি টাওয়ার</span>
                    </p>
                  </div>
                  <StatusBadge status={flatStatus} />
                </div>

                {/* Financial Ledger Details */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{isBangla ? 'মাসিক নির্ধারিত সার্ভিস বিল:' : 'Monthly Base Bill:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                      {formatCurrency(flatBill)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{isBangla ? 'এই মাসে পরিশোধিত:' : 'Paid This Month:'}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                      {formatCurrency(flatPaid)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-semibold">{isBangla ? 'অবশিষ্ট বকেয়া:' : 'Remaining Due:'}</span>
                    <span className={`font-bold font-mono text-sm ${flatDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrency(flatDue)}
                    </span>
                  </div>
                </div>

                {/* Ownership Verification */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{isBangla ? 'স্থায়ী মালিকানা রেকর্ডভুক্ত (Master Data Verified)' : 'Verified Permanent Master Ownership'}</span>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">{periodLabel}</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab?.('member-bills')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>{isBangla ? 'বিলের বিস্তারিত দেখুন' : 'View Bill Details'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
