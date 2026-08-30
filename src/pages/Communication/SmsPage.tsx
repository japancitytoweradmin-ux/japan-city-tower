import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  MessageSquare, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Coins, 
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Building2,
  Smartphone,
  PhoneCall,
  CheckCheck,
  XCircle,
  Settings,
  HelpCircle,
  Eye,
  Edit3,
  Copy,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { sampleMembers, sampleUnits, samplePayments } from '../../data/mockData';
import { toBanglaNumber, formatTaka } from '../../utils/formatters';
import { useToast } from '../../components/common/Toast';
import { useTranslation } from '../../i18n/LanguageContext';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { smsService } from '../../services/smsService';
import { templateService, DEFAULT_MESSAGE_TEMPLATES } from '../../services/templateService';
import { communicationSettingsService } from '../../services/communicationSettingsService';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';
import { 
  CommunicationLog, 
  CommunicationStatus, 
  CommunicationChannel,
  MessageTemplate, 
  MessageTemplateType, 
  RecipientTargetType,
  CommunicationSettings,
  IpWhiteListEntry,
  Member,
  FlatUnit
} from '../../types';

export const SmsPage: React.FC = () => {
  const { showToast } = useToast();
  const { isBangla, formatNumber } = useTranslation();
  const { selectedYear, selectedMonth, billingPeriodId, periodLabel } = useBillingPeriod();
  const currentPeriodId = billingPeriodId;
  const currentPeriodBangla = periodLabel;

  // Real Firestore Members & Flats
  const [dbMembers, setDbMembers] = useState<Member[]>([]);
  const [dbFlats, setDbFlats] = useState<FlatUnit[]>([]);

  useEffect(() => {
    const unsubMem = memberService.subscribeToMembers((loaded) => setDbMembers(loaded));
    const unsubFlats = flatService.subscribeToFlats((loaded) => setDbFlats(loaded));
    return () => {
      unsubMem();
      unsubFlats();
    };
  }, []);

  const activeMembers = useMemo(() => dbMembers.length > 0 ? dbMembers : sampleMembers, [dbMembers]);
  const activeFlats = useMemo(() => dbFlats.length > 0 ? dbFlats : sampleUnits, [dbFlats]);

  // IP Whitelisting Form State
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newIpType, setNewIpType] = useState<'ALL' | 'API' | 'WEB'>('ALL');
  const [newIpNote, setNewIpNote] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'compose' | 'due-reminders' | 'templates' | 'logs' | 'settings'>('compose');

  // Communication Stats & Logs
  const [stats, setStats] = useState({
    smsBalance: 1420,
    smsSentToday: 0,
    smsSentThisMonth: 0,
    whatsappSent: 0,
    failedMessages: 0,
    pendingMessages: 0,
  });
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Settings
  const [settings, setSettings] = useState<CommunicationSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_MESSAGE_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-bill-published');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Compose State
  const [recipientTarget, setRecipientTarget] = useState<RecipientTargetType>('ALL_ACTIVE');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(sampleMembers[0].memberId);
  const [selectedFlatNumber, setSelectedFlatNumber] = useState<string>(sampleUnits[0].unitNumber);
  const [customMobile, setCustomMobile] = useState<string>('');
  const [customRecipientName, setCustomRecipientName] = useState<string>('জনাব');
  const [messageBody, setMessageBody] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  // Safety Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);
  const [pendingRecipients, setPendingRecipients] = useState<Array<{
    memberId?: string;
    recipientName: string;
    recipientMobile: string;
    flatNumber?: string;
    message: string;
  }>>([]);

  // Logs Filter State
  const [logChannelFilter, setLogChannelFilter] = useState<'ALL' | CommunicationChannel>('ALL');
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | CommunicationStatus>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Due Reminder Filters
  const [minDueAmount, setMinDueAmount] = useState<number>(0);
  const [dueStatusFilter, setDueStatusFilter] = useState<'ALL' | 'DUE' | 'PARTIAL'>('ALL');
  const [selectedDueMembers, setSelectedDueMembers] = useState<string[]>([]);

  // Load initial data
  const loadData = async () => {
    try {
      const [fetchedStats, fetchedSettings, fetchedTemplates] = await Promise.all([
        smsService.getStats(),
        communicationSettingsService.getSettings(),
        templateService.getAllTemplates(),
      ]);
      setStats(fetchedStats);
      setSettings(fetchedSettings);
      setTemplates(fetchedTemplates);

      // Default message from template
      const defaultTmpl = fetchedTemplates.find(t => t.id === selectedTemplateId) || fetchedTemplates[0];
      if (defaultTmpl) {
        setMessageBody(templateService.replaceVariables(defaultTmpl.body, {
          memberName: sampleMembers[0].name,
          flatNumber: sampleMembers[0].flatUnitNumbers.join(', '),
          billingMonth: currentPeriodBangla.split(' ')[0],
          billingYear: String(selectedYear),
          billAmount: '১,৯৯৭',
        }));
      }
    } catch (err) {
      console.warn('Error initializing communication data:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to live logs
    const unsubscribe = smsService.subscribeToCommunicationLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => unsubscribe();
  }, []);

  // Character calculation
  const smsCalculation = useMemo(() => {
    return smsService.calculateSmsParts(messageBody);
  }, [messageBody]);

  // Handle template selection in compose
  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;

    const currentMember = activeMembers.find(m => m.memberId === selectedMemberId) || activeMembers[0] || sampleMembers[0];
    const newBody = templateService.replaceVariables(tmpl.body, {
      memberName: currentMember?.name || 'সম্মানিত সদস্য',
      flatNumber: (currentMember?.flatUnitNumbers || []).join(', ') || 'ফ্ল্যাট',
      billingMonth: currentPeriodBangla.split(' ')[0],
      billingYear: String(selectedYear),
      billAmount: '১,৯৯৭',
      paidAmount: '১,৯৯৭',
      dueAmount: '০',
      receiptNumber: 'REC-202506-001',
    });
    setMessageBody(newBody);
  };

  // Insert Variable Tag into Message Textarea
  const handleInsertVariable = (variable: string) => {
    setMessageBody(prev => prev + ' ' + variable);
  };

  // Prepare recipients based on target type
  const prepareRecipients = () => {
    const list: Array<{
      memberId?: string;
      recipientName: string;
      recipientMobile: string;
      flatNumber?: string;
      message: string;
    }> = [];

    if (recipientTarget === 'SINGLE_MEMBER') {
      const mem = activeMembers.find(m => m.memberId === selectedMemberId);
      if (mem) {
        list.push({
          memberId: mem.memberId,
          recipientName: mem.name,
          recipientMobile: mem.phone,
          flatNumber: (mem.flatUnitNumbers || []).join(', '),
          message: templateService.replaceVariables(messageBody, {
            memberName: mem.name,
            flatNumber: (mem.flatUnitNumbers || []).join(', '),
            billingMonth: currentPeriodBangla.split(' ')[0],
            billingYear: String(selectedYear),
          }),
        });
      }
    } else if (recipientTarget === 'SINGLE_FLAT') {
      const flat = activeFlats.find(u => u.unitNumber === selectedFlatNumber);
      const mem = activeMembers.find(m => (m.flatUnitNumbers || []).includes(selectedFlatNumber));
      if (flat) {
        list.push({
          memberId: mem?.memberId,
          recipientName: flat.ownerName,
          recipientMobile: flat.ownerPhone,
          flatNumber: flat.unitNumber,
          message: templateService.replaceVariables(messageBody, {
            memberName: flat.ownerName,
            flatNumber: flat.unitNumber,
            billingMonth: currentPeriodBangla.split(' ')[0],
            billingYear: String(selectedYear),
          }),
        });
      }
    } else if (recipientTarget === 'ALL_ACTIVE') {
      activeMembers.forEach(mem => {
        list.push({
          memberId: mem.memberId,
          recipientName: mem.name,
          recipientMobile: mem.phone,
          flatNumber: (mem.flatUnitNumbers || []).join(', '),
          message: templateService.replaceVariables(messageBody, {
            memberName: mem.name,
            flatNumber: (mem.flatUnitNumbers || []).join(', '),
            billingMonth: currentPeriodBangla.split(' ')[0],
            billingYear: String(selectedYear),
          }),
        });
      });
    } else if (recipientTarget === 'DUE_MEMBERS') {
      // Due members calculation
      const dueMembers = activeMembers.filter(m => (m.computedDue || m.totalDue || 0) > 0);
      dueMembers.forEach(mem => {
        list.push({
          memberId: mem.memberId,
          recipientName: mem.name,
          recipientMobile: mem.phone,
          flatNumber: (mem.flatUnitNumbers || []).join(', '),
          message: templateService.replaceVariables(messageBody, {
            memberName: mem.name,
            flatNumber: (mem.flatUnitNumbers || []).join(', '),
            billingMonth: currentPeriodBangla.split(' ')[0],
            billingYear: String(selectedYear),
            dueAmount: (mem.computedDue || mem.totalDue || 0).toLocaleString('bn-BD'),
          }),
        });
      });
    } else if (recipientTarget === 'CUSTOM_MOBILE') {
      list.push({
        recipientName: customRecipientName,
        recipientMobile: customMobile,
        message: messageBody,
      });
    }

    return list;
  };

  // Open Safety Confirmation Modal
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) {
      showToast('অনুগ্রহ করে এসএমএস বার্তা লিখুন', 'warning');
      return;
    }

    const recipients = prepareRecipients();
    if (recipients.length === 0) {
      showToast('কোনো বৈধ প্রাপক পাওয়া যায়নি', 'warning');
      return;
    }

    setPendingRecipients(recipients);
    setIsAgreedToTerms(false);
    setShowConfirmModal(true);
  };

  // Execute Send SMS
  const handleExecuteSend = async () => {
    if (!isAgreedToTerms) {
      showToast('অনুগ্রহ করে শর্তাবলীতে সম্মতি জানান', 'warning');
      return;
    }

    setIsSending(true);
    try {
      const result = await smsService.sendBulkSms(pendingRecipients, {
        templateType: 'BILL_PUBLISHED',
        billingPeriodId: currentPeriodId,
        sentBy: 'Admin',
      });

      showToast(
        `এসএমএস প্রেরণ সম্পন্ন! মোট: ${toBanglaNumber(result.total)}, সফল: ${toBanglaNumber(result.sent)}, ব্যর্থ: ${toBanglaNumber(result.failed)}`,
        result.failed === 0 ? 'success' : 'warning'
      );

      setShowConfirmModal(false);
      const updatedStats = await smsService.getStats();
      setStats(updatedStats);
    } catch (error: any) {
      showToast(`এসএমএস প্রেরণে ত্রুটি: ${error.message || 'Error'}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Test SMS Trigger
  const handleSendTestSms = async () => {
    const testPhone = '01711000000';
    setIsSending(true);
    try {
      const result = await smsService.sendSms({
        recipientMobile: testPhone,
        recipientName: 'টেস্ট প্রাপক (অ্যাডমিন)',
        message: `[TEST SMS] ${messageBody}`,
        sentBy: 'Admin',
        bypassDuplicateCheck: true,
      });

      if (result.success) {
        showToast(`টেস্ট এসএমএস সফলভাবে প্রেরিত হয়েছে (${testPhone})`, 'success');
      } else {
        showToast(result.errorMessage || 'Test SMS failed', 'error');
      }
      const updatedStats = await smsService.getStats();
      setStats(updatedStats);
    } finally {
      setIsSending(false);
    }
  };

  // Retry Failed Message
  const handleRetry = async (log: CommunicationLog) => {
    setRetryingLogId(log.id);
    try {
      const success = await smsService.retryMessage(log, 'Admin');
      if (success) {
        showToast(`মেসেজ সফলভাবে পুনরায় পাঠানো হয়েছে (${log.recipientName})`, 'success');
      } else {
        showToast('পুনরায় প্রেরণে ব্যর্থ হয়েছে। অনুগ্রহ করে নেটওয়ার্ক ও নম্বর পরীক্ষা করুন।', 'error');
      }
      const updatedStats = await smsService.getStats();
      setStats(updatedStats);
    } catch (err: any) {
      showToast('ত্রুটি: ' + err.message, 'error');
    } finally {
      setRetryingLogId(null);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logChannelFilter !== 'ALL' && log.channel !== logChannelFilter) return false;
      if (logStatusFilter !== 'ALL' && log.status !== logStatusFilter) return false;
      if (logSearch.trim()) {
        const query = logSearch.toLowerCase();
        const nameMatch = log.recipientName.toLowerCase().includes(query);
        const mobileMatch = log.recipientMobile.includes(query);
        const msgMatch = log.message.toLowerCase().includes(query);
        const flatMatch = log.flatNumber?.toLowerCase().includes(query);
        if (!nameMatch && !mobileMatch && !msgMatch && !flatMatch) return false;
      }
      return true;
    });
  }, [logs, logChannelFilter, logStatusFilter, logSearch]);

  // Due Members List for Due Tab
  const dueMembersList = useMemo(() => {
    return activeMembers.filter(m => {
      const due = m.computedDue || m.totalDue || 0;
      if (due <= minDueAmount) return false;
      if (dueStatusFilter === 'DUE' && due === 0) return false;
      return true;
    });
  }, [activeMembers, minDueAmount, dueStatusFilter]);

  // Handle Bulk Due SMS Send
  const handleSendDueReminders = async () => {
    const targets = dueMembersList.filter(m => 
      selectedDueMembers.length === 0 || selectedDueMembers.includes(m.memberId)
    );

    if (targets.length === 0) {
      showToast('অনুগ্রহ করে বকেয়া সদস্য নির্বাচন করুন', 'warning');
      return;
    }

    const tmpl = templates.find(t => t.type === 'DUE_REMINDER') || templates[2];
    const recipients = targets.map(m => {
      const dueVal = m.computedDue || m.totalDue || 0;
      const flatStr = (m.flatUnitNumbers || []).join(', ');
      return {
        memberId: m.memberId,
        recipientName: m.name,
        recipientMobile: m.phone,
        flatNumber: flatStr,
        message: templateService.replaceVariables(tmpl.body, {
          memberName: m.name,
          flatNumber: flatStr,
          billingMonth: currentPeriodBangla.split(' ')[0],
          billingYear: String(selectedYear),
          dueAmount: dueVal.toLocaleString('bn-BD'),
        }),
      };
    });

    setPendingRecipients(recipients);
    setIsAgreedToTerms(false);
    setShowConfirmModal(true);
  };

  // IP Whitelist Helpers
  const handleAddIpWhitelist = () => {
    if (!settings) return;
    if (!newIpAddress.trim()) {
      showToast('অনুগ্রহ করে সঠিক IP এড্রেস টাইপ করুন', 'error');
      return;
    }
    const newEntry: IpWhiteListEntry = {
      id: `ip-${Date.now()}`,
      ip: newIpAddress.trim(),
      type: newIpType,
      note: newIpNote.trim() || undefined,
      createdAt: new Date().toISOString()
    };
    const currentList = settings.ipWhiteListEntries || [];
    setSettings({
      ...settings,
      ipWhiteListEntries: [...currentList, newEntry]
    });
    setNewIpAddress('');
    setNewIpNote('');
    showToast(`IP ${newEntry.ip} হোয়াইটলিস্টে যুক্ত করা হয়েছে`, 'success');
  };

  const handleDeleteIpWhitelist = (id: string) => {
    if (!settings) return;
    const currentList = settings.ipWhiteListEntries || [];
    setSettings({
      ...settings,
      ipWhiteListEntries: currentList.filter(item => item.id !== id)
    });
    showToast('IP হোয়াইটলিস্ট থেকে মুছে ফেলা হয়েছে', 'info');
  };

  // Save Settings Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      await communicationSettingsService.updateSettings(settings, 'usr-admin', 'Admin');
      showToast('যোগাযোগ ও এসএমএস সেটিংস সফলভাবে সংরক্ষিত হয়েছে', 'success');
    } catch (err: any) {
      showToast('সেটিংস সংরক্ষণে ত্রুটি: ' + err.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title="যোগাযোগ কেন্দ্র ও এসএমএস গেটওয়ে কনসোল"
        subtitle="সদস্যদের নোটিফিকেশন, স্বয়ংক্রিয় এসএমএস ও বকেয়া তাগিদ প্রেরণের কেন্দ্রীয় হাব"
      />

      {/* TOP METRICS & SMS BALANCE BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* SMS Balance Card */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-2xl p-4.5 border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                SMS Gateway: Active
              </span>
            </div>
            <p className="text-xs text-slate-300">অবশিষ্ট SMS ব্যালেন্স</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-0.5">
              {toBanglaNumber(stats.smsBalance)} <span className="text-xs font-normal text-slate-400">টি</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] px-2 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 font-mono">
              JAPAN TOWER
            </span>
            <p className="text-[10px] text-slate-400 mt-1.5">Approved Masking</p>
          </div>
        </div>

        {/* Today Sent */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] text-slate-500 font-medium">আজকে পাঠানো SMS</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {toBanglaNumber(stats.smsSentToday)} <span className="text-[10px] font-normal text-slate-400">টি</span>
          </p>
        </div>

        {/* Month Sent */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] text-slate-500 font-medium">চলতি মাসে মোট SMS</p>
          <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
            {toBanglaNumber(stats.smsSentThisMonth)} <span className="text-[10px] font-normal text-slate-400">টি</span>
          </p>
        </div>

        {/* WhatsApp Sent */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] text-slate-500 font-medium">WhatsApp পাঠানো</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {toBanglaNumber(stats.whatsappSent)} <span className="text-[10px] font-normal text-slate-400">টি</span>
          </p>
        </div>

        {/* Failed Messages */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] text-slate-500 font-medium">ব্যর্থ বার্তা (Failed)</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {toBanglaNumber(stats.failedMessages)} <span className="text-[10px] font-normal text-slate-400">টি</span>
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('compose')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'compose'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>এসএমএস পাঠান (Compose)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('due-reminders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'due-reminders'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>বকেয়া তাগিদ SMS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'templates'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>মেসেজ টেমপ্লেট</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>বার্তা ইতিহাস ও রিপোর্ট</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'settings'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>কনফিগারেশন ও অটোমেশন</span>
        </button>
      </div>

      {/* TAB 1: COMPOSE SMS */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Compose Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-500" />
                <span>নতুন এসএমএস বার্তা প্রস্তুত করুন</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                বিলিং কাল: <strong className="text-slate-800 dark:text-slate-200">{currentPeriodBangla}</strong>
              </span>
            </div>

            <form onSubmit={handleOpenConfirm} className="space-y-4 text-xs">
              {/* Recipient Target Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  প্রাপকের ধরণ নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'ALL_ACTIVE', label: `সকল সক্রিয় সদস্য (${toBanglaNumber(activeMembers.length)} জন)` },
                    { id: 'DUE_MEMBERS', label: `সকল বকেয়া সদস্য (${toBanglaNumber(activeMembers.filter(m => (m.computedDue || m.totalDue || 0) > 0).length)} জন)` },
                    { id: 'SINGLE_MEMBER', label: 'একজন নির্দিষ্ট সদস্য' },
                    { id: 'SINGLE_FLAT', label: 'একটি নির্দিষ্ট ফ্ল্যাট' },
                    { id: 'CUSTOM_MOBILE', label: 'কাস্টম মোবাইল নম্বর' },
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setRecipientTarget(target.id as RecipientTargetType)}
                      className={`p-2.5 rounded-xl border font-bold text-left transition-all ${
                        recipientTarget === target.id
                          ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 border-slate-900 dark:border-amber-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Target Input */}
              {recipientTarget === 'SINGLE_MEMBER' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    সদস্য নির্বাচন করুন
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                  >
                    {activeMembers.map(m => (
                      <option key={m.id} value={m.memberId}>
                        {m.name} ({(m.flatUnitNumbers || []).join(', ')}) - {m.phone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {recipientTarget === 'SINGLE_FLAT' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    ফ্ল্যাট ইউনিট নির্বাচন করুন
                  </label>
                  <select
                    value={selectedFlatNumber}
                    onChange={(e) => setSelectedFlatNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                  >
                    {activeFlats.map(u => (
                      <option key={u.id} value={u.unitNumber}>
                        ফ্ল্যাট {u.unitNumber} ({u.floor} তলা) - মালিক: {u.ownerName} ({u.ownerPhone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {recipientTarget === 'CUSTOM_MOBILE' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      প্রাপকের নাম
                    </label>
                    <input
                      type="text"
                      value={customRecipientName}
                      onChange={(e) => setCustomRecipientName(e.target.value)}
                      placeholder="নাম লিখুন"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      মোবাইল নম্বর (11 Digit BD)
                    </label>
                    <input
                      type="text"
                      value={customMobile}
                      onChange={(e) => setCustomMobile(e.target.value)}
                      placeholder="01711-XXXXXX"
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Template Picker */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  টেমপ্লেট থেকে বাছাই করুন
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tmpl.id)}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                        selectedTemplateId === tmpl.id
                          ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-300 font-bold shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {tmpl.titleBangla}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable Inserter Tags */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold">
                  ক্লিক করে ডায়নামিক ভেরিয়েবল যুক্ত করুন:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { tag: '{{memberName}}', label: 'সদস্যের নাম' },
                    { tag: '{{flatNumber}}', label: 'ফ্ল্যাট নং' },
                    { tag: '{{billingMonth}}', label: 'বিলিং মাস' },
                    { tag: '{{billingYear}}', label: 'বছর' },
                    { tag: '{{billAmount}}', label: 'বিলের টাকা' },
                    { tag: '{{dueAmount}}', label: 'বকেয়া টাকা' },
                    { tag: '{{receiptNumber}}', label: 'রসিদ নং' },
                  ].map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertVariable(v.tag)}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-mono border border-slate-300/80 dark:border-slate-700 cursor-pointer"
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Body Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    এসএমএস বার্তার টেক্সট <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400">
                    {smsCalculation.characterCount} বর্ণ | {toBanglaNumber(smsCalculation.smsCount)} SMS ({smsCalculation.isUnicode ? 'বাংলা/ইউনিকোড' : 'ইংরেজি'})
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="বার্তা লিখুন..."
                  className="w-full p-3.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500 leading-relaxed font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendTestSms}
                  disabled={isSending || !messageBody.trim()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>টেস্ট SMS পাঠান</span>
                </button>

                <button
                  type="submit"
                  disabled={isSending || !messageBody.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>এসএমএস ব্রডকাস্ট করুন</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right: Phone Live Preview & Gateway Info */}
          <div className="space-y-4">
            {/* Live Mobile Device Frame Mockup */}
            <div className="bg-slate-950 text-white rounded-3xl p-4 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400">
                <span className="font-bold flex items-center gap-1 text-amber-400">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>মোবাইল স্ক্রিন লাইভ প্রিভিউ</span>
                </span>
                <span>Sender: JAPAN TOWER</span>
              </div>

              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <span>JAPAN TOWER</span>
                  <span>এখনই</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-100 p-3 rounded-xl text-xs leading-relaxed font-sans">
                  {messageBody || 'বার্তা লিখলে এখানে প্রিভিউ দেখা যাবে...'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1">
                  <span>মোট অক্ষর: {smsCalculation.characterCount}</span>
                  <span className="text-amber-400 font-bold">খরচ: {toBanglaNumber(smsCalculation.smsCount)} ক্রেডিট</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ডুপ্লিকেট সুরক্ষা পলিসি সক্রিয়</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  একই সদস্যকে একই বিলিং সাইকেলের জন্য ২৪ ঘণ্টার মধ্যে পুনরায় অসাবধানতাবশত একাধিক এসএমএস প্রেরণ থেকে সিস্টেম স্বয়ংক্রিয়ভাবে সুরক্ষা দেয়।
                </p>
              </div>
            </div>

            {/* Provider Security Notice */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>নিরাপদ গেটওয়ে আর্কিটেকচার</span>
              </div>
              <p className="text-amber-800 dark:text-amber-400 text-[11px] leading-relaxed">
                কোনো গেটওয়ে API Secret বা Auth Token ক্লায়েন্ট ব্রাউজারে উন্মুক্ত করা হয় না। সমস্ত এসএমএস অনুরোধ ব্যাকএন্ড ফায়ারবেস ফাংশন ও প্রোভাইডার অ্যাডাপ্টারের মাধ্যমে প্রসেস হয়।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DUE REMINDERS */}
      {activeTab === 'due-reminders' && (
        <div className="space-y-4">
          {/* Due Filters Header */}
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  বকেয়া সদস্যদের স্বয়ংক্রিয় তাগিদ এসএমএস
                </h3>
                <p className="text-xs text-slate-500">
                  নির্বাচিত বিলিং পিরিয়ড ও ফিল্টার অনুযায়ী সদস্যদের এক ক্লিকে তাগিদ পাঠান
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={dueStatusFilter}
                onChange={(e) => setDueStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">সকল বকেয়া</option>
                <option value="DUE">সম্পূর্ণ বকেয়া (DUE)</option>
                <option value="PARTIAL">আংশিক বকেয়া (PARTIAL)</option>
              </select>

              <button
                type="button"
                onClick={handleSendDueReminders}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>নির্বাচিতদের তাগিদ SMS পাঠান ({toBanglaNumber(dueMembersList.length)} জন)</span>
              </button>
            </div>
          </div>

          {/* Due Members Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">সদস্যের নাম</th>
                    <th className="p-3.5">ফ্ল্যাট ইউনিট</th>
                    <th className="p-3.5">মোবাইল</th>
                    <th className="p-3.5 text-right">মোট বিল</th>
                    <th className="p-3.5 text-right">পরিশোধ</th>
                    <th className="p-3.5 text-right">মোট বকেয়া</th>
                    <th className="p-3.5 text-center">স্ট্যাটাস</th>
                    <th className="p-3.5 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dueMembersList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                        কোনো বকেয়া সদস্য পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    dueMembersList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {m.name}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                          {(m.flatUnitNumbers || []).join(', ')}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {m.phone}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          ৳{toBanglaNumber(m.totalBill || m.computedBill || 0)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-emerald-600 font-bold">
                          ৳{toBanglaNumber(m.totalPaid || m.computedPaid || 0)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                          ৳{toBanglaNumber(m.computedDue || m.totalDue || 0)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            বকেয়া
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              const tmpl = templates.find(t => t.type === 'DUE_REMINDER') || templates[2];
                              const msg = templateService.replaceVariables(tmpl.body, {
                                memberName: m.name,
                                flatNumber: (m.flatUnitNumbers || []).join(', '),
                                billingMonth: currentPeriodBangla.split(' ')[0],
                                billingYear: String(selectedYear),
                                dueAmount: (m.computedDue || m.totalDue || 0).toLocaleString('bn-BD'),
                              });
                              const res = await smsService.sendSms({
                                recipientMobile: m.phone,
                                recipientName: m.name,
                                message: msg,
                                memberId: m.memberId,
                                flatNumber: (m.flatUnitNumbers || []).join(', '),
                                templateType: 'DUE_REMINDER',
                                billingPeriodId: currentPeriodId,
                                sentBy: 'Admin',
                              });
                              if (res.success) {
                                showToast(`তাগিদ SMS পাঠানো হয়েছে: ${m.name}`, 'success');
                              } else {
                                showToast(res.errorMessage || 'Failed', 'error');
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>SMS</span>
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
      )}

      {/* TAB 3: MESSAGE TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                মেসেজ ও নোটিফিকেশন টেমপ্লেট লাইব্রেরি
              </h3>
              <p className="text-xs text-slate-500">
                পেমেন্ট রসিদ, মাসিক বিল, বকেয়া তাগিদ এবং নোটিশের প্রমিত বার্তা
              </p>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
              মোট {toBanglaNumber(templates.length)} টি টেমপ্লেট
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div 
                key={tmpl.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-mono">
                      {tmpl.type}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                      সক্রিয়
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tmpl.titleBangla}
                  </h4>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200/60 dark:border-slate-700/60 font-sans">
                    {tmpl.body}
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {tmpl.variables.map(v => (
                      <span key={v} className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded text-[9px] font-mono border border-amber-200/60 dark:border-amber-800/40">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {tmpl.isSystemDefault ? 'সিস্টেম ডিফল্ট' : 'কাস্টম'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setActiveTab('compose');
                      handleTemplateChange(tmpl.id);
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Send className="w-3 h-3 text-amber-500" />
                    <span>এই টেমপ্লেট দিয়ে SMS পাঠান</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LOGS & FAILED MESSAGES */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="প্রাপক, মোবাইল বা মেসেজ খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="ALL">সকল চ্যানেল</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="NOTIFICATION">Notification</option>
              </select>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="ALL">সকল স্ট্যাটাস</option>
                <option value="SENT">সফল (SENT)</option>
                <option value="FAILED">ব্যর্থ (FAILED)</option>
                <option value="PENDING">অপেক্ষমান (PENDING)</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">তারিখ ও সময়</th>
                    <th className="p-3.5">প্রাপক</th>
                    <th className="p-3.5">মোবাইল</th>
                    <th className="p-3.5">চ্যানেল</th>
                    <th className="p-3.5">মেসেজ সারসংক্ষেপ</th>
                    <th className="p-3.5 text-center">স্ট্যাটাস</th>
                    <th className="p-3.5 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        কোনো মেসেজ রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                          {new Date(log.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {log.recipientName}
                          {log.flatNumber && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              ফ্ল্যাট: {log.flatNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {log.recipientMobile}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.channel === 'SMS' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : log.channel === 'WHATSAPP'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.channel}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-slate-700 dark:text-slate-300">
                          {log.message}
                          {log.errorMessage && (
                            <span className="block text-[10px] text-rose-500 font-medium">
                              ত্রুটি: {log.errorMessage}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'SENT' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : log.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.status === 'SENT' ? 'সফল' : log.status === 'FAILED' ? 'ব্যর্থ' : log.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {log.status === 'FAILED' && (
                            <button
                              type="button"
                              onClick={() => handleRetry(log)}
                              disabled={retryingLogId === log.id}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 ml-auto shadow-2xs disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
                              <span>পুনরায় পাঠান ({toBanglaNumber(log.retryCount || 0)})</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SETTINGS & AUTOMATION */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* 1. API GATEWAY CONFIGURATION */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-500" />
                  <span>SMS API গেটওয়ে ও সার্ভিস প্রোভাইডার সেটআপ</span>
                </h3>
                <p className="text-xs text-slate-500">
                  BulksmsBD, Greenweb, Teletalk বা যেকোনো থার্ড-পার্টি কোম্পানির HTTP REST API ইন্টিগ্রেশন
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold rounded-full border border-amber-200 text-xs">
                {settings.smsProviderName || 'BulksmsBD / Custom Gateway'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  প্রোভাইডার টাইপ / সার্ভিস নাম
                </label>
                <select
                  value={settings.smsGatewayProvider || 'BULKSMSBD'}
                  onChange={(e) => setSettings({ ...settings, smsGatewayProvider: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="BULKSMSBD">BulksmsBD API Gateway (bulksmsbd.net)</option>
                  <option value="GREENWEB">Greenweb SMS API (greenweb.com.bd)</option>
                  <option value="TELETALK">Teletalk SMS Gateway</option>
                  <option value="GENERIC_HTTP">Generic HTTP GET/POST Custom Provider</option>
                  <option value="CUSTOM">Custom Enterprise API</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  API Endpoint URL
                </label>
                <input
                  type="text"
                  value={settings.smsApiUrl || 'http://bulksmsbd.net/api/smsapi'}
                  onChange={(e) => setSettings({ ...settings, smsApiUrl: e.target.value })}
                  placeholder="e.g. http://bulksmsbd.net/api/smsapi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  API Key / Secret Token
                </label>
                <input
                  type="password"
                  value={settings.smsApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, smsApiKey: e.target.value })}
                  placeholder="আপনার কেনা API Key এখানে দিন"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sender ID / Masking নাম
                </label>
                <input
                  type="text"
                  value={settings.smsSenderId || 'JAPAN TOWER'}
                  onChange={(e) => setSettings({ ...settings, smsSenderId: e.target.value })}
                  placeholder="e.g. JAPAN TOWER"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  HTTP Request Method
                </label>
                <select
                  value={settings.smsHttpMethod || 'GET'}
                  onChange={(e) => setSettings({ ...settings, smsHttpMethod: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="GET">HTTP GET Query Parameters</option>
                  <option value="POST">HTTP POST Form Body / JSON</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  API Key Param Name
                </label>
                <input
                  type="text"
                  value={settings.smsParamApiKey || 'api_key'}
                  onChange={(e) => setSettings({ ...settings, smsParamApiKey: e.target.value })}
                  placeholder="e.g. api_key or token"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sender ID Param Name
                </label>
                <input
                  type="text"
                  value={settings.smsParamSenderId || 'sender_id'}
                  onChange={(e) => setSettings({ ...settings, smsParamSenderId: e.target.value })}
                  placeholder="e.g. sender_id or type"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number Param Name
                </label>
                <input
                  type="text"
                  value={settings.smsParamMobile || 'number'}
                  onChange={(e) => setSettings({ ...settings, smsParamMobile: e.target.value })}
                  placeholder="e.g. number or mobile"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message Text Param Name
                </label>
                <input
                  type="text"
                  value={settings.smsParamMessage || 'message'}
                  onChange={(e) => setSettings({ ...settings, smsParamMessage: e.target.value })}
                  placeholder="e.g. message or msg"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. IP WHITE LISTING SETTINGS (Exact layout requested by user) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>IP White Listing Setting</span>
                </h3>
                <p className="text-xs text-slate-500">
                  নিরাপত্তা সুরক্ষায় নির্দিষ্ট IP ছাড়া অনাকাঙ্ক্ষিত API/WEB এক্সেস প্রতিরোধ করুন
                </p>
              </div>

              {/* Source IP Checking Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Source IP Checking* :</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, ipWhiteListingEnabled: true })}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                      settings.ipWhiteListingEnabled
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Enable
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, ipWhiteListingEnabled: false })}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                      !settings.ipWhiteListingEnabled
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Disable
                  </button>
                </div>
              </div>
            </div>

            {/* Create IP White Listing Form */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Create IP White Listing
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Type * :
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {(['ALL', 'API', 'WEB'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-1 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="ipType"
                          value={t}
                          checked={newIpType === t}
                          onChange={() => setNewIpType(t)}
                          className="w-3.5 h-3.5 text-emerald-600"
                        />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    IP * :
                  </label>
                  <input
                    type="text"
                    value={newIpAddress}
                    onChange={(e) => setNewIpAddress(e.target.value)}
                    placeholder="Enter IP (e.g. 103.150.12.5)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Note / বিবরণ (Optional):
                  </label>
                  <input
                    type="text"
                    value={newIpNote}
                    onChange={(e) => setNewIpNote(e.target.value)}
                    placeholder="e.g. BulksmsBD Ingress Server"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddIpWhitelist}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>+ IP যুক্ত করুন</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Whitelisted IP Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">অনুমোদিত IP এড্রেস</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">বিবরণ / নোট</th>
                    <th className="p-3">যুক্ত করার সময়</th>
                    <th className="p-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(!settings.ipWhiteListEntries || settings.ipWhiteListEntries.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                        বর্তমানে কোনো IP হোয়াইটলিস্টে যুক্ত করা নেই।
                      </td>
                    </tr>
                  ) : (
                    settings.ipWhiteListEntries.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {item.ip}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            item.type === 'ALL'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : item.type === 'API'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {item.note || '—'}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[10px]">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteIpWhitelist(item.id)}
                            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-lg font-bold text-[10px]"
                          >
                            মুছে ফেলুন
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. AUTOMATION & NOTIFICATION SETTINGS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-500" />
              <span>এসএমএস ও হোয়াটসঅ্যাপ অটোমেশন সেটিংস</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* SMS Settings Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    এসএমএস ট্রিগার
                  </h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smsEnabled}
                      onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>টাকা জমা হলে স্বয়ংক্রিয় রসিদ SMS</span>
                    <input
                      type="checkbox"
                      checked={settings.autoSendPaymentSms}
                      onChange={(e) => setSettings({ ...settings, autoSendPaymentSms: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>মাসিক বিল প্রকাশিত হলে ব্রডকাস্ট SMS</span>
                    <input
                      type="checkbox"
                      checked={settings.autoSendBillPublishedSms}
                      onChange={(e) => setSettings({ ...settings, autoSendBillPublishedSms: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>বকেয়া তাগিদ স্বয়ংক্রিয় SMS</span>
                    <input
                      type="checkbox"
                      checked={settings.autoSendDueReminderSms}
                      onChange={(e) => setSettings({ ...settings, autoSendDueReminderSms: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* In-App Notification Settings Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    ইন-অ্যাপ নোটিফিকেশন সেটিংস
                  </h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.inAppNotificationsEnabled}
                      onChange={(e) => setSettings({ ...settings, inAppNotificationsEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>পেমেন্ট জমা নোটিফিকেশন</span>
                    <input
                      type="checkbox"
                      checked={settings.notifyPaymentReceived}
                      onChange={(e) => setSettings({ ...settings, notifyPaymentReceived: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>বিল প্রস্তুত ও প্রকাশ নোটিফিকেশন</span>
                    <input
                      type="checkbox"
                      checked={settings.notifyBillPublished}
                      onChange={(e) => setSettings({ ...settings, notifyBillPublished: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>জরুরি নোটিশ ব্রডকাস্ট</span>
                    <input
                      type="checkbox"
                      checked={settings.notifyNotice}
                      onChange={(e) => setSettings({ ...settings, notifyNotice: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isSavingSettings ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SAFETY CONFIRMATION MODAL */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="এসএমএস প্রেরণের চূড়ান্ত নিশ্চিতকরণ"
        subtitle="সদস্যদের বার্তা পাঠানোর পূর্বে প্রাপক ও ক্রেডিট হিসাব যাচাই করুন"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs font-bengali">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>নিরাপত্তা চেক ও প্রাপক পরিসংখ্যান</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-slate-500">মোট প্রাপক</span>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {toBanglaNumber(pendingRecipients.length)} জন
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-slate-500">বৈধ নম্বর</span>
                <p className="text-base font-bold text-emerald-600">
                  {toBanglaNumber(pendingRecipients.filter(r => smsService.normalizeMobileNumber(r.recipientMobile).isValid).length)} টি
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-slate-500">প্রত্যাশিত SMS পার্ট</span>
                <p className="text-base font-bold text-sky-600">
                  {toBanglaNumber(smsCalculation.smsCount)} টি/ব্যক্তি
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] text-slate-500">মোট ক্রেডিট খরচ</span>
                <p className="text-base font-bold text-amber-600">
                  ~{toBanglaNumber(pendingRecipients.length * smsCalculation.smsCount)} ক্রেডিট
                </p>
              </div>
            </div>
          </div>

          {/* Sample Message Preview */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              নমুনা বার্তা প্রিভিউ:
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
              {pendingRecipients[0]?.message || messageBody}
            </p>
          </div>

          {/* Explicit Checkbox Confirmation */}
          <label className="flex items-start gap-2.5 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isAgreedToTerms}
              onChange={(e) => setIsAgreedToTerms(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded mt-0.5"
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              আমি নিশ্চিত করছি যে নির্বাচিত {toBanglaNumber(pendingRecipients.length)} জন সদস্যের কাছে এই বার্তা পাঠানো হবে এবং গেটওয়ে ব্যালেন্স থেকে ক্রেডিট কর্তন করা হবে।
            </span>
          </label>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleExecuteSend}
              disabled={!isAgreedToTerms || isSending}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>এখনই পাঠান</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
