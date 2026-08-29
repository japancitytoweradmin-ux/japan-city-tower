import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Printer, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  Download,
  Building2,
  Loader2,
  Trash2,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { PaymentReceiptModal } from '../../components/receipts/PaymentReceiptModal';
import { PaymentEntryModal } from '../../components/payments/PaymentEntryModal';
import { PaymentRecord, FlatUnit, Member, MonthlyBill, ExpenseItem } from '../../types';
import { samplePayments, sampleUnits, sampleMembers } from '../../data/mockData';
import { useToast } from '../../components/common/Toast';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { paymentService } from '../../services/paymentService';
import { flatService } from '../../services/flatService';
import { memberService } from '../../services/memberService';
import { billService } from '../../services/billService';
import { expenseService } from '../../services/expenseService';

export const CollectionsPage: React.FC = () => {
  const { showToast } = useToast();
  const { billingPeriodId, periodLabel, selectedYear, selectedMonth } = useBillingPeriod();
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [flats, setFlats] = useState<FlatUnit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('ALL');
  const [selectedFlatFilter, setSelectedFlatFilter] = useState<string>('ALL');

  // Modals
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentRecord | null>(null);
  
  // Delete confirmation
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    const unsubPay = paymentService.subscribeToPayments((loaded) => {
      setPayments(loaded);
      setIsLoading(false);
    }, billingPeriodId);

    const unsubFlats = flatService.subscribeToFlats((loaded) => {
      setFlats(loaded);
    });

    const unsubMembers = memberService.subscribeToMembers((loaded) => {
      setMembers(loaded);
    });

    const unsubBills = billService.subscribeToBills((loaded) => {
      setBills(loaded);
    }, billingPeriodId);

    const unsubExp = expenseService.subscribeToExpenses((loaded) => {
      setExpenses(loaded);
    }, billingPeriodId);

    return () => {
      unsubPay();
      unsubFlats();
      unsubMembers();
      unsubBills();
      unsubExp();
    };
  }, [billingPeriodId]);

  // Compute payments for current period
  const periodPayments = payments.filter(
    (p) => (p.billingPeriodId || p.month) === billingPeriodId
  );
  const activePayments = periodPayments;

  // Summary Metrics
  const totalCollected = activePayments.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
  
  const currentBill = bills.find((b) => (b.billingPeriodId || b.month) === billingPeriodId);
  const periodExpenses = expenses.filter((e) => (e.billingPeriodId || e.month) === billingPeriodId);
  const totalPeriodExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const isMasterCleared = typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true';
  const totalFlatsCount = isMasterCleared ? flats.length : (flats.length || 28);

  let totalBaseBillTarget = 0;
  if (currentBill) {
    totalBaseBillTarget = currentBill.totalExpense || ((currentBill.finalPerFlatAmount || currentBill.perFlatAmount || 1997) * totalFlatsCount);
  } else if (periodExpenses.length > 0) {
    totalBaseBillTarget = totalPeriodExpense;
  } else if (activePayments.length > 0) {
    totalBaseBillTarget = totalFlatsCount * 1997;
  } else {
    totalBaseBillTarget = 0;
  }

  const totalRemainingDue = Math.max(0, totalBaseBillTarget - totalCollected);

  // Filtered Payments
  const filteredPayments = activePayments.filter((p) => {
    const matchesSearch =
      p.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.flatUnitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.transactionRef && p.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMethod = selectedMethod === 'ALL' || p.paymentMethod === selectedMethod;
    const matchesStatus = selectedStatusFilter === 'ALL' || p.status === selectedStatusFilter;
    const matchesMember = selectedMemberFilter === 'ALL' || p.memberId === selectedMemberFilter;
    const matchesFlat = selectedFlatFilter === 'ALL' || p.flatUnitNumber === selectedFlatFilter;

    return matchesSearch && matchesMethod && matchesStatus && matchesMember && matchesFlat;
  });

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    setIsDeleting(true);
    try {
      await paymentService.deletePayment(paymentToDelete.id, paymentToDelete.flatUnitNumber);
      showToast(
        isBangla ? 'পেমেন্ট রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে' : 'Payment record deleted successfully',
        'success'
      );
      setPaymentToDelete(null);
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Failed to delete payment'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.collections.title}
        subtitle={`${t.collections.subtitle} • ${periodLabel}`}
        actionButton={
          <button
            type="button"
            onClick={() => setIsEntryModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {t.collections.receivePayment}
          </button>
        }
      />

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{periodLabel} {isBangla ? 'আদায়কৃত বিল' : 'Collected'}</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalCollected)}</p>
          <span className="text-[11px] text-slate-400 font-semibold">{formatNumber(activePayments.length)} {isBangla ? 'টি পেমেন্ট ট্রানজেকশন' : 'Transactions Recorded'}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{isBangla ? 'মাসিক লক্ষ্যমাত্রা (Base Bill)' : 'Monthly Target'}</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalBaseBillTarget)}
          </p>
          <span className="text-[11px] text-slate-400 font-semibold">
            {totalBaseBillTarget > 0 
              ? (isBangla ? '২৮টি ফ্ল্যাটের মোট বিল' : '28 Total Flats Target') 
              : (isBangla ? 'কোনো একটিভ বিল নেই (ডেমো ডাটা ক্লিয়ার)' : 'No active bills recorded')}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{isBangla ? 'অবশিষ্ট বকেয়া' : 'Total Remaining Due'}</span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalRemainingDue)}
          </p>
          <span className="text-[11px] text-slate-400 font-semibold">{isBangla ? 'এই পিরিয়ডের পাওনা' : 'Outstanding for this period'}</span>
        </div>
      </div>

      {/* Search & Multi-Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBangla ? 'রসিদ নম্বর, সদস্য বা ফ্ল্যাট নম্বর...' : 'Search receipt, member, flat...'}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Member Filter */}
          <div>
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl font-bold focus:outline-hidden"
            >
              <option value="ALL">{isBangla ? 'সকল সদস্য (All Members)' : 'All Members'}</option>
              {members.map(m => (
                <option key={m.memberId} value={m.memberId}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Flat Filter */}
          <div>
            <select
              value={selectedFlatFilter}
              onChange={(e) => setSelectedFlatFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl font-bold focus:outline-hidden"
            >
              <option value="ALL">{isBangla ? 'সকল ফ্ল্যাট (All Flats)' : 'All Flats'}</option>
              {flats.map(f => (
                <option key={f.unitNumber} value={f.unitNumber}>{isBangla ? `ফ্ল্যাট ${f.unitNumber}` : `Unit ${f.unitNumber}`}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl font-bold focus:outline-hidden"
            >
              <option value="ALL">{isBangla ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
              <option value="PAID">{isBangla ? 'পরিশোধিত (PAID)' : 'PAID'}</option>
              <option value="PARTIAL">{isBangla ? 'আংশিক (PARTIAL)' : 'PARTIAL'}</option>
              <option value="DUE">{isBangla ? 'বকেয়া (DUE)' : 'DUE'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collection / Payment History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs font-bold">{isBangla ? 'ফায়ারবেস কালেকশন তথ্য লোড হচ্ছে...' : 'Loading collection data...'}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Coins className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {isBangla ? 'এই ফিল্টারে কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি' : 'No payment records found'}
            </p>
            <p className="text-xs text-slate-400">
              {isBangla ? 'নতুন টাকা জমা এন্ট্রি করতে উপরে "টাকা জমা এন্ট্রি করুন" বাটনে ক্লিক করুন।' : 'Click "+ Record Payment" to enter a payment.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">{isBangla ? 'রসিদ নম্বর' : 'Receipt No'}</th>
                  <th className="p-3.5">{isBangla ? 'তারিখ' : 'Date'}</th>
                  <th className="p-3.5">{isBangla ? 'ফ্ল্যাট' : 'Flat'}</th>
                  <th className="p-3.5">{isBangla ? 'সদস্যের নাম' : 'Member'}</th>
                  <th className="p-3.5">{isBangla ? 'বিলিং পিরিয়ড' : 'Period'}</th>
                  <th className="p-3.5 text-right">{isBangla ? 'বিল (৳)' : 'Bill (৳)'}</th>
                  <th className="p-3.5 text-right">{isBangla ? 'জমা (৳)' : 'Paid (৳)'}</th>
                  <th className="p-3.5 text-right">{isBangla ? 'বকেয়া (৳)' : 'Due (৳)'}</th>
                  <th className="p-3.5 text-center">{isBangla ? 'মাধ্যম' : 'Method'}</th>
                  <th className="p-3.5 text-center">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="p-3.5 text-center">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map((p) => {
                  const billAmt = p.billAmount ?? 1997;
                  const paidAmt = p.paidAmount ?? 0;
                  const dueAmt = p.currentDue ?? p.dueAmount ?? Math.max(0, billAmt + (p.previousDue || 0) - paidAmt);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-slate-900 dark:text-white">{p.receiptNumber}</span>
                          {p.isDemo && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bengali">
                              ডেমো
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.paymentDate}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold font-mono rounded-md text-xs">
                          {p.flatUnitNumber}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{p.memberName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">ID: {p.memberId}</p>
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-mono">{p.billingPeriodId || p.month}</td>
                      <td className="p-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(billAmt)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(paidAmt)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(dueAmt)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-semibold">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          p.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          p.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptPayment(p)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title={isBangla ? 'রসিদ প্রিন্ট/দেখুন' : 'View Receipt'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setPaymentToDelete(p)}
                            className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title={isBangla ? 'পেমেন্ট মুছে ফেলুন' : 'Delete Payment'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Entry Modal */}
      <PaymentEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onPaymentSuccess={(newPay) => {
          setSelectedReceiptPayment(newPay);
        }}
      />

      {/* Delete Confirmation Modal */}
      {paymentToDelete && (
        <Modal
          isOpen={Boolean(paymentToDelete)}
          onClose={() => setPaymentToDelete(null)}
          title={isBangla ? "পেমেন্ট রেকর্ড মুছে ফেলুন" : "Delete Payment Record"}
          maxWidth="sm"
        >
          <div className="space-y-4 font-bengali text-slate-900">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-extrabold text-rose-900">{isBangla ? 'স্থায়ীভাবে মুছতে বা আর্কাইভ করতে চান?' : 'Confirm Deletion / Archive?'}</p>
                <p className="text-rose-700 mt-1 leading-relaxed">
                  {isBangla 
                    ? `রসিদ নং ${paymentToDelete.receiptNumber} (ফ্ল্যাট ${paymentToDelete.flatUnitNumber} - ৳${paymentToDelete.paidAmount})। এই পেমেন্টটি আর্কাইভ বা মুছে ফেললে সংশ্লিষ্ট বকেয়া হিসাব পুনরায় গণনা হতে পারে। আপনি কি নিশ্চিত?`
                    : `Receipt ${paymentToDelete.receiptNumber} (Flat ${paymentToDelete.flatUnitNumber} - ৳${paymentToDelete.paidAmount}). Archiving/deleting this payment may recalculate the outstanding dues. Are you sure?`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isBangla ? 'হ্যাঁ, ডিলিট করুন' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={Boolean(selectedReceiptPayment)}
        onClose={() => setSelectedReceiptPayment(null)}
        payment={selectedReceiptPayment}
      />
    </div>
  );
};

