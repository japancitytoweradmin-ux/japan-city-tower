import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Phone, 
  ExternalLink, 
  CheckCircle2, 
  Share2,
  Users,
  Copy,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCheck,
  Building2,
  Receipt,
  FileText,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { sampleMembers, sampleUnits } from '../../data/mockData';
import { toBanglaNumber, formatTaka } from '../../utils/formatters';
import { useToast } from '../../components/common/Toast';
import { useTranslation } from '../../i18n/LanguageContext';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { whatsappService } from '../../services/whatsappService';
import { templateService, DEFAULT_MESSAGE_TEMPLATES } from '../../services/templateService';
import { smsService } from '../../services/smsService';
import { MessageTemplate, CommunicationLog } from '../../types';

export const WhatsAppPage: React.FC = () => {
  const { showToast } = useToast();
  const { isBangla, formatNumber } = useTranslation();
  const { selectedYear, selectedMonth, billingPeriodId, periodLabel } = useBillingPeriod();
  const currentPeriodId = billingPeriodId;
  const currentPeriodBangla = periodLabel;

  // Tab State
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'history'>('single');

  // Single Sender State
  const [selectedMember, setSelectedMember] = useState(sampleMembers[0]);
  const [customPhone, setCustomPhone] = useState(selectedMember.phone);
  const [selectedTemplateType, setSelectedTemplateType] = useState<'BILL' | 'RECEIPT' | 'DUE' | 'NOTICE'>('BILL');
  const [message, setMessage] = useState('');

  // Bulk State
  const [bulkFilter, setBulkFilter] = useState<'ALL' | 'DUE'>('ALL');
  const [bulkSearch, setBulkSearch] = useState('');

  // History State
  const [waLogs, setWaLogs] = useState<CommunicationLog[]>([]);

  // Initialize and update template message
  const updateMessageContent = (mem: typeof sampleMembers[0], type: 'BILL' | 'RECEIPT' | 'DUE' | 'NOTICE') => {
    const flatStr = mem.flatUnitNumbers.join(', ');
    const monthStr = currentPeriodBangla;

    if (type === 'BILL') {
      setMessage(
        `আসসালামু আলাইকুম *${mem.name}*।\n\n🏢 *জাপান সিটি টাওয়ার – মাসিক কমন বিল বিবরণী*\n===================================\nফ্ল্যাট / ইউনিট: *${flatStr}*\nবিলিং মাস: *${monthStr}*\nধার্যকৃত বিল: *৳${(mem.totalBill || 1997).toLocaleString('bn-BD')}/-*\n\nঅনুগ্রহ করে আগামী ১০ তারিখের মধ্যে অফিস অথবা অনলাইনে বিল পরিশোধ করার জন্য অনুরোধ করা হলো।\n\nধন্যবাদান্তে,\nব্যবস্থাপনা পর্ষদ, জাপান সিটি টাওয়ার।`
      );
    } else if (type === 'RECEIPT') {
      setMessage(
        `আসসালামু আলাইকুম *${mem.name}*।\n\n✅ *জাপান সিটি টাওয়ার – মানি রসিদ*\n===================================\nরসিদ নং: *REC-${selectedYear}${String(selectedMonth).padStart(2, '0')}-001*\nফ্ল্যাট / ইউনিট: *${flatStr}*\nবিলিং মাস: *${monthStr}*\nপরিশোধের পরিমাণ: *৳${(mem.totalPaid || 1997).toLocaleString('bn-BD')}/-*\nপরিশোধের মাধ্যম: *নগদ (Cash)*\nবকেয়া স্থিতি: *৳${(mem.totalDue || 0).toLocaleString('bn-BD')}/-*\n\nধন্যবাদান্তে,\nব্যবস্থাপনা কমিটি, জাপান সিটি টাওয়ার।`
      );
    } else if (type === 'DUE') {
      setMessage(
        `জরুরি তাগিদ: আসসালামু আলাইকুম *${mem.name}*।\n\n⚠️ *জাপান সিটি টাওয়ার – বকেয়া বিল পরিশোধের নোটিশ*\n===================================\nফ্ল্যাট / ইউনিট: *${flatStr}*\nমোট বকেয়া পরিমাণ: *৳${(mem.totalDue || 1997).toLocaleString('bn-BD')}/-*\n\nবিলিং সাইকেল সচল রাখতে এবং বিল্ডিংয়ের সার্বিক রক্ষণাবেক্ষণ সেবা বজায় রাখতে অবিলম্বে বকেয়া পরিশোধ করার জন্য বিনীত অনুরোধ জানানো হচ্ছে।\n\nধন্যবাদান্তে,\nবিল্ডিং সুপারভাইজার, জাপান সিটি টাওয়ার।`
      );
    } else if (type === 'NOTICE') {
      setMessage(
        `আসসালামু আলাইকুম *${mem.name}* সহ সকল সন্মানিত ফ্ল্যাট মালিক ও বাসিন্দাগণ।\n\n📢 *জাপান সিটি টাওয়ার – জরুরি নোটিশ*\n===================================\nআগামীকাল সকাল ৯:০০ টা থেকে দুপুর ১:০০ টা পর্যন্ত পানির রিজার্ভ ট্যাংক পরিষ্কার ও জেনারেটর সার্ভিসিং করা হবে। সাময়িক অসুবিধার জন্য আন্তরিক দুঃখ প্রকাশ করছি।\n\nধন্যবাদান্তে,\nব্যবস্থাপনা কমিটি, জাপান সিটি টাওয়ার।`
      );
    }
  };

  useEffect(() => {
    updateMessageContent(selectedMember, selectedTemplateType);
  }, [selectedMember, selectedTemplateType, currentPeriodBangla]);

  useEffect(() => {
    const unsubscribe = smsService.subscribeToCommunicationLogs((logs) => {
      setWaLogs(logs.filter(l => l.channel === 'WHATSAPP'));
    });
    return () => unsubscribe();
  }, []);

  const handleMemberSelect = (memberId: string) => {
    const mem = sampleMembers.find((m) => m.memberId === memberId);
    if (mem) {
      setSelectedMember(mem);
      setCustomPhone(mem.phone);
      updateMessageContent(mem, selectedTemplateType);
    }
  };

  const handleOpenWhatsApp = async (targetMember = selectedMember, targetPhone = customPhone, targetMessage = message) => {
    const res = await whatsappService.sendWhatsAppMessage({
      recipientMobile: targetPhone,
      recipientName: targetMember.name,
      message: targetMessage,
      memberId: targetMember.memberId,
      flatNumber: targetMember.flatUnitNumbers.join(', '),
      templateType: selectedTemplateType === 'BILL' ? 'BILL_PUBLISHED' : selectedTemplateType === 'RECEIPT' ? 'PAYMENT_CONFIRMATION' : 'DUE_REMINDER',
      billingPeriodId: currentPeriodId,
      sentBy: 'Admin',
    });

    window.open(res.url, '_blank');
    showToast(`${targetMember.name} এর WhatsApp চ্যাট খোলা হয়েছে`, 'success');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    showToast('মেসেজ ক্লিপবোর্ডে কপি করা হয়েছে', 'success');
  };

  const bulkMembersList = useMemo(() => {
    return sampleMembers.filter(m => {
      if (bulkFilter === 'DUE' && m.totalDue === 0) return false;
      if (bulkSearch.trim()) {
        const q = bulkSearch.toLowerCase();
        const nMatch = m.name.toLowerCase().includes(q);
        const fMatch = m.flatUnitNumbers.some(f => f.toLowerCase().includes(q));
        const pMatch = m.phone.includes(q);
        if (!nMatch && !fMatch && !pMatch) return false;
      }
      return true;
    });
  }, [bulkFilter, bulkSearch]);

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title="WhatsApp মেসেজিং ও নোটিফিকেশন কনসোল"
        subtitle="সদস্যদের সাথে সরাসরি WhatsApp চ্যাটে বিল কপি, মানি রসিদ এবং নোটিশ প্রেরণের মাধ্যম"
      />

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'single'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>সরাসরি চ্যাট প্রস্তুতকারক</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'bulk'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>বাল্ক WhatsApp প্রেরণ তালিকা ({toBanglaNumber(sampleMembers.length)} জন)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>WhatsApp প্রেরণের লগ ({toBanglaNumber(waLogs.length)} টি)</span>
        </button>
      </div>

      {/* TAB 1: SINGLE CHAT COMPOSER */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Compose Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>WhatsApp বার্তা প্রস্তুত করুন</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                বিলিং মাস: <strong className="text-slate-800 dark:text-slate-200">{currentPeriodBangla}</strong>
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Member Picker */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  সদস্য নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMember.memberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                >
                  {sampleMembers.map((m) => (
                    <option key={m.id} value={m.memberId}>
                      {m.name} ({m.flatUnitNumbers.join(', ')}) - {m.phone} | বকেয়া: ৳{m.totalDue.toLocaleString('bn-BD')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone and Quick Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp মোবাইল নম্বর (+880...)
                  </label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 font-bold"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">ফ্ল্যাট ও ইউনিট</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedMember.flatUnitNumbers.join(', ')} ({selectedMember.memberType})
                    </p>
                  </div>
                </div>
              </div>

              {/* Template Category Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  বার্তার বিষয়বস্তু (Quick Template)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'BILL', label: 'মাসিক বিল বিবরণী', icon: FileText },
                    { id: 'RECEIPT', label: 'মানি রসিদ', icon: Receipt },
                    { id: 'DUE', label: 'বকেয়া তাগিদ', icon: AlertTriangle },
                    { id: 'NOTICE', label: 'জরুরি নোটিশ', icon: Sparkles },
                  ].map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateType(tmpl.id as any);
                        updateMessageContent(selectedMember, tmpl.id as any);
                      }}
                      className={`p-2.5 rounded-xl border font-bold text-center flex flex-col items-center gap-1 transition-all ${
                        selectedTemplateType === tmpl.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <tmpl.icon className="w-4 h-4" />
                      <span className="text-[11px]">{tmpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    মেসেজ টেক্সট (WhatsApp Format - Bold/Italic সমর্থিত)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-normal"
                  >
                    <Copy className="w-3 h-3" />
                    <span>কপি টেক্সট</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 leading-relaxed font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>WhatsApp চ্যাটে ওপেন করুন</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: WhatsApp Chat Bubble Mockup */}
          <div className="space-y-4">
            <div className="bg-[#0c1317] text-white rounded-3xl p-4 border border-slate-800 shadow-2xl space-y-3">
              {/* WhatsApp App Bar */}
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                  {selectedMember.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate text-white">{selectedMember.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{customPhone}</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">Online</span>
              </div>

              {/* Chat Bubble Area */}
              <div className="bg-[#0b141a] p-3 rounded-2xl min-h-[300px] flex flex-col justify-end space-y-2">
                <div className="max-w-[90%] bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-xs self-end space-y-1.5 shadow-md">
                  <p className="text-xs whitespace-pre-line leading-relaxed font-sans">
                    {message}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/80">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                *মেসেজটি ওপেন বাটনে চাপ দিলে সরাসরি WhatsApp অ্যাপে লোড হবে*
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BULK SENDER LIST */}
      {activeTab === 'bulk' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                placeholder="সদস্য, ফ্ল্যাট বা মোবাইল খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold ${
                  bulkFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                সকল সদস্য ({toBanglaNumber(sampleMembers.length)})
              </button>
              <button
                type="button"
                onClick={() => setBulkFilter('DUE')}
                className={`px-3 py-1.5 rounded-xl font-bold ${
                  bulkFilter === 'DUE' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                বকেয়া সদস্য ({toBanglaNumber(sampleMembers.filter(m => m.totalDue > 0).length)})
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">সদস্যের নাম</th>
                    <th className="p-3.5">ফ্ল্যাট ইউনিট</th>
                    <th className="p-3.5">মোবাইল</th>
                    <th className="p-3.5 text-right">বকেয়া পরিমাণ</th>
                    <th className="p-3.5 text-right">সরাসরি WhatsApp অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bulkMembersList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {m.name}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {m.flatUnitNumbers.join(', ')}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {m.phone}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ৳{toBanglaNumber(m.totalDue)}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `আসসালামু আলাইকুম *${m.name}*।\n\n🏢 *জাপান সিটি টাওয়ার – বিল বিবরণী*\nফ্ল্যাট: *${m.flatUnitNumbers.join(', ')}*\nবকেয়া: *৳${m.totalDue.toLocaleString('bn-BD')}/-*\n\nধন্যবাদান্তে,\nব্যবস্থাপনা পর্ষদ।`;
                            handleOpenWhatsApp(m, m.phone, msg);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>WhatsApp পাঠান</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WHATSAPP LOGS */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">তারিখ</th>
                  <th className="p-3.5">প্রাপক</th>
                  <th className="p-3.5">মোবাইল</th>
                  <th className="p-3.5">বার্তা বিবরণ</th>
                  <th className="p-3.5 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {waLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                      কোনো WhatsApp বার্তা পাঠানোর ইতিহাস নেই।
                    </td>
                  </tr>
                ) : (
                  waLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {new Date(log.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {log.recipientName} ({log.flatNumber})
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {log.recipientMobile}
                      </td>
                      <td className="p-3.5 max-w-sm truncate text-slate-700 dark:text-slate-300">
                        {log.message}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
