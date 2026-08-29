import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Printer, 
  Download, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Layers,
  FileText,
  User
} from 'lucide-react';
import { UserProfile, PaymentRecord, Member, FlatUnit } from '../../types';
import { samplePayments, sampleMembers, sampleUnits } from '../../data/mockData';
import { PageHeader } from '../../components/common/PageHeader';
import { useTranslation } from '../../i18n/LanguageContext';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { paymentService } from '../../services/paymentService';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';
import { expenseService } from '../../services/expenseService';
import { resolveActiveMember, resolveMemberFlats, calculateMemberBillSummary } from '../../utils/memberResolver';
import { MemberSelectorBar } from '../../components/common/MemberSelectorBar';
import { ExpenseItem } from '../../types';

interface MemberStatementPageProps {
  currentUser: UserProfile;
}

export const MemberStatementPage: React.FC<MemberStatementPageProps> = ({
  currentUser,
}) => {
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();
  const { selectedYear: currentActiveYear, billingPeriodId, periodLabel } = useBillingPeriod();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [overrideMember, setOverrideMember] = useState<Member | null>(null);

  const [selectedYear, setSelectedYear] = useState<number>(currentActiveYear || 2026);
  const [selectedFlat, setSelectedFlat] = useState<string>('ALL');

  const activeMember: Member = overrideMember || resolveActiveMember(currentUser, members);

  useEffect(() => {
    const targetMemberId = activeMember.memberId || currentUser.memberId || 'JCT-001';
    const unsubPay = paymentService.subscribeToMemberPayments(
      targetMemberId,
      (loaded) => setPayments(loaded),
      undefined,
      activeMember.flatUnitNumbers || currentUser.flatUnits
    );
    const unsubMem = memberService.subscribeToMembers((loaded) => setMembers(loaded));
    const unsubFlats = flatService.subscribeToFlats((loaded) => setFlats(loaded));
    const unsubExp = expenseService.subscribeToExpenses((loaded) => setExpenses(loaded), billingPeriodId);

    return () => {
      unsubPay();
      unsubMem();
      unsubFlats();
      unsubExp();
    };
  }, [activeMember.memberId, activeMember.flatUnitNumbers, currentUser.memberId, currentUser.flatUnits, billingPeriodId]);

  const member = activeMember;
  const memberFlats = resolveMemberFlats(member, currentUser, flats);

  const handlePrint = () => {
    window.print();
  };

  const periodExp = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
  const { dualCalc, perFlatBill, isKh } = calculateMemberBillSummary(
    member,
    memberFlats,
    payments,
    periodExp,
    flats.length || 28
  );

  // Build statement entries for member's flats
  const baseRate = perFlatBill || 1997;
  const filteredFlats = selectedFlat === 'ALL' ? memberFlats : memberFlats.filter(f => f.unitNumber === selectedFlat);

  // Group payments by flat and calculate total demand vs paid
  const totalBilled = selectedFlat === 'ALL'
    ? (isKh ? dualCalc.khalilur.totalBill : filteredFlats.reduce((sum, f) => sum + (f.monthlyBaseBill || baseRate), 0))
    : (isKh ? dualCalc.khalilur.perFlatBill : filteredFlats.reduce((sum, f) => sum + (f.monthlyBaseBill || baseRate), 0));

  const totalPaid = payments
    .filter(p => selectedFlat === 'ALL' || p.flatUnitNumber === selectedFlat)
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const netDue = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="space-y-6 font-bengali">
      <div className="print:hidden space-y-4">
        <MemberSelectorBar
          members={members}
          activeMember={member}
          onSelectMember={(m) => setOverrideMember(m)}
          currentUserRole={currentUser.role}
        />

        <PageHeader
          title={isBangla ? 'আমার অ্যাকাউন্ট স্টেটমেন্ট' : 'My Account Statement'}
          subtitle={isBangla 
            ? 'আপনার সার্বিক সার্ভিস বিল ও পেমেন্ট জমার অফিসিয়াল হিসাব স্টেটমেন্ট' 
            : 'Official ledger and financial statement of all bills and payments'}
          actionButton={
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isBangla ? 'স্টেটমেন্ট প্রিন্ট করুন' : 'Print Statement'}</span>
            </button>
          }
        />
      </div>

      {/* Filter Control (Hidden in Print) */}
      <div className="print:hidden bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {isBangla ? 'ফ্ল্যাট নির্বাচন:' : 'Select Flat:'}
          </label>
          <select
            value={selectedFlat}
            onChange={(e) => setSelectedFlat(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          >
            <option value="ALL">{isBangla ? 'সকল ফ্ল্যাট (একত্রীকরণ)' : 'All Owned Flats'}</option>
            {memberFlats.map(f => (
              <option key={f.unitNumber} value={f.unitNumber}>
                {isBangla ? 'ফ্ল্যাট' : 'Flat'} {f.unitNumber}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {isBangla ? 'বছর:' : 'Year:'}
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono"
          >
            {[2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable Statement Sheet */}
      <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6 print:border-none print:p-0 print:shadow-none">
        {/* Statement Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  জাপান সিটি টাওয়ার ফ্ল্যাট মালিক সমিতি
                </h2>
                <p className="text-xs text-slate-600">
                  Japan City Tower Flat Owners Association • Common Bill Ledger
                </p>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-md font-mono inline-block">
              {isBangla ? 'অফিসিয়াল স্টেটমেন্ট' : 'Official Statement'}
            </span>
            <p className="font-mono text-[11px] pt-1">
              {isBangla ? 'তারিখ:' : 'Date:'} {new Date().toLocaleDateString('bn-BD')}
            </p>
          </div>
        </div>

        {/* Member Profile Info in Statement */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">{isBangla ? 'সদস্যের নাম:' : 'Member Name:'}</span>
            <span className="font-bold text-slate-900 text-sm">{member.banglaName || member.name}</span>
          </div>

          <div>
            <span className="text-slate-500 block">Member ID:</span>
            <span className="font-mono font-bold text-slate-900">{member.memberId}</span>
          </div>

          <div>
            <span className="text-slate-500 block">{isBangla ? 'মালিকানাধীন ফ্ল্যাট:' : 'Owned Flats:'}</span>
            <span className="font-mono font-bold text-amber-700">
              {memberFlats.map(f => f.unitNumber).join(', ')} ({formatNumber(memberFlats.length)}টি)
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">{isBangla ? 'যোগাযোগ:' : 'Contact:'}</span>
            <span className="font-mono text-slate-800">{member.phone || 'N/A'}</span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-3 px-3 border-r border-slate-200">#</th>
                <th className="py-3 px-3 border-r border-slate-200">{isBangla ? 'ফ্ল্যাট নং' : 'Flat #'}</th>
                <th className="py-3 px-3 border-r border-slate-200">{isBangla ? 'বিলিং বিবরণ' : 'Particulars'}</th>
                <th className="py-3 px-3 border-r border-slate-200 text-right">{isBangla ? 'দাবিকৃত বিল' : 'Demand'}</th>
                <th className="py-3 px-3 border-r border-slate-200 text-right">{isBangla ? 'পরিশোধিত টাকা' : 'Paid'}</th>
                <th className="py-3 px-3 border-r border-slate-200 text-right">{isBangla ? 'বকেয়া' : 'Balance Due'}</th>
                <th className="py-3 px-3 text-center">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredFlats.map((flat, index) => {
                const flatPaid = payments
                  .filter(p => p.flatUnitNumber === flat.unitNumber)
                  .reduce((sum, p) => sum + p.paidAmount, 0);
                const flatBill = flat.monthlyBaseBill || baseRate;
                const flatDue = Math.max(0, flatBill - flatPaid);

                return (
                  <tr key={flat.id || flat.unitNumber} className="hover:bg-slate-50">
                    <td className="py-3 px-3 border-r border-slate-200 font-mono text-slate-500">
                      {formatNumber(index + 1)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 font-mono font-bold">
                      {isBangla ? 'ফ্ল্যাট' : 'Flat'} {flat.unitNumber}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200">
                      {periodLabel} {isBangla ? 'সার্ভিস চার্জ ও কমন বিল' : 'Common Maintenance Bill'}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold">
                      {formatCurrency(flatBill)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(flatPaid)}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(flatDue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                        flatDue === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {flatDue === 0 ? (isBangla ? 'পরিশোধিত' : 'PAID') : (isBangla ? 'বকেয়া' : 'DUE')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
              <tr>
                <td className="py-3 px-3 border-r border-slate-200" colSpan={3}>
                  {isBangla ? 'সর্বমোট (Grand Total)' : 'Grand Total'}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono text-sm">
                  {formatCurrency(totalBilled)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono text-sm text-emerald-700">
                  {formatCurrency(totalPaid)}
                </td>
                <td className="py-3 px-3 border-r border-slate-200 text-right font-mono text-sm text-rose-600">
                  {formatCurrency(netDue)}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                    netDue === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {netDue === 0 ? (isBangla ? 'ক্লিয়ার' : 'CLEAR') : (isBangla ? 'বকেয়া বিদ্যমান' : 'DUE PENDING')}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Statement Footer & Signatures */}
        <div className="pt-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto" />
            <p>{isBangla ? 'হিসাব প্রস্তুতকারী' : 'Prepared By'}</p>
          </div>

          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto" />
            <p>{isBangla ? 'সাধারণ সম্পাদক / কোষাধ্যক্ষ' : 'Secretary / Treasurer'}</p>
          </div>

          <div className="text-center space-y-1">
            <div className="w-32 border-b border-slate-400 mx-auto" />
            <p>{isBangla ? 'সভাপতি' : 'President'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
