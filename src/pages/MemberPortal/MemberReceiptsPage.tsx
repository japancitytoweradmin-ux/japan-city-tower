import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Eye, 
  Printer, 
  Download, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2,
  Coins
} from 'lucide-react';
import { UserProfile, PaymentRecord, Member, FlatUnit } from '../../types';
import { samplePayments, sampleMembers, sampleUnits } from '../../data/mockData';
import { PageHeader } from '../../components/common/PageHeader';
import { useTranslation } from '../../i18n/LanguageContext';
import { paymentService } from '../../services/paymentService';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';

interface MemberReceiptsPageProps {
  currentUser: UserProfile;
  onViewReceipt: (payment: PaymentRecord) => void;
}

export const MemberReceiptsPage: React.FC<MemberReceiptsPageProps> = ({
  currentUser,
  onViewReceipt,
}) => {
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFlat, setSelectedFlat] = useState<string>('ALL');

  useEffect(() => {
    const targetMemberId = currentUser.memberId || 'JCT-006';
    const unsubPay = paymentService.subscribeToMemberPayments(
      targetMemberId,
      (loaded) => setPayments(loaded),
      undefined,
      currentUser.flatUnits
    );
    const unsubMem = memberService.subscribeToMembers((loaded) => setMembers(loaded));
    const unsubFlats = flatService.subscribeToFlats((loaded) => setFlats(loaded));

    return () => {
      unsubPay();
      unsubMem();
      unsubFlats();
    };
  }, [currentUser.memberId, currentUser.flatUnits]);

  const member: Member = members.find(
    (m) => (m.memberId && currentUser.memberId && m.memberId.toUpperCase() === currentUser.memberId.toUpperCase()) || 
           (currentUser.flatUnits && (m.flatUnitNumbers || []).some(f => currentUser.flatUnits?.includes(f))) ||
           m.id === currentUser.id
  ) || {
    id: currentUser.id || 'usr-member',
    memberId: currentUser.memberId || (currentUser.flatUnits && currentUser.flatUnits[0]) || 'JCT-001',
    name: currentUser.name || 'সদস্য',
    banglaName: currentUser.banglaName || currentUser.name || 'সদস্য',
    email: currentUser.email || 'member@japancitytower.com',
    phone: currentUser.phone || '০১৭১১-০০০০০০',
    memberType: 'FLAT_OWNER',
    memberTypeBangla: 'ফ্ল্যাট মালিক',
    flatUnitNumbers: currentUser.flatUnits || ['2-A'],
    totalUnits: (currentUser.flatUnits || []).length || 1,
    status: 'ACTIVE'
  };

  const memberFlats = flats.filter((u) => 
    (member.flatUnitNumbers || []).includes(u.unitNumber) || 
    (currentUser.flatUnits || []).includes(u.unitNumber)
  );

  const filteredReceipts = payments.filter((p) => {
    if (selectedFlat !== 'ALL' && p.flatUnitNumber !== selectedFlat) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchReceipt = (p.receiptNumber || '').toLowerCase().includes(q);
      const matchMonth = (p.month || p.billingPeriodId || '').toLowerCase().includes(q);
      const matchFlat = (p.flatUnitNumber || '').toLowerCase().includes(q);
      if (!matchReceipt && !matchMonth && !matchFlat) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title={isBangla ? 'আমার অফিসিয়াল মানি রসিদ' : 'My Money Receipts'}
        subtitle={isBangla 
          ? 'বিল পরিশোধের বিপরীতে সিস্টেম-জেনারেটেড বৈধ অফিসিয়াল মানি রসিদ সংগ্রহ ও প্রিন্ট করুন' 
          : 'View and print verified official money receipts issued against your payments'}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isBangla ? 'রসিদ নম্বর দিয়ে খুঁজুন...' : 'Search by receipt number...'}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedFlat}
            onChange={(e) => setSelectedFlat(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          >
            <option value="ALL">{isBangla ? 'সকল ফ্ল্যাটের রসিদ' : 'All Flats'}</option>
            {memberFlats.map(f => (
              <option key={f.unitNumber} value={f.unitNumber}>
                {isBangla ? 'ফ্ল্যাট' : 'Flat'} {f.unitNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Receipts Grid */}
      {filteredReceipts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs shadow-xs">
          {t.memberPortal?.noReceiptsFound || (isBangla ? 'কোনো মানি রসিদ পাওয়া যায়নি।' : 'No money receipts found.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all shadow-xs p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header of Receipt Card */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                      {isBangla ? 'মানি রসিদ' : 'Official Receipt'}
                    </span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {receipt.receiptNumber}
                    </h4>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{isBangla ? 'তারিখ:' : 'Date:'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{receipt.paymentDate}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{t.collections.flatNumber}:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {isBangla ? 'ফ্ল্যাট' : 'Flat'} {receipt.flatUnitNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{isBangla ? 'বিলিং মাস:' : 'Billing Month:'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {receipt.billingPeriodId || receipt.month}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>{isBangla ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{receipt.paymentMethod || 'Cash'}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl mt-2">
                    <span className="text-emerald-800 dark:text-emerald-300 font-semibold">{isBangla ? 'জমা পরিমাণ:' : 'Paid Amount:'}</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-base">
                      {formatCurrency(receipt.paidAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[11px] text-teal-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isBangla ? 'স্বীকৃত রসিদ' : 'Verified'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onViewReceipt(receipt)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                  <span>{isBangla ? 'রসিদ প্রিন্ট ও দেখুন' : 'View & Print'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
