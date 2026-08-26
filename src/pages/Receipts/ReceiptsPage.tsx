import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Download, 
  MessageSquare, 
  Send, 
  Eye, 
  Building2, 
  Calendar 
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PaymentReceiptModal } from '../../components/receipts/PaymentReceiptModal';
import { samplePayments } from '../../data/mockData';
import { PaymentRecord } from '../../types';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { paymentService } from '../../services/paymentService';

export const ReceiptsPage: React.FC = () => {
  const { billingPeriodId, periodLabel } = useBillingPeriod();
  const { t, formatCurrency, formatNumber, isBangla } = useTranslation();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    const unsub = paymentService.subscribeToPayments((loaded) => {
      setPayments(loaded);
    }, billingPeriodId);

    return () => unsub();
  }, [billingPeriodId]);

  const displayPayments = payments.filter(
    (p) => (p.billingPeriodId || p.month) === billingPeriodId
  );

  const filteredPayments = displayPayments.filter((p) =>
    p.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.flatUnitNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.receipts.title}
        subtitle={`${t.receipts.subtitle} • ${periodLabel}`}
      />

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBangla ? 'রসিদ নম্বর (JCT-XXXX), মেম্বার বা ফ্ল্যাট নং লিখুন...' : 'Search receipt number, member or flat...'}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Receipts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPayments.map((pay) => (
          <div
            key={pay.id}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {pay.receiptNumber}
                  </span>
                  {pay.isDemo && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bengali">
                      ডেমো
                    </span>
                  )}
                </div>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {isBangla ? 'পরিশোধিত' : 'Paid'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">{pay.memberName}</h3>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>{t.flats.unitNumber}:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{pay.flatUnitNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.period.billingPeriod}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{pay.billingPeriodId || pay.month}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isBangla ? 'তারিখ' : 'Date'}:</span>
                  <span>{pay.paymentDate}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{t.collections.paidAmount}:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(pay.paidAmount)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {pay.paymentMethod}
              </span>

              <button
                type="button"
                onClick={() => setSelectedReceipt(pay)}
                className="px-3.5 py-1.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                {t.receipts.viewReceipt}
              </button>
            </div>
          </div>
        ))}
      </div>

      <PaymentReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        payment={selectedReceipt}
      />
    </div>
  );
};
