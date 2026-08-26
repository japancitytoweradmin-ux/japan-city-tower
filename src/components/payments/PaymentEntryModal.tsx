import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  User, 
  Home, 
  Calendar, 
  Calculator, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  FileText
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Member, FlatUnit, PaymentRecord, PaymentMethodType } from '../../types';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';
import { paymentService } from '../../services/paymentService';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../common/Toast';
import { formatTaka } from '../../utils/formatters';

interface PaymentEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (payment: PaymentRecord) => void;
  initialFlatUnit?: string;
}

export const PaymentEntryModal: React.FC<PaymentEntryModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  initialFlatUnit,
}) => {
  const { currentPeriod, activeYear, activeMonth } = useBillingPeriod();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const isBn = language === 'bn';

  // Data states
  const [members, setMembers] = useState<Member[]>([]);
  const [flats, setFlats] = useState<FlatUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedFlatUnit, setSelectedFlatUnit] = useState<string>('');
  const [billingYear, setBillingYear] = useState<number>(activeYear || 2026);
  const [billingMonth, setBillingMonth] = useState<number>(activeMonth || 8);
  const [billAmount, setBillAmount] = useState<number>(1997);
  const [previousDue, setPreviousDue] = useState<number>(0);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('1997');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [collectedBy, setCollectedBy] = useState<string>('Admin / Manager');

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load members and flats
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        memberService.getAllMembers(),
        flatService.getAllFlats()
      ]).then(([mList, fList]) => {
        setMembers(mList);
        setFlats(fList);

        if (initialFlatUnit) {
          const matchFlat = fList.find(f => f.unitNumber === initialFlatUnit);
          if (matchFlat) {
            setSelectedFlatUnit(matchFlat.unitNumber);
            if (matchFlat.memberId && matchFlat.memberId !== 'UNASSIGNED') {
              setSelectedMemberId(matchFlat.memberId);
            }
          }
        } else if (mList.length > 0 && !selectedMemberId) {
          // Select default first member
          const firstMember = mList[0];
          setSelectedMemberId(firstMember.memberId);
          if (firstMember.flatUnitNumbers && firstMember.flatUnitNumbers.length > 0) {
            setSelectedFlatUnit(firstMember.flatUnitNumbers[0]);
          }
        }
      }).catch(err => {
        console.error('Error initializing payment form data:', err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, initialFlatUnit]);

  // Sync year and month with selected period
  useEffect(() => {
    if (activeYear) setBillingYear(activeYear);
    if (activeMonth) setBillingMonth(activeMonth);
  }, [activeYear, activeMonth]);

  // When Member changes, update available flats
  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
    setErrorMessage(null);
    const member = members.find(m => m.memberId === memberId);
    if (member && member.flatUnitNumbers && member.flatUnitNumbers.length > 0) {
      setSelectedFlatUnit(member.flatUnitNumbers[0]);
    } else {
      // Find flat assigned to this member in master flats
      const memberFlats = flats.filter(f => f.memberId === memberId);
      if (memberFlats.length > 0) {
        setSelectedFlatUnit(memberFlats[0].unitNumber);
      } else {
        setSelectedFlatUnit('');
      }
    }
  };

  // When Flat changes, update previous due and base bill
  useEffect(() => {
    if (selectedFlatUnit) {
      const matchFlat = flats.find(f => f.unitNumber === selectedFlatUnit);
      if (matchFlat) {
        setBillAmount(matchFlat.monthlyBaseBill || 1997);
        setPreviousDue(matchFlat.currentDue || 0);
      } else {
        setBillAmount(1997);
        setPreviousDue(0);
      }
    }
  }, [selectedFlatUnit, flats]);

  // Filter flats for selected member
  const selectedMember = members.find(m => m.memberId === selectedMemberId);
  const memberFlats = flats.filter(f => {
    if (!selectedMemberId) return true;
    if (selectedMember && selectedMember.flatUnitNumbers) {
      return selectedMember.flatUnitNumbers.includes(f.unitNumber);
    }
    return f.memberId === selectedMemberId;
  });

  // Numbers parsing & Auto calculation
  const parsedPaid = parseFloat(paidAmountInput) || 0;
  const totalPayable = billAmount + previousDue;
  const currentDue = Math.max(0, totalPayable - parsedPaid);

  let statusTag: 'PAID' | 'PARTIAL' | 'DUE' = 'DUE';
  if (currentDue === 0 && (parsedPaid > 0 || totalPayable === 0)) {
    statusTag = 'PAID';
  } else if (parsedPaid > 0 && currentDue > 0) {
    statusTag = 'PARTIAL';
  } else {
    statusTag = 'DUE';
  }

  // Validate on input change
  const handlePaidAmountChange = (val: string) => {
    setPaidAmountInput(val);
    const amount = parseFloat(val) || 0;
    
    if (val !== '' && amount < 0) {
      setErrorMessage(isBn ? 'টাকার পরিমাণ সঠিক নয়।' : 'Invalid payment amount.');
    } else if (amount > totalPayable) {
      setErrorMessage(isBn ? 'পেমেন্টের পরিমাণ বিলের চেয়ে বেশি।' : 'Payment amount exceeds the bill.');
    } else {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMemberId) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে সদস্য নির্বাচন করুন' : 'Please select a member');
      return;
    }
    if (!selectedFlatUnit) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে ফ্ল্যাট/ইউনিট নির্বাচন করুন' : 'Please select a flat/unit');
      return;
    }

    if (parsedPaid < 0) {
      setErrorMessage(isBn ? 'টাকার পরিমাণ সঠিক নয়।' : 'Invalid payment amount.');
      return;
    }

    if (parsedPaid > totalPayable) {
      setErrorMessage(isBn ? 'পেমেন্টের পরিমাণ বিলের চেয়ে বেশি।' : 'Payment amount exceeds the bill.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const billingPeriodId = `${billingYear}-${String(billingMonth).padStart(2, '0')}`;
      
      const createdPayment = await paymentService.addPayment({
        memberId: selectedMemberId,
        memberName: selectedMember ? selectedMember.name : 'Unknown Member',
        flatUnitNumber: selectedFlatUnit,
        flatId: selectedFlatUnit,
        billingYear,
        billingMonth,
        billingPeriodId,
        month: billingPeriodId,
        monthBangla: `${billingPeriodId}`,
        billAmount,
        previousDue,
        paidAmount: parsedPaid,
        currentDue,
        dueAmount: currentDue,
        paymentDate,
        paymentMethod,
        transactionRef,
        remarks,
        notes: remarks,
        collectedBy: collectedBy || 'Admin',
        status: statusTag
      });

      showToast(
        isBn 
          ? `পেমেন্ট সফলভাবে গৃহীত হয়েছে (রসিদ নং: ${createdPayment.receiptNumber})` 
          : `Payment recorded successfully (Receipt: ${createdPayment.receiptNumber})`, 
        'success'
      );

      onPaymentSuccess(createdPayment);
      onClose();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setErrorMessage(err.message || (isBn ? 'পেমেন্ট সংরক্ষণ করতে ব্যর্থ হয়েছে' : 'Failed to record payment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? "টাকা জমা / Payment Entry" : "Record Payment Entry"}
      subtitle={isBn ? "সদস্যের বিল গ্রহণ ও ডিজিটাল মানি রসিদ তৈরি" : "Collect member dues and generate money receipt"}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 font-bengali text-slate-900">
        
        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-bold shadow-xs animate-shake">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Member & Flat Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-600" />
              {isBn ? 'সদস্য নির্বাচন (Member)' : 'Select Member'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">{isBn ? '-- সদস্য বেছে নিন --' : '-- Select Member --'}</option>
              {members.map((m) => (
                <option key={m.id || m.memberId} value={m.memberId}>
                  {m.name} ({m.memberId}) {m.flatUnitNumbers && m.flatUnitNumbers.length > 1 ? `[${m.flatUnitNumbers.length} Flats]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Flat Unit Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-slate-600" />
              {isBn ? 'ফ্ল্যাট / ইউনিট (Flat Unit)' : 'Select Flat Unit'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedFlatUnit}
              onChange={(e) => setSelectedFlatUnit(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">{isBn ? '-- ফ্ল্যাট নির্বাচন করুন --' : '-- Select Flat Unit --'}</option>
              {memberFlats.map((f) => (
                <option key={f.unitNumber} value={f.unitNumber}>
                  {isBn ? `ফ্ল্যাট ${f.unitNumber}` : `Unit ${f.unitNumber}`} (বিল: ৳{f.monthlyBaseBill || 1997})
                </option>
              ))}
            </select>
            {selectedMember && selectedMember.flatUnitNumbers && selectedMember.flatUnitNumbers.length > 1 && (
              <p className="text-[11px] text-amber-700 font-medium mt-1">
                ℹ️ {isBn ? `এই সদস্যের ${selectedMember.flatUnitNumbers.length}টি আলাদা ফ্ল্যাট রয়েছে। নির্ধারিত ফ্ল্যাটটি নির্বাচন করুন।` : `Member owns ${selectedMember.flatUnitNumbers.length} flats. Select target flat.`}
              </p>
            )}
          </div>
        </div>

        {/* Billing Period & Payment Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isBn ? 'বিলিং বছর (Year)' : 'Billing Year'}
            </label>
            <input
              type="number"
              value={billingYear}
              onChange={(e) => setBillingYear(parseInt(e.target.value) || 2026)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              min={2020}
              max={2035}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isBn ? 'বিলিং মাস (Month)' : 'Billing Month'}
            </label>
            <select
              value={billingMonth}
              onChange={(e) => setBillingMonth(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              required
            >
              {[
                { m: 1, nameBn: 'জানুয়ারি', nameEn: 'January' },
                { m: 2, nameBn: 'ফেব্রুয়ারি', nameEn: 'February' },
                { m: 3, nameBn: 'মার্চ', nameEn: 'March' },
                { m: 4, nameBn: 'এপ্রিল', nameEn: 'April' },
                { m: 5, nameBn: 'মে', nameEn: 'May' },
                { m: 6, nameBn: 'জুন', nameEn: 'June' },
                { m: 7, nameBn: 'জুলাই', nameEn: 'July' },
                { m: 8, nameBn: 'আগস্ট', nameEn: 'August' },
                { m: 9, nameBn: 'সেপ্টেম্বর', nameEn: 'September' },
                { m: 10, nameBn: 'অক্টোবর', nameEn: 'October' },
                { m: 11, nameBn: 'নভেম্বর', nameEn: 'November' },
                { m: 12, nameBn: 'ডিসেম্বর', nameEn: 'December' },
              ].map(item => (
                <option key={item.m} value={item.m}>
                  {isBn ? item.nameBn : item.nameEn} ({String(item.m).padStart(2, '0')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {isBn ? 'পরিশোধের তারিখ (Date)' : 'Payment Date'}
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              required
            />
          </div>
        </div>

        {/* Automatic Calculation Table */}
        <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="w-4 h-4 text-amber-400" />
              {isBn ? 'স্বয়ংক্রিয় পাওনা ও বকেয়া হিসাব' : 'Auto Due Calculation Engine'}
            </span>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
              statusTag === 'PAID' ? 'bg-emerald-500 text-white' : statusTag === 'PARTIAL' ? 'bg-amber-500 text-slate-900' : 'bg-rose-500 text-white'
            }`}>
              {statusTag}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">{isBn ? 'বর্তমান মাসের বিল:' : 'Current Bill:'}</span>
              <p className="text-base font-extrabold text-white">{formatTaka(billAmount)}</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{isBn ? 'পূর্বের বকেয়া:' : 'Previous Due:'}</span>
              <p className="text-base font-extrabold text-amber-300">{formatTaka(previousDue)}</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{isBn ? 'মোট দাবিকৃত পাওনা:' : 'Total Payable:'}</span>
              <p className="text-base font-black text-amber-400">{formatTaka(totalPayable)}</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{isBn ? 'জমার পর অবশিষ্ট বকেয়া:' : 'Remaining Due:'}</span>
              <p className={`text-base font-black ${currentDue === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatTaka(currentDue)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Amount Input & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {isBn ? 'জমার পরিমাণ / Paid Amount (৳)' : 'Paid Amount (৳)'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">৳</span>
              <input
                type="number"
                value={paidAmountInput}
                onChange={(e) => handlePaidAmountChange(e.target.value)}
                placeholder="1997"
                className={`w-full pl-8 pr-3 py-2 bg-white border rounded-xl font-bold text-base focus:outline-hidden focus:ring-2 ${
                  errorMessage ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-emerald-500'
                }`}
                min={0}
                step="any"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {isBn ? 'পরিশোধের মাধ্যম (Payment Method)' : 'Payment Method'}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Cash">{isBn ? 'Cash (ক্যাশ)' : 'Cash'}</option>
              <option value="Bank">{isBn ? 'Bank (ব্যাংক ট্রান্সফার / চেক)' : 'Bank Transfer / Cheque'}</option>
              <option value="Other">{isBn ? 'Other (অন্যান্য)' : 'Other'}</option>
            </select>
          </div>
        </div>

        {/* Transaction Reference & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isBn ? 'ট্রানজেকশন আইডি / মেমো (Optional)' : 'Transaction / Cheque Ref (Optional)'}
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. TRX-98765 / Cheque #1029"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isBn ? 'আদায়কারী / গ্রহীতার নাম' : 'Collector Name'}
            </label>
            <input
              type="text"
              value={collectedBy}
              onChange={(e) => setCollectedBy(e.target.value)}
              placeholder="Admin / Manager"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>
        </div>

        {/* Remarks Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {isBn ? 'মন্তব্য ও রিমার্কস (Remarks)' : 'Remarks / Notes'}
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={isBn ? "e.g. আগস্ট মাসের কমন বিল পরিশোধ" : "e.g. August bill payment"}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            type="submit"
            disabled={saving || !!errorMessage}
            className={`px-6 py-2.5 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              saving || errorMessage 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
            }`}
          >
            {saving ? (
              <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isBn ? 'পেমেন্ট জমা দিন ও রসিদ তৈরি করুন' : 'Submit & Generate Receipt'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
