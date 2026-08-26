import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  RotateCcw, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Calendar, 
  User, 
  DollarSign, 
  ShieldAlert,
  FileText
} from 'lucide-react';
import { archiveService, ArchivedItem } from '../../services/archiveService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';

export const ArchivePage: React.FC = () => {
  const { userProfile } = useAuth();
  const { isBangla } = useTranslation();
  const { billingPeriodId } = useBillingPeriod();
  const isBn = isBangla;

  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const loadArchive = async () => {
    setLoading(true);
    try {
      const items = await archiveService.getAllArchivedRecords('ALL', selectedModule);
      setArchivedItems(items);
    } catch (err) {
      console.error('Failed to load archive items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchive();
  }, [selectedModule]);

  const handleRestore = async (item: ArchivedItem) => {
    if (!userProfile) return;
    if (userProfile.role !== 'SUPER_ADMIN') {
      alert(isBn ? 'শুধুমাত্র সুপার অ্যাডমিন ডাটা ডিলিট করা রেকর্ড রিস্টোর করতে পারবেন।' : 'Only SUPER_ADMIN can restore archived records.');
      return;
    }

    if (!confirm(isBn ? `আপনি কি নিশ্চিত যে "${item.title}" রেকর্ডটি রিস্টোর করতে চান?` : `Are you sure you want to restore "${item.title}"?`)) {
      return;
    }

    setRestoringId(item.id);
    try {
      const collectionName = item.originalData.collectionName;
      await archiveService.restoreRecord(collectionName, item.id, userProfile, item.title);
      setSuccessMsg(isBn ? 'রেকর্ডটি সফলভাবে মূল ডাটাবেসে রিস্টোর করা হয়েছে।' : 'Record restored successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadArchive();
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    } finally {
      setRestoringId(null);
    }
  };

  const filteredItems = archivedItems.filter((i) => {
    const query = search.toLowerCase();
    return (
      i.title.toLowerCase().includes(query) ||
      i.deleteReason.toLowerCase().includes(query) ||
      i.deletedBy.toLowerCase().includes(query) ||
      (i.billingPeriodId || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isBn ? 'আর্কাইভকৃত রেকর্ড ও নিরাপদ ডাটা ব্যাংক' : 'Archived Records & Data Vault'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isBn ? 'সফট-ডিলিট হওয়া খরচ, বিল, পেমেন্ট ও নোটিসের ভল্ট (মাস্টার সুপার-অ্যাডমিন দ্বারা রিস্টোরযোগ্য)' : 'Soft-deleted transactions vault with audit trail and restore capabilities'}
            </p>
          </div>
        </div>

        {userProfile?.role === 'SUPER_ADMIN' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <RotateCcw className="w-3.5 h-3.5" />
            {isBn ? 'সুপার-অ্যাডমিন রিস্টোর অন' : 'SUPER_ADMIN Restore Enabled'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {isBn ? 'ভিউ-অনলি মোড' : 'View Only Mode'}
          </span>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-xl text-sm flex items-center gap-2 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Module Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', name: isBn ? 'সকল আর্কাইভ' : 'All Archives' },
            { id: 'EXPENSES', name: isBn ? 'খরচ (Expenses)' : 'Expenses' },
            { id: 'PAYMENTS', name: isBn ? 'পেমেন্ট (Payments)' : 'Payments' },
            { id: 'RECEIPTS', name: isBn ? 'মানি রসিদ (Receipts)' : 'Receipts' },
            { id: 'BILLS', name: isBn ? 'বিল (Bills)' : 'Bills' },
            { id: 'NOTICES', name: isBn ? 'নোটিশ (Notices)' : 'Notices' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedModule(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedModule === tab.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? 'শিরোনাম, কারণ বা ইউজার খুঁজুন...' : 'Search title, reason...'}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Archive Items Grid / Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-4">{isBn ? 'মডিউল ও বিবরণ' : 'Module & Title'}</th>
                <th className="p-4">{isBn ? 'পরিমাণ (টাকা)' : 'Amount'}</th>
                <th className="p-4">{isBn ? 'আর্কাইভ করার কারণ' : 'Reason for Archive'}</th>
                <th className="p-4">{isBn ? 'আর্কাইভকারী ও সময়' : 'Archived By & Time'}</th>
                <th className="p-4 text-right">{isBn ? 'রিস্টোর অ্যাকশন' : 'Restore Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {isBn ? 'আর্কাইভ ডেটা লোড হচ্ছে...' : 'Loading archive items...'}
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Archive className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <div>{isBn ? 'কোনো আর্কাইভকৃত রেকর্ড নেই' : 'No archived items found'}</div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] px-2 py-1 bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">
                          {item.module}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          {item.billingPeriodId && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              পিরিয়ড: {item.billingPeriodId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold font-mono text-slate-900 dark:text-white">
                      {item.amount ? `৳${item.amount.toLocaleString('bn-BD')}` : '—'}
                    </td>
                    <td className="p-4">
                      <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 max-w-xs">
                        "{item.deleteReason}"
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900 dark:text-white">{item.deletedBy}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.deletedAt ? new Date(item.deletedAt).toLocaleString('bn-BD') : ''}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={restoringId === item.id || userProfile?.role !== 'SUPER_ADMIN'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
                        title={userProfile?.role !== 'SUPER_ADMIN' ? 'শুধুমাত্র সুপার-অ্যাডমিন রিস্টোর করতে পারবেন' : ''}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {restoringId === item.id ? (isBn ? 'রিস্টোর হচ্ছে...' : 'Restoring...') : (isBn ? 'রিস্টোর করুন' : 'Restore')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
