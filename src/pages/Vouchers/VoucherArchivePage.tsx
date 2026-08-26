import React, { useState } from 'react';
import { 
  Archive, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Sparkles, 
  FolderArchive,
  Image as ImageIcon
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { VoucherPreviewModal } from '../../components/vouchers/VoucherPreviewModal';
import { ExpenseItem, VoucherAttachment } from '../../types';
import { expenseService } from '../../services/expenseService';
import { formatTaka, formatBytes, getCategoryBadgeColor } from '../../utils/formatters';
import { useToast } from '../../components/common/Toast';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { EmptyState } from '../../components/common/EmptyState';

export const VoucherArchivePage: React.FC = () => {
  const { showToast } = useToast();
  const { 
    selectedYear, 
    selectedMonth, 
    billingPeriodId, 
    setBillingPeriod, 
    availableYears, 
    periodLabel 
  } = useBillingPeriod();
  const { t, formatNumber, isBangla } = useTranslation();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedFileType, setSelectedFileType] = useState<'ALL' | 'IMAGE' | 'PDF'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Preview Modal
  const [previewVoucher, setPreviewVoucher] = useState<VoucherAttachment | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  React.useEffect(() => {
    const unsub = expenseService.subscribeToExpenses((loaded) => setExpenses(loaded), billingPeriodId);
    return () => unsub();
  }, [billingPeriodId]);

  // Extract all expenses with vouchers
  const expensesWithVouchers = expenses.filter(
    (e): e is ExpenseItem & { voucher: VoucherAttachment } => Boolean(e.voucher)
  );

  const filteredVouchers = expensesWithVouchers.filter((item) => {
    const v = item.voucher;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryNameBangla.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;

    const isPdf = v.fileType === 'application/pdf' || v.fileName.endsWith('.pdf');
    const matchesFileType =
      selectedFileType === 'ALL' ||
      (selectedFileType === 'PDF' && isPdf) ||
      (selectedFileType === 'IMAGE' && !isPdf);

    return matchesSearch && matchesCategory && matchesFileType;
  });

  const handleDownloadAllZip = () => {
    showToast(
      `${periodLabel} মাসের সকল (${filteredVouchers.length}টি) ভাউচার জিপ আর্কাইভ হিসেবে ডাউনলোড হচ্ছে`,
      'success'
    );
  };

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title="ভাউচার ও বিল আর্কাইভ"
        subtitle="টাওয়ারের সকল মাসের খরচের রসিদ, মেমো ও ভাউচারের কেন্দ্রীয় ডিজিটাল আর্কাইভ"
        actionButton={
          <button
            type="button"
            onClick={handleDownloadAllZip}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all"
          >
            <FolderArchive className="w-4 h-4 text-amber-400" />
            এক ক্লিকে সকল ভাউচার ডাউনলোড (ZIP)
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ভাউচারের নাম, ফাইল বা খাত খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500">{isBangla ? 'মাস:' : 'Month:'}</span>
            <select
              value={selectedMonth}
              onChange={(e) => setBillingPeriod(selectedYear, Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {t.period.months.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setBillingPeriod(Number(e.target.value), selectedMonth)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {formatNumber(yr)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">খাত:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">সকল খাত</option>
              <option value="ELECTRICITY">বিদ্যুৎ বিল</option>
              <option value="GUARD_SALARY">দারোয়ানের বেতন</option>
              <option value="LIFT_SERVICE">লিফট সার্ভিস</option>
              <option value="GENERATOR_DIESEL">জেনারেটর ডিজেল</option>
              <option value="STAIR_CLEANING">সিঁড়ি পরিষ্কার</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSelectedFileType('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold ${
                selectedFileType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              সব
            </button>
            <button
              type="button"
              onClick={() => setSelectedFileType('IMAGE')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${
                selectedFileType === 'IMAGE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <ImageIcon className="w-3 h-3" /> ছবি
            </button>
            <button
              type="button"
              onClick={() => setSelectedFileType('PDF')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${
                selectedFileType === 'PDF' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <FileText className="w-3 h-3" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Vouchers Grid */}
      {filteredVouchers.length === 0 ? (
        <EmptyState
          icon={FolderArchive}
          title={isBangla ? `${periodLabel} মাসের কোনো ডিজিটাল ভাউচার পাওয়া যায়নি` : `No digital vouchers found for ${periodLabel}`}
          description={isBangla ? 'অনুগ্রহ করে অন্য কোনো মাস নির্বাচন করুন অথবা নতুন খরচের রশিদ আপলোড করুন।' : 'Please select a different month or upload a new expense voucher.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVouchers.map((item) => {
            const v = item.voucher;
            const isPdf = v.fileType === 'application/pdf' || v.fileName.endsWith('.pdf');
            const catColors = getCategoryBadgeColor(item.category);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between"
              >
                {/* Preview Thumbnail */}
                <div
                  onClick={() => {
                    setPreviewVoucher(v);
                    setPreviewTitle(item.title);
                  }}
                  className="relative h-44 bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center"
                >
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                        <FileText className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-semibold">PDF ডকুমেন্ট</span>
                    </div>
                  ) : (
                    <img
                      src={v.previewUrl}
                      alt={v.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Overlay hover eye button */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      ফুলস্ক্রিন দেখুন
                    </span>
                  </div>
                </div>

                {/* Card Meta Info */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catColors.bg} ${catColors.text} ${catColors.border}`}>
                        {item.categoryNameBangla}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {formatTaka(item.amount)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate" title={item.title}>
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">{v.fileName}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatBytes(v.fileSize)}</span>
                    <span>{v.uploadedAt}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VoucherPreviewModal
        isOpen={Boolean(previewVoucher)}
        onClose={() => setPreviewVoucher(null)}
        voucher={previewVoucher}
        expenseTitle={previewTitle}
      />
    </div>
  );
};
