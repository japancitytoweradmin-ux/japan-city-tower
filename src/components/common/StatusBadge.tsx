import React from 'react';
import { PaymentStatus, UnitStatus, BillStatus } from '../../types';

interface StatusBadgeProps {
  status: PaymentStatus | UnitStatus | BillStatus | 'VERIFIED' | 'PENDING' | 'MISSING_VOUCHER' | 'URGENT' | 'NORMAL' | 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let defaultLabel = label;

  switch (status) {
    case 'PAID':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      defaultLabel = defaultLabel || 'পরিশোধিত';
      break;
    case 'PARTIAL':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      defaultLabel = defaultLabel || 'আংশিক জমা';
      break;
    case 'DUE':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      defaultLabel = defaultLabel || 'বকেয়া';
      break;
    case 'OVERDUE':
      colorClasses = 'bg-red-100 text-red-800 border-red-300 font-semibold';
      defaultLabel = defaultLabel || 'বকেয়া অনাদায়ী';
      break;
    case 'ACTIVE':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      defaultLabel = defaultLabel || 'সক্রিয়';
      break;
    case 'INACTIVE':
      colorClasses = 'bg-slate-100 text-slate-500 border-slate-200';
      defaultLabel = defaultLabel || 'নিষ্ক্রিয়';
      break;
    case 'DRAFT':
      colorClasses = 'bg-zinc-100 text-zinc-700 border-zinc-200';
      defaultLabel = defaultLabel || 'খসড়া (Draft)';
      break;
    case 'PUBLISHED':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      defaultLabel = defaultLabel || 'প্রকাশিত';
      break;
    case 'CLOSED':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      defaultLabel = defaultLabel || 'বন্ধ';
      break;
    case 'VERIFIED':
      colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
      defaultLabel = defaultLabel || 'যাচাইকৃত';
      break;
    case 'MISSING_VOUCHER':
      colorClasses = 'bg-amber-100 text-amber-800 border-amber-300 font-medium animate-pulse';
      defaultLabel = defaultLabel || '⚠ ভাউচার নেই';
      break;
    case 'URGENT':
      colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 font-semibold';
      defaultLabel = defaultLabel || 'জরুরি';
      break;
    case 'INFORMATIONAL':
      colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
      defaultLabel = defaultLabel || 'তথ্যমূলক';
      break;
    case 'NORMAL':
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      defaultLabel = defaultLabel || 'সাধারণ';
      break;
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs font-medium px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border whitespace-nowrap ${sizeClasses} ${colorClasses}`}
    >
      {defaultLabel}
    </span>
  );
};
