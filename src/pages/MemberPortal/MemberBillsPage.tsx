import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Building2, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  Printer, 
  Coins, 
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Info
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

interface MemberBillsPageProps {
  currentUser: UserProfile;
  onNavigateTab?: (tab: string) => void;
}

export const MemberBillsPage: React.FC<MemberBillsPageProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const { billingPeriodId, periodLabel, selectedYear, selectedMonth, setBillingPeriod } = useBillingPeriod();
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();

  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [selectedFlatTab, setSelectedFlatTab] = useState<string>('ALL');
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

  const memberFlats = resolveMemberFlats(member, currentUser, flats);

  const filteredFlats = selectedFlatTab === 'ALL' 
    ? memberFlats 
    : memberFlats.filter(f => f.unitNumber === selectedFlatTab);

  const periodExp = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
  const effectiveExp = periodExp.length > 0 ? periodExp : (billingPeriodId === '2025-06' ? sampleExpensesJune2025 : []);
  
  const isMasterCleared = typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true';
  const { dualCalc, perFlatBill, totalUnits, isKh } = calculateMemberBillSummary(
    member,
    memberFlats,
    payments,
    effectiveExp,
    isMasterCleared ? flats.length : (flats.length || 28)
  );

  const totalBill = selectedFlatTab === 'ALL'
    ? (isKh ? (dualCalc.totalExpense > 0 ? dualCalc.khalilur.totalBill : filteredFlats.length * 1997) : filteredFlats.length * perFlatBill)
    : (isKh ? (dualCalc.totalExpense > 0 ? dualCalc.khalilur.perFlatBill : 1997) : perFlatBill);

  const totalPaid = payments
    .filter(p => selectedFlatTab === 'ALL' || p.flatUnitNumber === selectedFlatTab)
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalDue = Math.max(0, totalBill - totalPaid);

  return (
    <div className="space-y-6 font-bengali">
      <MemberSelectorBar
        members={members}
        activeMember={member}
        onSelectMember={(m) => setOverrideMember(m)}
        currentUserRole={currentUser.role}
      />

      <PageHeader
        title={isBangla ? 'আমার বিল ও হিসাব বিবরণী' : 'My Monthly Bills & Breakdown'}
        subtitle={isBangla 
          ? `${periodLabel} বিলিং পিরিয়ডের জন্য আপনার মালিকানাধীন ইউনিটের মাসিক বিলের বিস্তারিত হিসাব` 
          : `Detailed monthly billing calculation and breakdown for ${periodLabel}`}
      />

      {/* Flat Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => setSelectedFlatTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            selectedFlatTab === 'ALL'
              ? 'bg-slate-900 text-amber-400 shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isBangla ? 'সকল ফ্ল্যাট একত্রীকরণ' : 'All Owned Flats'} ({formatNumber(memberFlats.length)})</span>
        </button>

        {memberFlats.map((flat) => (
          <button
            key={flat.id || flat.unitNumber}
            type="button"
            onClick={() => setSelectedFlatTab(flat.unitNumber)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 font-mono ${
              selectedFlatTab === flat.unitNumber
                ? 'bg-slate-900 text-amber-400 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isBangla ? 'ফ্ল্যাট' : 'Flat'} {flat.unitNumber}</span>
          </button>
        ))}
      </div>

      {/* Financial Summary Card for Selected Tab */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">
              {selectedFlatTab === 'ALL' 
                ? (isBangla ? 'সর্বমোট দাবি ও পরিশোধ' : 'Consolidated Total Demand')
                : (isBangla ? `ফ্ল্যাট ${selectedFlatTab} এর হিসাব` : `Account for Flat ${selectedFlatTab}`)}
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {periodLabel} {isBangla ? 'বিলের সার্বিক অবস্থা' : 'Bill Statement'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl font-mono">
              {periodLabel}
            </span>
            <StatusBadge status={totalDue === 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'DUE')} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
            <span className="text-xs text-slate-500">{isBangla ? 'মোট দাবিকৃত বিল:' : 'Total Demand:'}</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatCurrency(totalBill)}
            </p>
            <p className="text-[11px] text-slate-400">
              {selectedFlatTab === 'ALL' ? (
                isKh ? (
                  isBangla ? '(৩টি ফ্ল্যাট বিশেষ সূত্রানুযায়ী মোট বিল)' : '(Special 3-Flat Formula Bill)'
                ) : (
                  `(${formatNumber(filteredFlats.length)} × ${formatCurrency(dualCalc.regularRoundedPerFlat)})`
                )
              ) : (
                isBangla ? 'মাসিক নির্ধারিত সার্ভিস চার্জ' : 'Monthly Common Service Charge'
              )}
            </p>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl space-y-1">
            <span className="text-xs text-emerald-700 dark:text-emerald-300">{isBangla ? 'পরিশোধিত অর্থ:' : 'Paid Amount:'}</span>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              {formatCurrency(totalPaid)}
            </p>
            <p className="text-[11px] text-emerald-600">{isBangla ? 'অফিসিয়াল রসিদযুক্ত' : 'Verified with receipt'}</p>
          </div>

          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl space-y-1">
            <span className="text-xs text-rose-700 dark:text-rose-300">{isBangla ? 'বর্তমান বকেয়া:' : 'Current Due:'}</span>
            <p className={`text-2xl font-bold font-mono ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {formatCurrency(totalDue)}
            </p>
            <p className="text-[11px] text-slate-400">
              {totalDue === 0 ? (isBangla ? 'কোনো বকেয়া নেই' : 'Fully Cleared') : (isBangla ? 'পরিশোধের অপেক্ষায়' : 'Payment pending')}
            </p>
          </div>
        </div>
      </div>

      {/* Itemized Calculation Breakdown Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" />
          {isBangla ? 'ইউনিটভিত্তিক বিস্তারিত বিল হিসাব বিবরণী' : 'Unit-wise Itemized Billing Ledger'}
        </h3>

        <div className="space-y-4">
          {filteredFlats.map((flat) => {
            const flatPaid = payments
              .filter(p => p.flatUnitNumber === flat.unitNumber)
              .reduce((sum, p) => sum + p.paidAmount, 0);
            const flatBill = isKh ? dualCalc.khalilur.perFlatBill : (flat.monthlyBaseBill || dualCalc.regularRoundedPerFlat);
            const flatDue = Math.max(0, flatBill - flatPaid);

            return (
              <div 
                key={flat.id || flat.unitNumber}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                      {isBangla ? 'ফ্ল্যাট' : 'Flat'} {flat.unitNumber}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({formatNumber(flat.floor)} {isBangla ? 'ম তলা' : 'Floor'} • {flat.unitType || 'আবাসিক'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">{periodLabel}</span>
                    <StatusBadge status={flatDue === 0 ? 'PAID' : (flatPaid > 0 ? 'PARTIAL' : 'DUE')} size="sm" />
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Formula Breakdown */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {isBangla ? 'বিল গণনার বিবরণ' : 'Billing Calculation'}
                      </h4>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                          <span className="text-slate-600 dark:text-slate-300">
                            {isBangla ? '১. পূর্ববর্তী মাসের বকেয়া (Previous Due):' : '1. Previous Outstanding Due:'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ৳০
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                          <span className="text-slate-600 dark:text-slate-300">
                            {isBangla ? '২. চলতি মাসের ধার্যকৃত কমন বিল (Monthly Base Bill):' : '2. Current Month Base Bill:'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(flatBill)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                          <span className="text-slate-600 dark:text-slate-300">
                            {isBangla ? '৩. কাস্টম সমন্বয় / ছাড় (Adjustment):' : '3. Adjustments / Discounts:'}
                          </span>
                          <span className="font-mono font-bold text-slate-500">
                            ৳০
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg font-bold">
                          <span className="text-amber-900 dark:text-amber-200">
                            {isBangla ? 'মোট প্রদেয় দাবি (Total Net Demand):' : 'Total Net Demand:'}
                          </span>
                          <span className="font-mono text-sm text-slate-900 dark:text-white">
                            {formatCurrency(flatBill)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Payment Status */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        {isBangla ? 'পরিশোধ ও বকেয়া স্ট্যাটাস' : 'Payment Status'}
                      </h4>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                          <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                            {isBangla ? 'পরিশোধিত অর্থ (Amount Paid):' : 'Amount Paid:'}
                          </span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                            {formatCurrency(flatPaid)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                          <span className="text-slate-600 dark:text-slate-300">
                            {isBangla ? 'বাকি বকেয়া (Balance Due):' : 'Remaining Due:'}
                          </span>
                          <span className={`font-mono font-bold text-sm ${flatDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                            {formatCurrency(flatDue)}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {isBangla ? 'পরিশোধের অবস্থা:' : 'Payment Status:'}
                          </span>
                          <StatusBadge status={flatDue === 0 ? 'PAID' : (flatPaid > 0 ? 'PARTIAL' : 'DUE')} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Common Expense Formula Transparency Notice (Safe Sharing) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">
              {isBangla ? 'কমন খরচ বণ্টন নীতি ও স্বচ্ছতা নির্দেশিকা' : 'Common Cost Sharing Transparency'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isBangla
                ? 'জাপান সিটি টাওয়ারের লিফট বিদ্যুৎ, জেনারেটর ডিজেল, সিকিউরিটি গার্ড বেতন, ক্লিনার চার্জ, কমন স্পেস রক্ষণাবেক্ষণ ইত্যাদি সার্বিক খরচ মোট ২৮টি ইউনিটের মধ্যে সমভাবে বণ্টন করা হয়।'
                : 'All common expenses (lift electricity, generator fuel, security staff, cleaner, common area maintenance) are divided equally among all 28 units.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400">{isBangla ? 'মাসিক মোট সাধারণ খরচ:' : 'Total Common Expense:'}</span>
            <p className="text-base font-bold text-white font-mono mt-0.5">৳৫৫,৯১৬</p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400">{isBangla ? 'টাওয়ারের মোট ফ্ল্যাট সংখ্যা:' : 'Total Tower Units:'}</span>
            <p className="text-base font-bold text-amber-400 font-mono mt-0.5">২৮টি ফ্ল্যাট</p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-slate-400">{isBangla ? 'ফ্ল্যাটপ্রতি মাসিক বিল (রাউন্ডেড):' : 'Bill per Flat (Rounded):'}</span>
            <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">৳১,৯৯৭ / ফ্ল্যাট</p>
          </div>
        </div>
      </div>
    </div>
  );
};
