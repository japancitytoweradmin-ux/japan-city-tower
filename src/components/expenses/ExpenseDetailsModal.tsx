import React from 'react';
import { 
  Calendar, 
  CreditCard, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  User, 
  Clock, 
  Hash, 
  FileCheck 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ExpenseItem, VoucherAttachment } from '../../types';
import { formatTaka, formatBytes, getCategoryBadgeColor } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseItem | null;
  onEdit: (expense: ExpenseItem) => void;
  onDelete: (expense: ExpenseItem) => void;
  onPreviewVoucher: (voucher: VoucherAttachment, title: string) => void;
  onOpenUploadVoucher?: (expense: ExpenseItem) => void;
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  isOpen,
  onClose,
  expense,
  onEdit,
  onDelete,
  onPreviewVoucher,
  onOpenUploadVoucher,
}) => {
  if (!expense) return null;

  const categoryColors = getCategoryBadgeColor(expense.category);
  const hasVoucher = Boolean(expense.voucher);
  const isPdf = expense.voucher?.fileType === 'application/pdf' || expense.voucher?.fileName.endsWith('.pdf');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="খরচের বিস্তারিত বিবরণ"
      subtitle={expense.title}
      maxWidth="2xl"
    >
      <div className="space-y-5 font-bengali">
        {/* Top Header Card */}
        <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg border mb-2 ${categoryColors.bg} ${categoryColors.text} ${categoryColors.border}`}>
              {expense.categoryNameBangla}
            </span>
            <h2 className="text-xl font-bold">{expense.title}</h2>
            <p className="text-xs text-slate-400 mt-1">{expense.monthNameBangla} মাসের খরচ হিসাব</p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">টাকার পরিমাণ</p>
            <p className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {formatTaka(expense.amount)}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> খরচের তারিখ
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">{expense.date}</p>
          </div>

          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" /> পরিশোধ পদ্ধতি
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">{expense.paymentMethod}</p>
          </div>

          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" /> ভাউচার / মেমো নং
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {expense.voucherNumber || 'প্রযোজ্য নয়'}
            </p>
          </div>

          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> এন্ট্রি করেছেন
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">{expense.createdBy}</p>
          </div>

          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> এন্ট্রি তারিখ
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">{expense.createdAt}</p>
          </div>

          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> ভেরিফিকেশন স্ট্যাটাস
            </p>
            <div className="mt-0.5">
              <StatusBadge status={expense.status} />
            </div>
          </div>
        </div>

        {/* Description & Comments */}
        {expense.description && (
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              বিস্তারিত বিবরণ
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">{expense.description}</p>
          </div>
        )}

        {expense.comments && (
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-xs">
            <h4 className="font-bold text-amber-800 mb-1">মন্তব্য:</h4>
            <p className="text-slate-700">{expense.comments}</p>
          </div>
        )}

        {/* VOUCHER PREVIEW SECTION */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            সংযুক্ত ভাউচার / বিল রশিদ
          </h4>

          {hasVoucher && expense.voucher ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPdf ? (
                    <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 shrink-0">
                      <img 
                        src={expense.voucher.previewUrl} 
                        alt={expense.voucher.fileName}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-800 truncate">{expense.voucher.fileName}</p>
                    <p className="text-xs text-slate-500">{formatBytes(expense.voucher.fileSize)} • {expense.voucher.uploadedAt}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPreviewVoucher(expense.voucher!, expense.title)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  ফুলস্ক্রিন দেখুন
                </button>
              </div>

              {!isPdf && expense.voucher.previewUrl && (
                <div 
                  onClick={() => onPreviewVoucher(expense.voucher!, expense.title)}
                  className="cursor-pointer max-h-60 rounded-lg overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center hover:opacity-95 transition-opacity"
                >
                  <img
                    src={expense.voucher.previewUrl}
                    alt={expense.voucher.fileName}
                    className="max-h-56 object-contain"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>এই খরচের কোনো ভাউচার সংযুক্ত নেই</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                + ভাউচার যোগ করুন
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(expense);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Edit className="w-4 h-4" />
              সম্পাদনা
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(expense);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              মুছে ফেলুন
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </Modal>
  );
};
