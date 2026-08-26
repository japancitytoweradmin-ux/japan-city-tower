import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ShieldAlert, 
  Eye, 
  Clock, 
  Database,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { AuditLog, UserRole } from '../../types';
import { auditService, AuditLogFilters } from '../../services/auditService';
import { useTranslation } from '../../i18n/LanguageContext';

export const AuditLogPage: React.FC = () => {
  const { isBangla } = useTranslation();
  const isBn = isBangla;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    const filters: AuditLogFilters = {
      date: dateFilter || undefined,
      module: moduleFilter !== 'ALL' ? moduleFilter : undefined,
      action: actionFilter !== 'ALL' ? actionFilter : undefined,
      userRole: roleFilter !== 'ALL' ? (roleFilter as UserRole) : undefined,
      searchQuery: search || undefined
    };

    const unsub = auditService.subscribeToAuditLogs((data) => {
      setLogs(data);
      setLoading(false);
    }, filters);

    return () => unsub();
  }, [dateFilter, moduleFilter, actionFilter, roleFilter, search]);

  const handleResetFilters = () => {
    setSearch('');
    setDateFilter('');
    setModuleFilter('ALL');
    setActionFilter('ALL');
    setRoleFilter('ALL');
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">নতুন এন্ট্রি (CREATE)</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">আপডেট (UPDATE)</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">আর্কাইভ/ডিলিট (DELETE)</span>;
      case 'PUBLISH':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">প্রকাশিত (PUBLISH)</span>;
      case 'REOPEN':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">পুনঃউন্মুক্ত (REOPEN)</span>;
      case 'RESTORE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">পুনরুদ্ধার (RESTORE)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isBn ? 'সিস্টেম অডিট লগ ও কার্যকলাপ ট্র্যাকার' : 'System Audit Log & Activity Tracker'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isBn ? 'কে, কখন, কী ডাটা পরিবর্তন বা রিস্টোর করেছেন তার অনমনীয় অডিট ট্রেইল (Append-Only)' : 'Immutable record of all system events, edits, and administrative actions'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{isBn ? 'অডিট লগ মুছে ফেলা বা পরিবর্তন সম্পূর্ণ অযোগ্য (Guard Active)' : 'Append-Only Audit Guard Active'}</span>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isBn ? 'বিবরণ বা ইউজার খুঁজুন...' : 'Search description...'}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Module Select */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">{isBn ? 'সকল মডিউল (All Modules)' : 'All Modules'}</option>
            <option value="EXPENSES">EXPENSES (খরচ)</option>
            <option value="BILLS">BILLS (মাসিক বিল)</option>
            <option value="PAYMENTS">PAYMENTS (পেমেন্ট)</option>
            <option value="RECEIPTS">RECEIPTS (মানি রসিদ)</option>
            <option value="MEMBERS">MEMBERS (সদস্য)</option>
            <option value="FLATS">FLATS (ফ্ল্যাট)</option>
            <option value="USERS">USERS (ইউজার)</option>
            <option value="NOTICES">NOTICES (নোটিশ)</option>
            <option value="OPENING_BALANCE">OPENING_BALANCE (প্রারম্ভিক জের)</option>
          </select>

          {/* Action Select */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">{isBn ? 'সকল অ্যাকশন (All Actions)' : 'All Actions'}</option>
            <option value="CREATE">CREATE (তৈরি)</option>
            <option value="UPDATE">UPDATE (সম্পাদনা)</option>
            <option value="DELETE">DELETE (আর্কাইভ/ডিলিট)</option>
            <option value="PUBLISH">PUBLISH (প্রকাশ)</option>
            <option value="REOPEN">REOPEN (পুনঃউন্মুক্ত)</option>
            <option value="RESTORE">RESTORE (পুনরুদ্ধার)</option>
          </select>

          {/* Reset button */}
          <button
            onClick={handleResetFilters}
            className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isBn ? 'ফিল্টার রিসেট' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">{isBn ? 'সময় (Timestamp)' : 'Timestamp'}</th>
                <th className="p-3.5">{isBn ? 'ইউজার ও ভূমিকা' : 'User & Role'}</th>
                <th className="p-3.5">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                <th className="p-3.5">{isBn ? 'মডিউল' : 'Module'}</th>
                <th className="p-3.5">{isBn ? 'বিবরণ (Description)' : 'Description'}</th>
                <th className="p-3.5 text-right">{isBn ? 'ডিটেইলস' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isBn ? 'অডিট লগ লোড হচ্ছে...' : 'Loading audit logs...'}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isBn ? 'কোনো অডিট লগ রেকর্ড পাওয়া যায়নি' : 'No audit records found'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="p-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('bn-BD', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : '—'}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {log.userName || 'System'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.userRole || 'ADMIN'}
                      </div>
                    </td>
                    <td className="p-3.5">{getActionBadge(log.action)}</td>
                    <td className="p-3.5">
                      <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-md">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={log.description}>
                        {log.description}
                      </div>
                      {log.billingPeriodId && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                          [{log.billingPeriodId}]
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {(log.oldData || log.newData) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isBn ? 'ডিফ দেখুন' : 'View Diff'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff View Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-500" />
                {isBn ? 'ডাটা পরিবর্তনের বিস্তারিত বিবরণ (Audit Data Diff)' : 'Audit Data Diff'}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white">{selectedLog.description}</div>
                <div className="text-slate-500 flex items-center gap-3">
                  <span>ইউজার: {selectedLog.userName} ({selectedLog.userRole})</span>
                  <span>সময়: {selectedLog.timestamp}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Old Data */}
                <div className="space-y-1.5">
                  <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span>পূর্ববর্তী মান (Old Data)</span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-rose-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                    {selectedLog.oldData ? JSON.stringify(selectedLog.oldData, null, 2) : '— (N/A)'}
                  </pre>
                </div>

                {/* New Data */}
                <div className="space-y-1.5">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>নতুন মান (New Data)</span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                    {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : '— (N/A)'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
