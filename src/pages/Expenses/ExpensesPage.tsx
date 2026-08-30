import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  Table as TableIcon, 
  AlertTriangle, 
  CheckCircle2, 
  CreditCard, 
  Calendar, 
  FileText, 
  Sparkles,
  Download,
  Printer,
  Loader2
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { ExpenseCard } from '../../components/expenses/ExpenseCard';
import { ExpenseSummary } from '../../components/expenses/ExpenseSummary';
import { ExpenseFormModal } from '../../components/expenses/ExpenseFormModal';
import { ExpenseDetailsModal } from '../../components/expenses/ExpenseDetailsModal';
import { VoucherPreviewModal } from '../../components/vouchers/VoucherPreviewModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ExpenseItem, ExpenseCategory, VoucherAttachment } from '../../types';
import { sampleExpensesJune2025 } from '../../data/mockData';
import { expenseService } from '../../services/expenseService';
import { useToast } from '../../components/common/Toast';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';

export const ExpensesPage: React.FC = () => {
  const { showToast } = useToast();
  const { billingPeriodId, periodLabel, selectedYear, selectedMonth } = useBillingPeriod();
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [voucherFilter, setVoucherFilter] = useState<'ALL' | 'MISSING' | 'VERIFIED'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [detailsExpense, setDetailsExpense] = useState<ExpenseItem | null>(null);
  const [deleteTargetExpense, setDeleteTargetExpense] = useState<ExpenseItem | null>(null);

  // Voucher preview modal state
  const [previewVoucher, setPreviewVoucher] = useState<VoucherAttachment | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = expenseService.subscribeToExpenses((loadedExpenses) => {
      setExpenses(loadedExpenses);
      setIsLoading(false);
    }, billingPeriodId);

    return () => unsubscribe();
  }, [billingPeriodId]);

  // Calculations for current period
  const periodExpenses = expenses.filter(
    (e) => (e.billingPeriodId || e.month) === billingPeriodId
  );
  const totalAmount = periodExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalItems = periodExpenses.length;
  const withVouchersCount = periodExpenses.filter((e) => Boolean(e.voucher) || (e.voucherFiles && e.voucherFiles.length > 0)).length;
  const missingVouchersCount = periodExpenses.filter((e) => !e.voucher && (!e.voucherFiles || e.voucherFiles.length === 0)).length;

  // Filtered List
  const filteredExpenses = periodExpenses.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryNameBangla.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.voucherNumber && item.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;

    const hasVoucher = Boolean(item.voucher) || (item.voucherFiles && item.voucherFiles.length > 0);
    const matchesVoucherStatus =
      voucherFilter === 'ALL' ||
      (voucherFilter === 'MISSING' && !hasVoucher) ||
      (voucherFilter === 'VERIFIED' && hasVoucher);

    return matchesSearch && matchesCategory && matchesVoucherStatus;
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setIsFormModalOpen(true);
  };

  const handleOpenDetails = (expense: ExpenseItem) => {
    setDetailsExpense(expense);
  };

  const handleOpenPreviewVoucher = (voucher: VoucherAttachment, title: string) => {
    setPreviewVoucher(voucher);
    setPreviewTitle(title);
  };

  const handleFormSubmit = async (data: Partial<ExpenseItem>) => {
    try {
      if (editingExpense) {
        const updated: ExpenseItem = {
          ...editingExpense,
          ...data,
          billingYear: selectedYear,
          billingMonth: selectedMonth,
          billingPeriodId: billingPeriodId,
          status: data.voucher || editingExpense.voucher ? 'VERIFIED' : 'PENDING'
        } as ExpenseItem;
        await expenseService.upsertExpense(updated);
        showToast(isBangla ? 'খরচের হিসাব সফলভাবে আপডেট হয়েছে' : 'Expense record updated successfully', 'success');
      } else {
        const newExpense: ExpenseItem = {
          id: `exp-${Date.now()}`,
          month: billingPeriodId,
          monthNameBangla: periodLabel,
          billingYear: selectedYear,
          billingMonth: selectedMonth,
          billingPeriodId: billingPeriodId,
          title: data.title || '',
          category: data.category || 'OTHER',
          categoryNameBangla: data.categoryNameBangla || 'অন্যান্য',
          amount: data.amount || 0,
          date: data.date || new Date().toISOString().split('T')[0],
          description: data.description || '',
          paymentMethod: data.paymentMethod || 'CASH',
          voucherNumber: data.voucherNumber || '',
          voucher: data.voucher || null,
          comments: data.comments || '',
          status: data.voucher ? 'VERIFIED' : 'PENDING',
          createdBy: 'Admin (ম্যানেজার)',
          createdAt: new Date().toISOString().split('T')[0],
          isDemo: false
        };
        await expenseService.upsertExpense(newExpense);
        showToast(isBangla ? 'নতুন খরচের ভাউচার ডাটাবেজে যুক্ত হয়েছে' : 'New expense & voucher saved to database', 'success');
      }
      setIsFormModalOpen(false);
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Error saving expense'), 'error');
    }
  };

  const handleVoucherUpdatedForExpense = async (
    expenseId: string,
    voucher: VoucherAttachment | null
  ) => {
    try {
      const target = expenses.find((e) => e.id === expenseId);
      if (target) {
        await expenseService.upsertExpense({
          ...target,
          voucher,
          status: voucher ? 'VERIFIED' : 'PENDING'
        });
        showToast(isBangla ? 'ভাউচার সফলভাবে সংযুক্ত হয়েছে' : 'Voucher linked successfully', 'success');
      }
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Error saving voucher'), 'error');
    }
  };

  const handleDeleteExpense = async () => {
    if (deleteTargetExpense) {
      try {
        await expenseService.deleteExpense(deleteTargetExpense.id);
        showToast(`"${deleteTargetExpense.title}" ${isBangla ? 'মুছে ফেলা হয়েছে' : 'deleted'}`, 'success');
      } catch (err: any) {
        showToast('Error: ' + (err.message || 'Could not delete'), 'error');
      } finally {
        setDeleteTargetExpense(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={t.expenses.title}
        subtitle={`${t.expenses.subtitle} • ${periodLabel}`}
        actionButton={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition-all transform active:scale-98"
          >
            <Plus className="w-4 h-4" />
            {t.expenses.addExpense}
          </button>
        }
      />

      {/* EXPENSE SUMMARY COMPONENT */}
      <ExpenseSummary
        month={billingPeriodId}
        monthNameBangla={periodLabel}
        totalAmount={totalAmount}
        totalItems={totalItems}
        withVouchersCount={withVouchersCount}
        missingVouchersCount={missingVouchersCount}
        expensesList={periodExpenses}
        onUploadMissingVoucher={() => setVoucherFilter('MISSING')}
        onFilterMissingVouchers={() => setVoucherFilter('MISSING')}
        isMissingVoucherFilterActive={voucherFilter === 'MISSING'}
      />

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBangla ? 'খরচের নাম, মেমো নং বা বিবরণ খুঁজুন...' : 'Search expense title, memo no...'}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Category & Voucher Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">{t.expenses.category}:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">{t.expenses.allCategories}</option>
              <option value="ELECTRICITY">{isBangla ? 'বিদ্যুৎ বিল' : 'Electricity'}</option>
              <option value="GUARD_SALARY">{isBangla ? 'দারোয়ানের বেতন' : 'Guard Salary'}</option>
              <option value="LIFT_SERVICE">{isBangla ? 'লিফট সার্ভিস' : 'Lift Service'}</option>
              <option value="GARBAGE_CLEANING">{isBangla ? 'ময়লা বিল' : 'Garbage Cleaning'}</option>
              <option value="STAIR_CLEANING">{isBangla ? 'সিঁড়ি পরিষ্কার' : 'Stair Cleaning'}</option>
              <option value="GENERATOR_DIESEL">{isBangla ? 'জেনারেটর ডিজেল' : 'Generator Diesel'}</option>
              <option value="DIESEL_TRANSPORT">{isBangla ? 'ডিজেল পরিবহন' : 'Diesel Transport'}</option>
              <option value="MAINTENANCE">{isBangla ? 'মেরামত ও রক্ষণাবেক্ষণ' : 'Maintenance'}</option>
              <option value="OTHER">{isBangla ? 'অন্যান্য' : 'Other'}</option>
            </select>
          </div>

          {/* Missing Voucher Quick Filter Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setVoucherFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                voucherFilter === 'ALL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {isBangla ? 'সব খরচ' : 'All'} ({formatNumber(totalItems)})
            </button>

            <button
              type="button"
              onClick={() => setVoucherFilter('MISSING')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                voucherFilter === 'MISSING'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 hover:text-amber-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {t.expenses.voucherMissing} ({formatNumber(missingVouchersCount)})
            </button>

            <button
              type="button"
              onClick={() => setVoucherFilter('VERIFIED')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                voucherFilter === 'VERIFIED' ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {isBangla ? 'ভাউচার সংযুক্ত' : 'Voucher Attached'} ({formatNumber(withVouchersCount)})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'GRID' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'TABLE' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* EXPENSE LISTING (GRID VS TABLE) */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{isBangla ? 'কোনো খরচ পাওয়া যায়নি' : 'No expenses found'}</h3>
          <p className="text-xs text-slate-500">
            {periodLabel}
          </p>
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={handleOpenEdit}
              onDelete={(exp) => setDeleteTargetExpense(exp)}
              onViewDetails={handleOpenDetails}
              onPreviewVoucher={handleOpenPreviewVoucher}
              onVoucherUpdate={handleVoucherUpdatedForExpense}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">{t.expenses.date}</th>
                  <th className="p-3.5">{t.expenses.description}</th>
                  <th className="p-3.5">{t.expenses.voucher}</th>
                  <th className="p-3.5 text-right">{t.expenses.amount}</th>
                  <th className="p-3.5">{isBangla ? 'সংযুক্ত ভাউচার' : 'Attached Voucher'}</th>
                  <th className="p-3.5 text-center">{t.common.status}</th>
                  <th className="p-3.5 text-center">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp) => {
                  const hasVoucher = Boolean(exp.voucher) || (exp.voucherFiles && exp.voucherFiles.length > 0);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{exp.date}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium border bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                            {isBangla ? exp.categoryNameBangla : exp.category}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{exp.title}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">
                        {exp.voucherNumber || '—'}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3.5">
                        {hasVoucher && exp.voucher ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPreviewVoucher(exp.voucher!, exp.title)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            <span>{t.expenses.viewVoucher}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-200 dark:border-amber-800 transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>{t.expenses.uploadVoucher}</span>
                          </button>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <StatusBadge status={exp.status} size="sm" />
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(exp)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title={isBangla ? 'বিস্তারিত দেখুন' : 'View Details'}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title={t.common.edit}
                          >
                            <Plus className="w-3.5 h-3.5 rotate-45" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALL MODALS FOR EXPENSES AND VOUCHERS */}
      <ExpenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingExpense}
        selectedMonth={billingPeriodId}
        selectedMonthName={periodLabel}
      />

      <ExpenseDetailsModal
        isOpen={Boolean(detailsExpense)}
        onClose={() => setDetailsExpense(null)}
        expense={detailsExpense}
        onEdit={handleOpenEdit}
        onDelete={(exp) => setDeleteTargetExpense(exp)}
        onPreviewVoucher={handleOpenPreviewVoucher}
      />

      <VoucherPreviewModal
        isOpen={Boolean(previewVoucher)}
        onClose={() => setPreviewVoucher(null)}
        voucher={previewVoucher}
        expenseTitle={previewTitle}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTargetExpense)}
        onClose={() => setDeleteTargetExpense(null)}
        onConfirm={handleDeleteExpense}
        title={isBangla ? 'খরচ মুছে ফেলুন' : 'Delete Expense'}
        message={`"${deleteTargetExpense?.title}" (${formatCurrency(deleteTargetExpense?.amount || 0)})`}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
      />
    </div>
  );
};
