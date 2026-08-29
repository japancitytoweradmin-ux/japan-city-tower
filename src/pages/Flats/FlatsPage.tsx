import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Phone,
  User,
  Loader2,
  ShieldCheck,
  History,
  Link,
  Unlink,
  Eye,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { FlatUnit, UnitType, PaymentStatus, Member, ExpenseItem } from '../../types';
import { sampleUnits, sampleMembers, sampleExpensesJune2025 } from '../../data/mockData';
import { flatService } from '../../services/flatService';
import { memberService } from '../../services/memberService';
import { expenseService } from '../../services/expenseService';
import { buildingSettingsService } from '../../services/buildingSettingsService';
import { useToast } from '../../components/common/Toast';
import { useTranslation } from '../../i18n/LanguageContext';
import { useBillingPeriod } from '../../contexts/BillingPeriodContext';
import { calculateDualBilling, isKhalilurMember } from '../../utils/billingCalculator';

export const FlatsPage: React.FC = () => {
  const { showToast } = useToast();
  const { t, formatNumber, formatCurrency, isBangla } = useTranslation();
  const { billingPeriodId, periodLabel } = useBillingPeriod();

  const [units, setUnits] = useState<FlatUnit[]>(sampleUnits);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<FlatUnit | null>(null);
  const [viewingUnit, setViewingUnit] = useState<FlatUnit | null>(null);
  const [ownershipUnit, setOwnershipUnit] = useState<FlatUnit | null>(null);
  const [unlinkUnit, setUnlinkUnit] = useState<FlatUnit | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State - Add / Edit Flat
  const [formUnitNumber, setFormUnitNumber] = useState('');
  const [formFloor, setFormFloor] = useState('2');
  const [formUnitType, setFormUnitType] = useState<UnitType>('Residential');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerPhone, setFormOwnerPhone] = useState('');
  const [formMemberId, setFormMemberId] = useState('JCT-001');
  const [formMonthlyBill, setFormMonthlyBill] = useState('1997');
  const [defaultBillAmount, setDefaultBillAmount] = useState('1997');
  const [formAreaSqFt, setFormAreaSqFt] = useState('1450');

  // Form State - Ownership Transfer
  const [newMemberId, setNewMemberId] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Form State - Unlink Reason
  const [unlinkReason, setUnlinkReason] = useState('');

  useEffect(() => {
    buildingSettingsService.getSystemBilling()
      .then((settings) => {
        if (settings && typeof settings.defaultMonthlyBill === 'number') {
          setFormMonthlyBill(settings.defaultMonthlyBill.toString());
          setDefaultBillAmount(settings.defaultMonthlyBill.toString());
        }
      })
      .catch((err) => console.error('Failed to load system billing settings:', err));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribeFlats = flatService.subscribeToFlats((loadedFlats) => {
      setUnits(loadedFlats);
      setIsLoading(false);
    });

    const unsubscribeExpenses = expenseService.subscribeToExpenses((loadedExp) => {
      setExpenses(loadedExp);
    }, billingPeriodId);

    const fetchMembers = async () => {
      const loadedMembers = await memberService.getAllMembers();
      setMembers(loadedMembers);
    };
    fetchMembers();

    return () => {
      unsubscribeFlats();
      unsubscribeExpenses();
    };
  }, [billingPeriodId]);

  // Compute period dual billing metrics
  const periodExp = expenses.filter(e => (e.billingPeriodId || e.month) === billingPeriodId);
  const effectiveExp = periodExp.length > 0 ? periodExp : (billingPeriodId === '2025-06' ? sampleExpensesJune2025 : []);
  const dualCalc = calculateDualBilling(effectiveExp, units.length || 28);
  const defaultBillAmountNum = parseFloat(defaultBillAmount) || 1997;

  const getFlatMonthlyBill = (unit: FlatUnit): number => {
    const isKh = isKhalilurMember(unit.memberId, unit.unitNumber);
    if (isKh) {
      return dualCalc.khalilur.perFlatBill || defaultBillAmountNum;
    }
    if (dualCalc.totalExpense > 0) {
      return dualCalc.regularRoundedPerFlat;
    }
    return unit.monthlyBaseBill || defaultBillAmountNum;
  };

  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      unit.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.memberId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFloor =
      selectedFloor === 'ALL' || unit.floor.toString() === selectedFloor;

    const matchesStatus =
      selectedStatus === 'ALL' || unit.paymentStatus === selectedStatus;

    return matchesSearch && matchesFloor && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingUnit(null);
    setFormUnitNumber('');
    setFormFloor('2');
    setFormUnitType('Residential');
    setFormOwnerName('');
    setFormOwnerPhone('');
    setFormMemberId('JCT-001');
    setFormMonthlyBill(defaultBillAmount);
    setFormAreaSqFt('1450');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (unit: FlatUnit) => {
    setEditingUnit(unit);
    setFormUnitNumber(unit.unitNumber);
    setFormFloor(unit.floor.toString());
    setFormUnitType(unit.unitType);
    setFormOwnerName(unit.ownerName);
    setFormOwnerPhone(unit.ownerPhone);
    setFormMemberId(unit.memberId);
    setFormMonthlyBill(unit.monthlyBaseBill.toString());
    setFormAreaSqFt((unit.areaSqFt || 1450).toString());
    setIsAddModalOpen(true);
  };

  const handleOpenOwnershipTransfer = (unit: FlatUnit) => {
    setOwnershipUnit(unit);
    setNewMemberId(members[0]?.memberId || '');
    setNewOwnerName(members[0]?.name || '');
    setNewOwnerPhone(members[0]?.phone || '');
    setTransferReason('');
  };

  const handleMemberSelectInTransfer = (mId: string) => {
    const selected = members.find(m => m.memberId === mId);
    if (selected) {
      setNewMemberId(selected.memberId);
      setNewOwnerName(selected.name);
      setNewOwnerPhone(selected.phone);
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUnitNumber.trim() || !formOwnerName.trim()) {
      showToast(isBangla ? 'ফ্ল্যাট নম্বর এবং মালিকের নাম প্রদান করুন' : 'Please provide Flat Number and Owner Name', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (editingUnit) {
        await flatService.upsertFlat({
          ...editingUnit,
          unitNumber: formUnitNumber,
          floor: parseInt(formFloor, 10),
          unitType: formUnitType,
          ownerName: formOwnerName,
          ownerPhone: formOwnerPhone,
          memberId: formMemberId,
          areaSqFt: parseFloat(formAreaSqFt) || 1450,
          monthlyBaseBill: parseFloat(formMonthlyBill) === 0 ? 0 : (parseFloat(formMonthlyBill) || parseFloat(defaultBillAmount) || 0),
        });
        showToast(`ফ্ল্যাট ${formUnitNumber} তথ্য আপডেট করা হয়েছে`, 'success');
      } else {
        const newUnit: FlatUnit = {
          id: `unit-${Date.now()}`,
          unitNumber: formUnitNumber,
          floor: parseInt(formFloor, 10),
          unitType: formUnitType,
          ownerName: formOwnerName,
          ownerPhone: formOwnerPhone,
          memberId: formMemberId,
          areaSqFt: parseFloat(formAreaSqFt) || 1450,
          monthlyBaseBill: parseFloat(formMonthlyBill) === 0 ? 0 : (parseFloat(formMonthlyBill) || parseFloat(defaultBillAmount) || 0),
          currentPaid: 0,
          currentDue: parseFloat(formMonthlyBill) === 0 ? 0 : (parseFloat(formMonthlyBill) || parseFloat(defaultBillAmount) || 0),
          status: 'OCCUPIED_OWNER',
          paymentStatus: 'DUE',
          isMasterData: true,
          isDemo: false
        };
        await flatService.upsertFlat(newUnit);
        showToast(`${formUnitNumber} মাস্টার ডাটাবেজে যুক্ত করা হয়েছে`, 'success');
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Error saving flat'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Ownership Change
  const handleSaveOwnershipTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownershipUnit) return;

    setIsSaving(true);
    try {
      await flatService.changeFlatOwnership(
        ownershipUnit.unitNumber,
        newMemberId,
        newOwnerName,
        newOwnerPhone,
        'Admin',
        transferReason || 'মালিকানা হস্তান্তর'
      );
      showToast(`ফ্ল্যাট ${ownershipUnit.unitNumber}-এর মালিকানা ${newOwnerName}-এর নামে হস্তান্তর করা হয়েছে`, 'success');
      setOwnershipUnit(null);
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Ownership transfer failed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Unlink Flat
  const handleConfirmUnlink = async () => {
    if (!unlinkUnit) return;

    setIsSaving(true);
    try {
      // 1. Unlink flat in flatService
      await flatService.unlinkFlat(
        unlinkUnit.unitNumber,
        'Admin',
        unlinkReason || 'ফ্ল্যাট লিংক বাতিল করা হয়েছে'
      );

      // 2. Remove flat from member record if associated
      if (unlinkUnit.memberId && unlinkUnit.memberId !== 'UNASSIGNED') {
        const member = members.find(m => m.memberId === unlinkUnit.memberId);
        if (member) {
          await memberService.removeFlatFromMember(member, unlinkUnit.unitNumber);
        }
      }

      showToast(`ফ্ল্যাট ${unlinkUnit.unitNumber}-এর লিংক সফলভাবে বাতিল করা হয়েছে। (মাস্টার ফ্ল্যাট অক্ষত রয়েছে)`, 'success');
      setUnlinkUnit(null);
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Unlink failed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title="ফ্ল্যাট মাস্টার ডেটা ব্যবস্থাপনা (Building & Flat Master Data)"
        subtitle="২৮টি স্থায়ী ফ্ল্যাট ইউনিট, মালিকানা তথ্য, ফ্ল্যাট হিস্টোরি ও বরাদ্দ পরিচালনা"
        actionButton={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>নতুন মাস্টার ফ্ল্যাট যুক্ত করুন</span>
          </button>
        }
      />

      {/* Master Data Summary Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">২৮টি স্থায়ী মাস্টার ফ্ল্যাট চিহ্নিত</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                isMasterData: true
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ফ্ল্যাটের মাস্টার রেকর্ডগুলো স্থায়ী। সিজন ({periodLabel}): মোট খরচ {formatCurrency(dualCalc.totalExpense)} • সুষম মাসিক বিল: {formatCurrency(dualCalc.totalExpense > 0 ? dualCalc.regularRoundedPerFlat : defaultBillAmountNum)}/ফ্ল্যাট।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">মোট ফ্ল্যাট: </span>
            <span className="text-amber-400 font-bold">{units.length} টি</span>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">বরাদ্দকৃত: </span>
            <span className="text-emerald-400 font-bold">{units.filter(u => u.memberId !== 'UNASSIGNED').length} টি</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ফ্ল্যাট নম্বর (2-A), মালিকের নাম বা Member ID খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Floor and Status Selectors */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">{t.flats.floor}:</span>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">সকল ফ্লোর (২-৯)</option>
              {[2, 3, 4, 5, 6, 7, 8, 9].map((f) => (
                <option key={f} value={f}>
                  {formatNumber(f)} ম তলা
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">পেমেন্ট স্ট্যাটাস:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">সকল</option>
              <option value="PAID">পরিশোধিত (PAID)</option>
              <option value="PARTIAL">আংশিক (PARTIAL)</option>
              <option value="DUE">বকেয়া (DUE)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">ফ্ল্যাট নম্বর</th>
                <th className="p-3.5">ফ্লোর ও সাইজ</th>
                <th className="p-3.5">ধরণ</th>
                <th className="p-3.5">মালিক ও Member ID</th>
                <th className="p-3.5 text-right">মাসিক বিল</th>
                <th className="p-3.5 text-right">বকেয়া</th>
                <th className="p-3.5 text-center">পেমেন্ট স্ট্যাটাস</th>
                <th className="p-3.5 text-center">মাস্টার স্ট্যাটাস</th>
                <th className="p-3.5 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUnits.map((unit) => (
                <tr key={unit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white text-sm font-mono">
                    <div className="flex items-center gap-1.5">
                      <span>{unit.unitNumber}</span>
                      <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Master
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    <p>{formatNumber(unit.floor)} ম তলা</p>
                    <p className="text-[10px] text-slate-400 font-mono">{unit.areaSqFt || 1450} sq ft</p>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px]">
                      {unit.unitType}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 dark:text-white">{unit.ownerName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      ID: {unit.memberId} • 📞 {unit.ownerPhone || 'N/A'}
                    </p>
                  </td>
                  <td className="p-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                    <span className="font-bold">{formatCurrency(getFlatMonthlyBill(unit))}</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(unit.currentDue)}
                  </td>
                  <td className="p-3.5 text-center">
                    <StatusBadge status={unit.paymentStatus} size="sm" />
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      স্থায়ী
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingUnit(unit)}
                        className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950 rounded-lg transition-colors"
                        title="বিস্তারিত ও মালিকানা হিস্টোরি"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenOwnershipTransfer(unit)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition-colors"
                        title="মালিকানা পরিবর্তন করুন"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(unit)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="এডিট তথ্য"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setUnlinkUnit(unit)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors"
                        title="ফ্ল্যাট আনলিংক করুন (মাস্টার ডাটা অক্ষত রেখে)"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Responsive Cards View */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {filteredUnits.map((unit) => (
          <div key={unit.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono block">
                  ফ্ল্যাট {unit.unitNumber}
                </span>
                <span className="text-xs text-slate-500">
                  {formatNumber(unit.floor)} ম তলা • {unit.unitType}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={unit.paymentStatus} size="sm" />
                <span className="text-[10px] bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded-sm">
                  Master Data
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{unit.ownerName}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{unit.ownerPhone || 'N/A'}</span>
                <span className="font-mono text-slate-400 ml-1">({unit.memberId})</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold">
                <span className="text-slate-600 dark:text-slate-400">মাসিক বিল: {formatCurrency(getFlatMonthlyBill(unit))}</span>
                <span className={unit.currentDue > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {unit.currentDue > 0 ? `বকেয়া: ${formatCurrency(unit.currentDue)}` : 'পরিশোধিত'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingUnit(unit)}
                className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>বিস্তারিত</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenOwnershipTransfer(unit)}
                className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" />
                <span>মালিকানা পরিবর্তন</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenEdit(unit)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>এডিট</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: VIEW DETAILS & OWNERSHIP HISTORY */}
      {viewingUnit && (
        <Modal
          isOpen={!!viewingUnit}
          onClose={() => setViewingUnit(null)}
          title={`ফ্ল্যাট ${viewingUnit.unitNumber} - বিস্তারিত ও মালিকানা হিস্টোরি`}
          maxWidth="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Flat Summary Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block">ফ্ল্যাট নম্বর</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">{viewingUnit.unitNumber}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">ফ্লোর</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">{formatNumber(viewingUnit.floor)} ম তলা</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">বর্তমান মালিক</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">{viewingUnit.ownerName}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">Member ID</span>
                <span className="font-bold text-sm text-amber-600 font-mono">{viewingUnit.memberId}</span>
              </div>
            </div>

            {/* Ownership History Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                <span>মালিকানা পরিবর্তন ও ট্রান্সফার হিস্টোরি (Ownership History)</span>
              </h4>

              {(!viewingUnit.ownershipHistory || viewingUnit.ownershipHistory.length === 0) ? (
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-center text-slate-500">
                  এখনো কোনো মালিকানা পরিবর্তনের রেকর্ড নেই (মূল প্রাথমিক বরাদ্দ বিদ্যমান)।
                </div>
              ) : (
                <div className="space-y-2">
                  {viewingUnit.ownershipHistory.map((history, index) => (
                    <div key={history.id || index} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                          <span>{history.previousOwnerName} ({history.previousMemberId})</span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-emerald-600 dark:text-emerald-400">{history.newOwnerName} ({history.newMemberId})</span>
                        </div>
                        {history.reason && (
                          <p className="text-[11px] text-slate-500">কারণ: {history.reason}</p>
                        )}
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 text-right">
                        <div>তারিখ: {new Date(history.changedAt).toLocaleDateString('bn-BD')}</div>
                        <div>পরিবর্তনকারী: {history.changedBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingUnit(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: CHANGE FLAT OWNERSHIP */}
      {ownershipUnit && (
        <Modal
          isOpen={!!ownershipUnit}
          onClose={() => setOwnershipUnit(null)}
          title={`ফ্ল্যাট ${ownershipUnit.unitNumber} - মালিকানা পরিবর্তন`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveOwnershipTransfer} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300">
              <p className="font-bold">বর্তমান মালিক:</p>
              <p className="text-sm font-bold mt-0.5">{ownershipUnit.ownerName} ({ownershipUnit.memberId})</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                নতুন মালিক নির্বাচন করুন (Select Existing Member)
              </label>
              <select
                value={newMemberId}
                onChange={(e) => handleMemberSelectInTransfer(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
              >
                {members.map((m) => (
                  <option key={m.memberId} value={m.memberId}>
                    {m.name} ({m.memberId}) - {m.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  নতুন মালিকের নাম
                </label>
                <input
                  type="text"
                  required
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পরিবর্তনের কারণ (Reason for Transfer)
              </label>
              <textarea
                rows={2}
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="যেমন: ফ্ল্যাট বিক্রি, উত্তরাধিকার সূত্রে মালিকানা স্থানান্তর..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOwnershipUnit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>মালিকানা পরিবর্তন সম্পন্ন করুন</span>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: UNLINK FLAT */}
      {unlinkUnit && (
        <Modal
          isOpen={!!unlinkUnit}
          onClose={() => setUnlinkUnit(null)}
          title={`ফ্ল্যাট ${unlinkUnit.unitNumber} - সংযোগ বিচ্ছিন্নকরণ`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-bengali">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-rose-900 dark:text-rose-200">
                <p className="font-bold">আপনি কি ফ্ল্যাট {unlinkUnit.unitNumber} থেকে সদস্য {unlinkUnit.ownerName}-এর লিংক বাতিল করতে চান?</p>
                <p className="text-[11px] text-rose-800 dark:text-rose-300">
                  ⚠ ফ্ল্যাটের মাস্টার রেকর্ড মুছে যাবে না। ফ্ল্যাটটি "Unassigned" স্ট্যাটাসে থাকবে। পরবর্তীতে যেকোনো নতুন সদস্যকে এই ফ্ল্যাটে বরাদ্দ দেওয়া যাবে।
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                বিচ্ছিন্ন করার কারণ
              </label>
              <input
                type="text"
                value={unlinkReason}
                onChange={(e) => setUnlinkReason(e.target.value)}
                placeholder="যেমন: ভাড়া চুক্তি সমাপ্ত, ফ্ল্যাট স্থানান্তর..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUnlinkUnit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlink}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>হ্যাঁ, আনলিংক করুন</span>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Unit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingUnit ? 'ফ্ল্যাটের তথ্য সম্পাদনা' : 'নতুন মাস্টার ফ্ল্যাট যুক্ত করুন'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveUnit} className="space-y-4 font-bengali">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ফ্ল্যাট নম্বর <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formUnitNumber}
                onChange={(e) => setFormUnitNumber(e.target.value)}
                placeholder="e.g. 6-B"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ফ্লোর (Floor)
              </label>
              <select
                value={formFloor}
                onChange={(e) => setFormFloor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9].map((f) => (
                  <option key={f} value={f}>
                    {formatNumber(f)} ম তলা
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ধরণ (Unit Type)
              </label>
              <select
                value={formUnitType}
                onChange={(e) => setFormUnitType(e.target.value as UnitType)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Office">Office</option>
                <option value="Duplex">Duplex</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মাসিক বিল (৳)
              </label>
              <input
                type="number"
                value={formMonthlyBill}
                onChange={(e) => setFormMonthlyBill(e.target.value)}
                placeholder={defaultBillAmount}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              মালিকের নাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formOwnerName}
              onChange={(e) => setFormOwnerName(e.target.value)}
              placeholder="যেমন: এস এম খলিলুর রহমান"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মোবাইল নম্বর
              </label>
              <input
                type="text"
                value={formOwnerPhone}
                onChange={(e) => setFormOwnerPhone(e.target.value)}
                placeholder="01711-XXXXXX"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Member ID
              </label>
              <input
                type="text"
                value={formMemberId}
                onChange={(e) => setFormMemberId(e.target.value)}
                placeholder="JCT-006"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <span>{editingUnit ? 'সংরক্ষণ করুন' : 'যুক্ত করুন'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
