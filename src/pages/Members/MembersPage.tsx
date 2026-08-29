import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Building2, 
  Phone, 
  MessageSquare, 
  Send, 
  ShieldCheck,
  CheckCircle2, 
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Link2,
  Unlink,
  AlertCircle,
  Sparkles,
  DollarSign,
  Edit,
  Power
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Member, FlatUnit, PaymentRecord, ExpenseItem } from '../../types';
import { sampleMembers, sampleUnits, sampleExpensesJune2025 } from '../../data/mockData';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';
import { paymentService } from '../../services/paymentService';
import { expenseService } from '../../services/expenseService';
import { demoDataService } from '../../services/demoDataService';
import { buildingSettingsService } from '../../services/buildingSettingsService';
import { calculateDualBilling, isKhalilurMember } from '../../utils/billingCalculator';
import { useToast } from '../../components/common/Toast';
import { useTranslation } from '../../i18n/LanguageContext';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';

interface MembersPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({ onNavigateTab }) => {
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();
  const { showToast } = useToast();
  const { billingPeriodId } = useBillingPeriod();

  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [flats, setFlats] = useState<FlatUnit[]>(sampleUnits);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  // Multi-Flat Assign State inside View Modal
  const [selectedFlatToAssign, setSelectedFlatToAssign] = useState<string>('');
  const [isAssigningFlat, setIsAssigningFlat] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formBanglaName, setFormBanglaName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formType, setFormType] = useState<'INDIVIDUAL' | 'COMPANY' | 'PROPERTY_OWNER' | 'COMMERCIAL' | 'FLAT_OWNER'>('INDIVIDUAL');
  const [formFlats, setFormFlats] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [defaultBillAmount, setDefaultBillAmount] = useState<number>(1997);

  useEffect(() => {
    buildingSettingsService.getSystemBilling()
      .then((settings) => {
        if (settings && typeof settings.defaultMonthlyBill === 'number') {
          setDefaultBillAmount(settings.defaultMonthlyBill);
        }
      })
      .catch((err) => console.error('Failed to load system billing settings:', err));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribeMembers = memberService.subscribeToMembers((loadedMembers) => {
      setMembers(loadedMembers);
      if (viewingMember) {
        const updated = loadedMembers.find(m => m.id === viewingMember.id || m.memberId === viewingMember.memberId);
        if (updated) setViewingMember(updated);
      }
      setIsLoading(false);
    });

    const unsubscribeFlats = flatService.subscribeToFlats((loadedFlats) => {
      setFlats(loadedFlats);
    });

    const unsubscribePayments = paymentService.subscribeToPayments((loadedPay) => {
      setPayments(loadedPay);
    }, billingPeriodId);

    const unsubscribeExpenses = expenseService.subscribeToExpenses((loadedExp) => {
      setExpenses(loadedExp.length > 0 ? loadedExp : (billingPeriodId === '2025-06' ? sampleExpensesJune2025 : []));
    }, billingPeriodId);

    return () => {
      unsubscribeMembers();
      unsubscribeFlats();
      unsubscribePayments();
      unsubscribeExpenses();
    };
  }, [viewingMember?.id, viewingMember?.memberId, billingPeriodId]);

  const getMemberPeriodFinancials = (member: Member) => {
    const flatCount = (member.flatUnitNumbers && member.flatUnitNumbers.length > 0)
      ? member.flatUnitNumbers.length
      : (member.totalUnits || 1);

    const isKh = isKhalilurMember(member.memberId);
    const periodExp = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
    const effectiveExp = periodExp.length > 0 ? periodExp : (billingPeriodId === '2025-06' ? sampleExpensesJune2025 : []);
    const isMasterCleared = typeof window !== 'undefined' && localStorage.getItem('jct_master_cleared') === 'true';
    const dualCalc = calculateDualBilling(effectiveExp, isMasterCleared ? flats.length : (flats.length || 28));

    const monthlyBill = isKh 
      ? dualCalc.khalilur.totalBill 
      : (flatCount * (dualCalc.regularRoundedPerFlat || defaultBillAmount));

    const memberPayments = payments.filter(
      (p) => (p.billingPeriodId || p.month) === billingPeriodId &&
             (p.memberId === member.memberId || p.memberId === member.id || (p.memberName && p.memberName.toLowerCase().trim() === member.name.toLowerCase().trim()))
    );

    const totalPaid = memberPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const systemHasPayments = payments.length > 0;
    const totalDue = systemHasPayments ? Math.max(0, monthlyBill - totalPaid) : 0;
    const isFullyPaid = systemHasPayments && totalPaid >= monthlyBill && monthlyBill > 0;

    return {
      flatCount,
      monthlyBill,
      totalPaid,
      totalDue,
      isFullyPaid,
      systemHasPayments,
      hasPaidSome: totalPaid > 0,
      isKhalilur: isKh,
      khalilurBreakdown: isKh ? dualCalc.khalilur : null
    };
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.banglaName && member.banglaName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.flatUnitNumbers || []).some((u) => u.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'ALL' || member.memberType === selectedType;

    return matchesSearch && matchesType;
  });

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormName('');
    setFormBanglaName('');
    setFormPhone('');
    setFormEmail('');
    setFormType('INDIVIDUAL');
    setFormFlats('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormBanglaName(member.banglaName || member.name);
    setFormPhone(member.phone);
    setFormEmail(member.email || '');
    setFormType(member.memberType);
    setFormFlats((member.flatUnitNumbers || []).join(', '));
    setIsAddModalOpen(true);
  };

  const handleToggleStatus = async (member: Member) => {
    try {
      const newStatus = await memberService.toggleMemberStatus(member.memberId, member.status, 'Admin');
      showToast(`সদস্য ${member.name}-এর স্ট্যাটাস ${newStatus === 'ACTIVE' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'} করা হয়েছে`, 'info');
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Status toggle failed'), 'error');
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (window.confirm(`আপনি কি নিশ্চিত যে সদস্য "${member.name}" (${member.memberId}) কে ডাটাবেজ থেকে মুছে ফেলতে চান?`)) {
      try {
        await memberService.deleteMember(member.memberId || member.id);
        showToast(`সদস্য "${member.name}" ডাটাবেজ থেকে মুছে ফেলা হয়েছে`, 'success');
      } catch (err: any) {
        showToast('সদস্য মুছে ফেলতে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
      }
    }
  };

  const handleClearMasterData = async () => {
    if (window.confirm('সতর্কতা: আপনি কি সকল ডিফল্ট ২৮টি ফ্ল্যাট এবং ২৫টি সদস্য ডাটা মুছে ফেলে নতুনভাবে ফায়ারবেসে তথ্য যুক্ত করতে চান?')) {
      try {
        const res = await demoDataService.clearMasterMembersAndFlats('Admin');
        showToast(`সকল ডিফল্ট সদস্য (${res.deletedMembersCount} জন) ও ফ্ল্যাট (${res.deletedFlatsCount} টি) মুছে ফেলা হয়েছে। এখন আপনি নতুনভাবে এন্ট্রি দিতে পারবেন!`, 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err: any) {
        showToast('ডিফল্ট ডাটা মুছে ফেলতে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
      }
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showToast(isBangla ? 'সদস্যের নাম এবং মোবাইল নম্বর প্রদান করুন' : 'Please provide member name and mobile number', 'warning');
      return;
    }

    const flatList = formFlats
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      if (editingMember) {
        await memberService.updateMember(editingMember.memberId, {
          name: formName,
          banglaName: formBanglaName || formName,
          memberType: formType,
          memberTypeBangla:
            formType === 'PROPERTY_OWNER'
              ? 'কোম্পানি / প্রপার্টি ওনার'
              : formType === 'COMPANY'
              ? 'কোম্পানি'
              : formType === 'COMMERCIAL'
              ? 'বাণিজ্যিক'
              : 'ব্যক্তিগত মালিক',
          phone: formPhone,
          email: formEmail,
          flatUnitNumbers: flatList.length > 0 ? flatList : editingMember.flatUnitNumbers,
          totalUnits: flatList.length > 0 ? flatList.length : editingMember.totalUnits
        });
        showToast(`সদস্য ${formName}-এর তথ্য সফলভাবে এডিট করা হয়েছে`, 'success');
      } else {
        const existingNums = members.map(m => {
          const match = m.memberId.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        });
        const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
        const nextNum = maxNum + 1;
        const generatedId = `JCT-${String(nextNum).padStart(3, '0')}`;

        const newMember: Member = {
          id: `mem-${Date.now()}`,
          memberId: generatedId,
          name: formName,
          banglaName: formBanglaName || formName,
          memberType: formType,
          memberTypeBangla:
            formType === 'PROPERTY_OWNER'
              ? 'কোম্পানি / প্রপার্টি ওনার'
              : formType === 'COMPANY'
              ? 'কোম্পানি'
              : formType === 'COMMERCIAL'
              ? 'বাণিজ্যিক'
              : 'ব্যক্তিগত মালিক',
          phone: formPhone,
          email: formEmail,
          flatUnitNumbers: flatList.length > 0 ? flatList : ['2-A'],
          totalUnits: flatList.length > 0 ? flatList.length : 1,
          totalBill: (flatList.length || 1) * defaultBillAmount,
          totalPaid: 0,
          totalDue: (flatList.length || 1) * defaultBillAmount,
          status: 'ACTIVE',
          joinedDate: new Date().toISOString().split('T')[0],
          isMasterData: true,
          isDemo: false
        };

        await memberService.upsertMember(newMember);
        showToast(`${newMember.name} স্থায়ী সদস্য হিসেবে যুক্ত হয়েছে`, 'success');
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Could not save member'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignFlatToViewingMember = async () => {
    if (!viewingMember || !selectedFlatToAssign) return;
    setIsAssigningFlat(true);
    try {
      const updated = await memberService.addFlatToMember(viewingMember, selectedFlatToAssign);
      setViewingMember(updated);
      setSelectedFlatToAssign('');
      showToast(`ফ্ল্যাট ${selectedFlatToAssign} সদস্যের নামে সফলভাবে যুক্ত করা হয়েছে`, 'success');
    } catch (err: any) {
      showToast('Error assigning flat: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsAssigningFlat(false);
    }
  };

  const handleRemoveFlatFromViewingMember = async (unitNumber: string) => {
    if (!viewingMember) return;
    const confirmMsg = `আপনি কি নিশ্চিত যে ফ্ল্যাট ${unitNumber} সদস্য ${viewingMember.name} থেকে মুক্ত করতে চান? (ফ্ল্যাটের মাস্টার ডাটা মুছে যাবে না)`;

    if (window.confirm(confirmMsg)) {
      try {
        const updated = await memberService.removeFlatFromMember(viewingMember, unitNumber);
        setViewingMember(updated);
        showToast(`ফ্ল্যাট ${unitNumber} আনলিংক করা হয়েছে`, 'info');
      } catch (err: any) {
        showToast('Error unlinking flat: ' + (err.message || 'Unknown error'), 'error');
      }
    }
  };

  const handleSendSms = (member: Member) => {
    showToast(`${member.name} (${member.phone}) - SMS Draft Ready`, 'info');
  };

  const handleSendWhatsApp = (member: Member) => {
    const text = `আসসালামু আলাইকুম ${member.name}। জাপান সিটি টাওয়ার কমন বিল সংক্রান্ত আপডেট। আপনার ফ্ল্যাট: ${(member.flatUnitNumbers || []).join(', ')}`;
    window.open(`https://wa.me/880${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Available flats not yet owned by this member
  const availableFlatsForAssign = flats.filter(
    (f) => !(viewingMember?.flatUnitNumbers || []).includes(f.unitNumber)
  );

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title="সদস্য মাস্টার ডেটা ব্যবস্থাপনা (Member Master Data Management)"
        subtitle="জাপান সিটি টাওয়ার ফ্ল্যাট মালিকদের অ্যাকাউন্টস, মাল্টি-ফ্ল্যাট সংযোগ ও প্রোফাইল সেটিংস"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleClearMasterData}
              className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-all cursor-pointer"
              title="ডিফল্ট ২৮টি ফ্ল্যাট ও ২৫টি সদস্য তথ্য পুরোপুরি মুছে নতুন এন্ট্রি দিন"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ডিফল্ট মেম্বার/ফ্ল্যাট মুছুন</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>নতুন সদস্য রেজিস্টার করুন</span>
            </button>
          </div>
        }
      />

      {/* Member Master Data Protection Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">স্থায়ী সদস্য ডাটাবেজ (JCT-001 ~ JCT-008)</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Protected Master Members
              </span>
            </div>
            <p className="text-xs text-slate-400">
              একটি সদস্যের আন্ডারে একাধিক ফ্ল্যাট লিঙ্কিং (Multi-Flat) সমর্থন করে। প্রতিটি ফ্ল্যাট পরিবর্তন লগিং সিস্টেমে নথিভুক্ত হয়।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">মোট সদস্য: </span>
            <span className="text-amber-400 font-bold">{members.length} জন</span>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">সক্রিয়: </span>
            <span className="text-emerald-400 font-bold">{members.filter(m => m.status === 'ACTIVE').length} জন</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সদস্যের নাম, Member ID বা ফ্ল্যাট নম্বর খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500">ক্যাটাগরি:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="ALL">সকল ক্যাটাগরি</option>
            <option value="INDIVIDUAL">ব্যক্তিগত মালিক</option>
            <option value="PROPERTY_OWNER">প্রপার্টি ওনার</option>
            <option value="COMPANY">কোম্পানি</option>
            <option value="COMMERCIAL">বাণিজ্যিক</option>
          </select>
        </div>
      </div>

      {/* Desktop Members Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Member ID</th>
                <th className="p-3.5">সদস্যের নাম</th>
                <th className="p-3.5">ক্যাটাগরি</th>
                <th className="p-3.5">বরাদ্দকৃত ফ্ল্যাটসমূহ</th>
                <th className="p-3.5">মোবাইল</th>
                <th className="p-3.5 text-right">মাসিক বিল</th>
                <th className="p-3.5 text-right">বকেয়া</th>
                <th className="p-3.5 text-center">স্ট্যাটাস</th>
                <th className="p-3.5 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMembers.map((member) => {
                const fin = getMemberPeriodFinancials(member);
                return (
                  <tr key={member.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span>{member.memberId}</span>
                        <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          Master
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{member.name}</p>
                      {member.banglaName && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{member.banglaName}</p>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px]">
                        {isBangla ? member.memberTypeBangla : member.memberType}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {(member.flatUnitNumbers || []).map((unit) => (
                          <span
                            key={unit}
                            className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold font-mono rounded-md text-xs border border-amber-200 dark:border-amber-800"
                          >
                            {unit}
                          </span>
                        ))}
                        {(member.totalUnits || 0) > 1 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold ml-1">
                            ({formatNumber(member.totalUnits)}টি ফ্ল্যাট)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{member.phone}</td>
                    <td className="p-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatCurrency(fin.monthlyBill)}
                    </td>
                    <td className="p-3.5 text-right font-bold">
                      {fin.isFullyPaid ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {isBangla ? 'পরিশোধিত (৳০)' : 'Paid (৳0)'}
                        </span>
                      ) : fin.hasPaidSome ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {formatCurrency(fin.totalDue)} {isBangla ? 'বকেয়া' : 'Due'}
                        </span>
                      ) : fin.systemHasPayments ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {formatCurrency(fin.monthlyBill)} {isBangla ? 'বকেয়া' : 'Due'}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 font-bold">
                          ৳০ {isBangla ? 'বকেয়া' : 'Due'}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(member)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 mx-auto cursor-pointer transition-colors ${
                          member.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                        title="স্ট্যাটাস টগল করুন"
                      >
                        <Power className="w-3 h-3" />
                        <span>{member.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingMember(member)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="প্রোফাইল ও মাল্টি-ফ্ল্যাট ম্যানেজ"
                        >
                          <Eye className="w-4 h-4 text-sky-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(member)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="এডিট সদস্য তথ্য"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(member)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer"
                          title="হোয়াটসঅ্যাপ বার্তা"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="সদস্য মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Mobile Members List */}
      <div className="md:hidden space-y-3">
        {filteredMembers.map((member) => {
          const fin = getMemberPeriodFinancials(member);
          return (
            <div key={member.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono text-slate-400 font-bold block">
                    {member.memberId}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{member.name}</h3>
                  <span className="text-xs text-slate-500">
                    {isBangla ? member.memberTypeBangla : member.memberType}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold block border ${
                    member.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {member.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                  <span className={`text-xs font-bold block ${
                    fin.isFullyPaid 
                      ? 'text-emerald-600' 
                      : fin.hasPaidSome 
                        ? 'text-amber-600' 
                        : fin.systemHasPayments 
                          ? 'text-rose-600' 
                          : 'text-slate-500'
                  }`}>
                    {fin.isFullyPaid 
                      ? (isBangla ? 'পরিশোধিত (৳০)' : 'Paid (৳0)') 
                      : fin.hasPaidSome 
                        ? `${formatCurrency(fin.totalDue)} বকেয়া` 
                        : fin.systemHasPayments 
                          ? `${formatCurrency(fin.monthlyBill)} বকেয়া` 
                          : (isBangla ? '৳০ বকেয়া' : '৳0 Due')}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {(member.flatUnitNumbers || []).map((u) => (
                      <span key={u} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold font-mono rounded-sm text-[11px]">
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>📞 {member.phone}</span>
                  <span>মাসিক বিল: {formatCurrency(fin.monthlyBill)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setViewingMember(member)}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
                >
                  প্রোফাইল ও ফ্ল্যাট &rarr;
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(member)}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(member)}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(member)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    title="সদস্য মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Member Details & Multi-Flat Management Modal */}
      {viewingMember && (
        <Modal
          isOpen={Boolean(viewingMember)}
          onClose={() => setViewingMember(null)}
          title={`সদস্য প্রোফাইল: ${viewingMember.name}`}
          subtitle={`Member ID: ${viewingMember.memberId} (Protected Master Record)`}
          maxWidth="lg"
        >
          <div className="space-y-4 font-bengali">
            {/* Header Card */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{viewingMember.name}</h3>
                <p className="text-xs text-amber-400 mt-0.5">
                  {isBangla ? viewingMember.memberTypeBangla : viewingMember.memberType}
                </p>
                <p className="text-xs text-slate-300 mt-1">📞 {viewingMember.phone} | ✉ {viewingMember.email || 'N/A'}</p>
              </div>
              <div className="sm:text-right">
                <span className="text-xs text-slate-400 block">মোট ফ্ল্যাট সংখ্যা</span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {formatNumber(viewingMember.totalUnits)} টি
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            {(() => {
              const vFin = getMemberPeriodFinancials(viewingMember);
              return (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-400">মোট মাসিক বিল</span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{formatCurrency(vFin.monthlyBill)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">পরিশোধিত</span>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">{formatCurrency(vFin.totalPaid)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">বকেয়া</span>
                      <p className="font-bold text-rose-600 dark:text-rose-400 text-sm mt-0.5">{formatCurrency(vFin.totalDue)}</p>
                    </div>
                  </div>

                  {/* Special Breakdown for Khalilur Rahman Properties */}
                  {vFin.isKhalilur && vFin.khalilurBreakdown && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 text-xs space-y-1.5 font-bengali">
                      <div className="flex items-center justify-between font-bold text-purple-900 dark:text-purple-300">
                        <span>বিশেষ অনুমোদিত বিল ফর্মুলা (খলিলুর প্রপার্টিস):</span>
                        <span className="text-sm font-black">{formatCurrency(vFin.khalilurBreakdown.totalBill)}</span>
                      </div>
                      <div className="text-[11px] text-purple-800 dark:text-purple-300 space-y-0.5">
                        <p>• ৩ ফ্ল্যাটের কমন খরচ: (কমন খরচ ÷ ২৮) × ৩ = {formatCurrency(vFin.khalilurBreakdown.flatsAmount)}</p>
                        <p>• দারোয়ানের বেতন শেয়ার: (দারোয়ান ÷ ২৮) × ৫ = {formatCurrency(vFin.khalilurBreakdown.guardAmount)}</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                          = মোট বিল: {formatCurrency(vFin.khalilurBreakdown.totalBill)} (প্রতি ফ্ল্যাট {formatCurrency(vFin.khalilurBreakdown.perFlatBill)})
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Multi-Flat Allocation Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>মাল্টি-ফ্ল্যাট সংযোগ (Multi-Flat Unit Allocation)</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-bold">
                  {formatNumber((viewingMember.flatUnitNumbers || []).length)} টি ফ্ল্যাট সংযুক্ত
                </span>
              </div>

              {/* Units List with Unlink Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(viewingMember.flatUnitNumbers || []).map((flat) => (
                  <div 
                    key={flat} 
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                          ফ্ল্যাট {flat}
                        </span>
                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-[10px] font-bold rounded-sm">
                          {formatCurrency(defaultBillAmount)}/মাস
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        কমন মেইনটেন্যান্স ধার্যকৃত
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFlatFromViewingMember(flat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                      title="ফ্ল্যাট আনলিংক করুন"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">বিচ্ছিন্ন করুন</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Unit to Member Subsection */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>নতুন ফ্ল্যাট বরাদ্দ দিন</span>
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={selectedFlatToAssign}
                    onChange={(e) => setSelectedFlatToAssign(e.target.value)}
                    className="w-full sm:w-64 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="">-- ফ্ল্যাট বাছাই করুন --</option>
                    {availableFlatsForAssign.map((f) => (
                      <option key={f.unitNumber} value={f.unitNumber}>
                        ফ্ল্যাট {f.unitNumber} ({f.floor} তলা) - {f.ownerName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedFlatToAssign || isAssigningFlat}
                    onClick={handleAssignFlatToViewingMember}
                    className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isAssigningFlat ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>ফ্ল্যাট বরাদ্দ দিন</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  ফ্ল্যাট লিঙ্ক বা আনলিঙ্ক করলেও মাস্টার ফ্ল্যাট ডাটাবেজ সুরক্ষিত ও অক্ষত থাকবে।
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingMember ? `সদস্য তথ্য এডিট: ${editingMember.name}` : 'নতুন সদস্য রেজিস্টার করুন'}
        subtitle="Japan City Tower Owners Register (Cloud Firestore)"
        maxWidth="md"
      >
        <form onSubmit={handleSaveMember} className="space-y-4 font-bengali">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              সদস্যের নাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. SM Khalilur Rahman Properties"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              বাংলা নাম
            </label>
            <input
              type="text"
              value={formBanglaName}
              onChange={(e) => setFormBanglaName(e.target.value)}
              placeholder="যেমন: এস এম খলিলুর রহমান প্রোপার্টিজ"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ক্যাটাগরি
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="INDIVIDUAL">ব্যক্তিগত মালিক</option>
                <option value="PROPERTY_OWNER">প্রপার্টি ওনার</option>
                <option value="COMPANY">কোম্পানি</option>
                <option value="COMMERCIAL">বাণিজ্যিক</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মোবাইল নম্বর <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="01711-XXXXXX"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ইমেইল ঠিকানা (ঐচ্ছিক)
            </label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="khalilur@example.com"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              বরাদ্দকৃত ফ্ল্যাটসমূহ (Comma separated, e.g. 6-B, 7-B, 8-B)
            </label>
            <input
              type="text"
              value={formFlats}
              onChange={(e) => setFormFlats(e.target.value)}
              placeholder="e.g. 6-B, 7-B, 8-B"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <span>{editingMember ? 'তথ্য আপডেট করুন' : 'সদস্য যুক্ত করুন'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
