import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  Eye, 
  Download, 
  Printer, 
  Building2, 
  CheckCircle2, 
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { UserProfile, PaymentRecord, Member, FlatUnit } from '../../types';
import { samplePayments, sampleMembers, sampleUnits } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { useTranslation } from '../../i18n/LanguageContext';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { paymentService } from '../../services/paymentService';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';
import { resolveActiveMember, resolveMemberFlats } from '../../utils/memberResolver';
import { MemberSelectorBar } from '../../components/common/MemberSelectorBar';

interface MemberPaymentsPageProps {
  currentUser: UserProfile;
  onViewReceipt: (payment: PaymentRecord) => void;
}

export const MemberPaymentsPage: React.FC<MemberPaymentsPageProps> = ({
  currentUser,
  onViewReceipt,
}) => {
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();
  const { periodLabel } = useBillingPeriod();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [overrideMember, setOverrideMember] = useState<Member | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFlat, setSelectedFlat] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');

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

    return () => {
      unsubPay();
      unsubMem();
      unsubFlats();
    };
  }, [activeMember.memberId, activeMember.flatUnitNumbers, currentUser.memberId, currentUser.flatUnits]);

  const member = activeMember;
  const memberFlats = resolveMemberFlats(member, currentUser, flats);

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    if (selectedFlat !== 'ALL' && p.flatUnitNumber !== selectedFlat) {
      return false;
    }

    if (selectedMethod !== 'ALL' && p.paymentMethod !== selectedMethod) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchReceipt = (p.receiptNumber || '').toLowerCase().includes(q);
      const matchTrx = (p.transactionRef || '').toLowerCase().includes(q);
      const matchMonth = (p.month || p.billingPeriodId || '').toLowerCase().includes(q);
      const matchFlat = (p.flatUnitNumber || '').toLowerCase().includes(q);
      if (!matchReceipt && !matchTrx && !matchMonth && !matchFlat) {
        return false;
      }
    }

    return true;
  });

  const totalPaidAmount = filteredPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const latestPayment = filteredPayments[0];

  return (
    <div className="space-y-6 font-bengali">
      <MemberSelectorBar
        members={members}
        activeMember={member}
        onSelectMember={(m) => setOverrideMember(m)}
        currentUserRole={currentUser.role}
      />

      <PageHeader
        title={isBangla ? 'আমার পেমেন্ট হিস্টোরি' : 'My Payment History'}
        subtitle={isBangla 
          ? 'আপনার প্রদত্ত সকল সার্ভিস বিল পেমেন্ট ও মানি রসিদের অফিসিয়াল রেকর্ড' 
          : 'Official records of all service bill payments and money receipts'}
      />

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">{isBangla ? 'মোট পেমেন্ট সংখ্যা:' : 'Total Transactions:'}</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatNumber(filteredPayments.length)} <span className="text-xs font-normal text-slate-500">{isBangla ? 'টি' : 'records'}</span>
            </p>
            <p className="text-[11px] text-emerald-600">{isBangla ? '১০০% সিস্টেমে যাচাইকৃত' : '100% Verified'}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">{isBangla ? 'সর্বমোট পরিশোধিত অর্থ:' : 'Total Paid Amount:'}</span>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              {formatCurrency(totalPaidAmount)}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">{periodLabel}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">{isBangla ? 'সর্বশেষ পেমেন্ট:' : 'Latest Payment:'}</span>
            <p className="text-base font-bold text-slate-900 dark:text-white font-mono">
              {latestPayment ? latestPayment.paymentDate : (isBangla ? 'কোনো রেকর্ড নেই' : 'None')}
            </p>
            <p className="text-[11px] text-amber-600 font-mono">
              {latestPayment ? `${isBangla ? 'রসিদ' : 'Receipt'}: ${latestPayment.receiptNumber}` : ''}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isBangla ? 'রসিদ নম্বর বা ট্রানজেকশন খুঁজুন...' : 'Search receipt # or transaction...'}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Flat filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedFlat}
            onChange={(e) => setSelectedFlat(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          >
            <option value="ALL">{isBangla ? 'সকল ফ্ল্যাট' : 'All Flats'}</option>
            {memberFlats.map(f => (
              <option key={f.unitNumber} value={f.unitNumber}>
                {isBangla ? 'ফ্ল্যাট' : 'Flat'} {f.unitNumber}
              </option>
            ))}
          </select>

          {/* Payment Method filter */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          >
            <option value="ALL">{isBangla ? 'সকল মাধ্যম' : 'All Methods'}</option>
            <option value="CASH">{isBangla ? 'ক্যাশ (নগদ)' : 'Cash'}</option>
            <option value="BANK_TRANSFER">{isBangla ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
          </select>
        </div>
      </div>

      {/* Payment Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {t.memberPortal?.noPaymentsFound || (isBangla ? 'কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।' : 'No payment records found.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">{isBangla ? 'রসিদ নং' : 'Receipt #'}</th>
                  <th className="py-3 px-4">{isBangla ? 'তারিখ' : 'Date'}</th>
                  <th className="py-3 px-4">{t.collections.flatNumber}</th>
                  <th className="py-3 px-4">{isBangla ? 'বিলিং মাস' : 'Month'}</th>
                  <th className="py-3 px-4">{isBangla ? 'মাধ্যম ও ট্রানজেকশন' : 'Method & Trx'}</th>
                  <th className="py-3 px-4 text-right">{isBangla ? 'পরিশোধিত টাকা' : 'Paid Amount'}</th>
                  <th className="py-3 px-4 text-center">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {pay.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {pay.paymentDate}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {pay.flatUnitNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {pay.billingPeriodId || pay.month}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {pay.paymentMethod || 'Cash'}
                      </span>
                      {pay.transactionRef && (
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          Trx: {pay.transactionRef}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatCurrency(pay.paidAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onViewReceipt(pay)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:text-slate-950 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                        <span>{isBangla ? 'রসিদ দেখুন' : 'View Receipt'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
