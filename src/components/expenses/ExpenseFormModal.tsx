import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ExpenseItem, ExpenseCategory, PaymentMethod, VoucherAttachment } from '../../types';
import { VoucherUpload } from '../vouchers/VoucherUpload';
import { useToast } from '../common/Toast';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseData: Partial<ExpenseItem>) => void;
  initialData?: ExpenseItem | null;
  selectedMonth?: string;
  selectedMonthName?: string;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  selectedMonth = '2025-06',
  selectedMonthName = 'জুন ২০২৫',
}) => {
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('ELECTRICITY');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('2025-06-05');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [voucher, setVoucher] = useState<VoucherAttachment | null>(null);
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setCategory(initialData.category);
      setAmount(initialData.amount.toString());
      setDate(initialData.date);
      setDescription(initialData.description || '');
      setPaymentMethod(initialData.paymentMethod);
      setVoucherNumber(initialData.voucherNumber || '');
      setVoucher(initialData.voucher || null);
      setComments(initialData.comments || '');
    } else {
      // Default reset
      setTitle('');
      setCategory('ELECTRICITY');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setPaymentMethod('CASH');
      setVoucherNumber('');
      setVoucher(null);
      setComments('');
    }
  }, [initialData, isOpen]);

  const getCategoryNameBangla = (cat: ExpenseCategory): string => {
    switch (cat) {
      case 'ELECTRICITY': return 'বিদ্যুৎ বিল';
      case 'GUARD_SALARY': return 'দারোয়ানের বেতন';
      case 'LIFT_SERVICE': return 'লিফট সার্ভিস';
      case 'GARBAGE_CLEANING': return 'ময়লা পরিষ্কার';
      case 'STAIR_CLEANING': return 'সিঁড়ি পরিষ্কার / ঝাড়ু';
      case 'GENERATOR_DIESEL': return 'জেনারেটর ডিজেল';
      case 'DIESEL_TRANSPORT': return 'ডিজেল আনার রিকশা ভাড়া';
      case 'MAINTENANCE': return 'মেরামত ও রক্ষণাবেক্ষণ';
      default: return 'অন্যান্য / ম্যানুয়াল কাস্টম খরচ';
    }
  };

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as ExpenseCategory;
    setCategory(selected);
    if (selected !== 'OTHER' && (!title || title.length === 0 || initialData === null)) {
      setTitle(getCategoryNameBangla(selected));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('খরচের নাম বা বিবরণ প্রদান করুন', 'warning');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('সঠিক টাকার পরিমাণ প্রদান করুন', 'warning');
      return;
    }

    const expensePayload: Partial<ExpenseItem> = {
      title,
      category,
      categoryNameBangla: getCategoryNameBangla(category),
      amount: numAmount,
      date,
      month: selectedMonth,
      monthNameBangla: selectedMonthName,
      description,
      paymentMethod,
      voucherNumber,
      voucher,
      comments,
      status: voucher ? 'VERIFIED' : 'PENDING',
    };

    onSubmit(expensePayload);
    showToast(
      initialData ? 'খরচ সফলভাবে আপডেট হয়েছে' : 'নতুন খরচ ও ভাউচার সফলভাবে যুক্ত হয়েছে',
      'success'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'খরচের তথ্য সম্পাদনা' : 'নতুন খরচের হিসাব ও ভাউচার যোগ'}
      subtitle={`${selectedMonthName} মাসের খরচ`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-bengali">
        {/* Category & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              খরচের খাত (Category) <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={handleCategorySelect}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="ELECTRICITY">বিদ্যুৎ বিল (Electricity)</option>
              <option value="GUARD_SALARY">দারোয়ানের বেতন (Guard Salary)</option>
              <option value="LIFT_SERVICE">লিফট সার্ভিস (Lift Maintenance)</option>
              <option value="GARBAGE_CLEANING">ময়লা বিল / পরিষ্কার (Garbage)</option>
              <option value="STAIR_CLEANING">সিঁড়ি মুছা / ঝাড়ু বিল (Stair Cleaning)</option>
              <option value="GENERATOR_DIESEL">জেনারেটর ডিজেল (Generator Fuel)</option>
              <option value="DIESEL_TRANSPORT">ডিজেল আনার রিকশা ভাড়া (Transport)</option>
              <option value="MAINTENANCE">মেরামত ও রক্ষণাবেক্ষণ (Maintenance)</option>
              <option value="OTHER">✍️ অন্যান্য / নতুন কাস্টম খরচ (Type Custom)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              ড্রপডাউনে না থাকলে "অন্যান্য" নির্বাচন করে ডানে নিজের মতো লিখুন
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              খরচের নাম / শিরোনাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: ছাদ মেরামত, পানির মোটর পার্টস, ডেসকো বিল..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              যেকোনো নতুন খরচের নাম সরাসরি কিবোর্ড দিয়ে বাংলায় বা ইংরেজিতে লিখুন
            </p>
          </div>
        </div>

        {/* Amount, Date, Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              টাকার পরিমাণ (৳) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="যেমন: 23870"
              className="w-full px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              তারিখ <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              পরিশোধের মাধ্যম
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="CASH">ক্যাশ (নগদ)</option>
              <option value="BANK_TRANSFER">ব্যাংক ট্রান্সফার</option>
              <option value="BKASH">বিকাশ (bKash)</option>
              <option value="NAGAD">নগদ (Nagad)</option>
              <option value="CHEQUE">চেক</option>
            </select>
          </div>
        </div>

        {/* Voucher / Memo No & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ভাউচার / মেমো নম্বর
            </label>
            <input
              type="text"
              value={voucherNumber}
              onChange={(e) => setVoucherNumber(e.target.value)}
              placeholder="যেমন: DESCO-88392"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              খরচের বিবরণ
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="যেমন: মে মাসের কমন মিটার বিদ্যুৎ বিল পরিশোধ"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* MANDATORY INDIVIDUAL VOUCHER UPLOAD COMPONENT */}
        <div className="pt-2 border-t border-slate-100">
          <VoucherUpload
            expenseId={initialData?.id || `temp-${Date.now()}`}
            existingVoucher={voucher}
            onVoucherChange={setVoucher}
            label="খরচের নিজস্ব ভাউচার / বিল রশিদ (ছবি অথবা PDF)"
          />
        </div>

        {/* Comments */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            অতিরিক্ত মন্তব্য (যদি থাকে)
          </label>
          <textarea
            rows={2}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="যেমন: ম্যানেজার সাহেবের স্বাক্ষরিত কপি সংযুক্ত করা হয়েছে"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bengali"
          >
            বাতিল
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors font-bengali"
          >
            {initialData ? 'আপডেট করুন' : 'খরচ যুক্ত করুন'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
