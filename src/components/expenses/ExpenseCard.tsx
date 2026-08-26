import React, { useState } from 'react';
import { 
  Calendar, 
  CreditCard, 
  FileText, 
  Eye, 
  MoreVertical, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Image as ImageIcon 
} from 'lucide-react';
import { ExpenseItem, VoucherAttachment } from '../../types';
import { formatTaka, getCategoryBadgeColor } from '../../utils/formatters';
import { VoucherUpload } from '../vouchers/VoucherUpload';
import { useToast } from '../common/Toast';

interface ExpenseCardProps {
  expense: ExpenseItem;
  onViewDetails: (expense: ExpenseItem) => void;
  onEdit: (expense: ExpenseItem) => void;
  onDelete: (expense: ExpenseItem) => void;
  onVoucherUpdate: (expenseId: string, voucher: VoucherAttachment | null) => void;
  onPreviewVoucher: (voucher: VoucherAttachment, title: string) => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  onViewDetails,
  onEdit,
  onDelete,
  onVoucherUpdate,
  onPreviewVoucher,
}) => {
  const { showToast } = useToast();
  const [isQuickUploading, setIsQuickUploading] = useState(false);
  const categoryColors = getCategoryBadgeColor(expense.category);

  const hasVoucher = Boolean(expense.voucher);
  const isPdf = expense.voucher?.fileType === 'application/pdf' || expense.voucher?.fileName.endsWith('.pdf');

  const getPaymentMethodBangla = (method: string) => {
    switch (method) {
      case 'CASH': return 'ক্যাশ (নগদ)';
      case 'BKASH': return 'বিকাশ (bKash)';
      case 'NAGAD': return 'নগদ (Nagad)';
      case 'BANK_TRANSFER': return 'ব্যাংক ট্রান্সফার';
      case 'CHEQUE': return 'চেক';
      default: return method;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      {/* Card Header & Content */}
      <div className="p-5 space-y-4">
        {/* Category & Amount Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${categoryColors.bg} ${categoryColors.text} ${categoryColors.border} font-bengali`}>
              {expense.categoryNameBangla}
            </span>
            {expense.isDemo && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-bengali">
                ডেমো
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-bengali tracking-tight">
              {formatTaka(expense.amount)}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 
            onClick={() => onViewDetails(expense)}
            className="text-base font-bold text-slate-800 font-bengali hover:text-amber-700 cursor-pointer transition-colors"
          >
            {expense.title}
          </h3>
          {expense.description && (
            <p className="text-xs text-slate-500 font-bengali mt-1 line-clamp-2 leading-relaxed">
              {expense.description}
            </p>
          )}
        </div>

        {/* Date & Payment Method */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bengali pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {expense.date}
          </span>
          <span className="flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            {getPaymentMethodBangla(expense.paymentMethod)}
          </span>
        </div>

        {/* INDIVIDUAL VOUCHER ATTACHMENT SECTION */}
        <div className="pt-2">
          <div className="text-[11px] font-semibold text-slate-600 font-bengali uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>খরচের ভাউচার / বিল রশিদ:</span>
            {hasVoucher ? (
              <span className="text-teal-600 flex items-center gap-1 lowercase">
                <CheckCircle2 className="w-3.5 h-3.5" /> সংযুক্ত
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1 lowercase">
                <AlertTriangle className="w-3.5 h-3.5" /> মিসিং
              </span>
            )}
          </div>

          {/* If voucher exists */}
          {hasVoucher && expense.voucher && (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div 
                onClick={() => onPreviewVoucher(expense.voucher!, expense.title)}
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
              >
                {isPdf ? (
                  <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                ) : expense.voucher.previewUrl ? (
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 shrink-0">
                    <img 
                      src={expense.voucher.previewUrl} 
                      alt={expense.voucher.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate group-hover:text-amber-800 transition-colors">
                    {expense.voucher.fileName}
                  </p>
                  <p className="text-[10px] text-slate-400">ক্লিক করে দেখুন</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onPreviewVoucher(expense.voucher!, expense.title)}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-sky-700 text-xs font-medium rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 font-bengali"
                >
                  <Eye className="w-3.5 h-3.5" />
                  দেখুন
                </button>
              </div>
            </div>
          )}

          {/* If voucher is missing */}
          {!hasVoucher && !isQuickUploading && (
            <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold font-bengali">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ভাউচার সংযুক্ত করা হয়নি</span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickUploading(true)}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs font-bengali"
              >
                <Plus className="w-3.5 h-3.5" />
                + ভাউচার আপলোড করুন
              </button>
            </div>
          )}

          {/* Quick upload expandable form */}
          {!hasVoucher && isQuickUploading && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <VoucherUpload
                expenseId={expense.id}
                compact={true}
                onVoucherChange={(voucher) => {
                  onVoucherUpdate(expense.id, voucher);
                  setIsQuickUploading(false);
                }}
              />
              <button
                type="button"
                onClick={() => setIsQuickUploading(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-bengali block text-center w-full py-1"
              >
                বাতিল করুন
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs font-bengali">
        <button
          type="button"
          onClick={() => onViewDetails(expense)}
          className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1"
        >
          বিস্তারিত দেখুন &rarr;
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(expense)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="সম্পাদনা করুন"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(expense)}
            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
            title="মুছে ফেলুন"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
