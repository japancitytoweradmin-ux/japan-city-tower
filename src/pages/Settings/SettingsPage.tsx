import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  FileCheck, 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  Save, 
  Sparkles,
  HardDrive,
  Database,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Users,
  Layers,
  Upload,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  Receipt,
  PhoneCall,
  Clock,
  MapPin,
  Mail,
  X,
  CloudLightning,
  Globe,
  HelpCircle,
  Wifi
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useToast } from '../../components/common/Toast';
import { demoDataService } from '../../services/demoDataService';
import { buildingSettingsService } from '../../services/buildingSettingsService';
import { storageService } from '../../services/storageService';
import { authService } from '../../services/authService';
import { 
  DemoDataSummary, 
  BuildingInfoSettings, 
  SystemBillingSettings, 
  ReceiptConfigSettings, 
  OfficeConfigSettings 
} from '../../types';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'building' | 'billing' | 'receipt' | 'office' | 'security' | 'demo' | 'firebase'>('building');

  // Firebase Custom Sync States
  const [firebaseApiKey, setFirebaseApiKey] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [firebaseAppId, setFirebaseAppId] = useState('');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState('');
  const [firebaseAutoSync, setFirebaseAutoSync] = useState(true);
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [showFirebaseInstructions, setShowFirebaseInstructions] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Loading States
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Form States - Building Info
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfoSettings>({
    buildingNameBangla: 'জাপান সিটি টাওয়ার',
    buildingNameEnglish: 'Japan City Tower',
    addressBangla: 'প্লট নং ২৪/বি, রিং রোড, শ্যামলী, ঢাকা-১২০৭',
    addressEnglish: 'Plot # 24/B, Ring Road, Shyamoli, Dhaka-1207',
    buildingCode: 'JCT-01',
    totalFloors: 9,
    totalFlats: 28,
    managementOfficeMobile: '+880 1711-000000',
    managementOfficeEmail: 'info@japancitytower.com',
    emergencyContact: '+880 1800-000000',
    logoUrl: ''
  });

  // Form States - System Billing
  const [billingSettings, setBillingSettings] = useState<SystemBillingSettings>({
    startYear: 2026,
    endYear: 2035,
    defaultMonthlyBill: 1997,
    billDueDate: 10,
    currency: '৳',
    roundingMethod: 'NEAREST_INTEGER'
  });

  // Form States - Receipt Config
  const [receiptSettings, setReceiptSettings] = useState<ReceiptConfigSettings>({
    receiptPrefix: 'JCT-',
    receiptFormat: 'JCT-YYYY-XXXXXX',
    startingNumber: 1001,
    receiptHeader: 'জাপান সিটি টাওয়ার – সাধারণ বিল মানি রসিদ',
    footerText: 'ধন্যবাদান্তে, জাপান সিটি টাওয়ার ফ্ল্যাট মালিক ব্যবস্থাপনা সমিতি।'
  });

  // Form States - Office Config
  const [officeSettings, setOfficeSettings] = useState<OfficeConfigSettings>({
    officeName: 'জাপান সিটি টাওয়ার ফ্ল্যাট মালিক সমিতি কার্যালয়',
    phone: '+880 2-9110000',
    mobile: '+880 1711-000000',
    email: 'info@japancitytower.com',
    address: 'গ্রাউন্ড ফ্লোর, প্লট ২৪/বি, রিং রোড, শ্যামলী, ঢাকা-১২০৭',
    officeHours: 'সকাল ৯:০০ - রাত ৮:০০ (প্রতিদিন)',
    emergencyContact: '+880 1800-000000'
  });

  // Demo Data States
  const [summary, setSummary] = useState<DemoDataSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isClearingDemo, setIsClearingDemo] = useState(false);
  const [isClearingEverything, setIsClearingEverything] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [isSeedingMaster, setIsSeedingMaster] = useState(false);
  const [isSeedingFull, setIsSeedingFull] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showClearEverythingModal, setShowClearEverythingModal] = useState(false);
  const [clearDemoConfirmText, setClearDemoConfirmText] = useState('');
  const [clearEverythingConfirmText, setClearEverythingConfirmText] = useState('');

  // Load Settings from Firestore
  useEffect(() => {
    const fetchAllSettings = async () => {
      setIsInitialLoading(true);
      try {
        const [bInfo, bBill, rConf, oConf, dSum] = await Promise.all([
          buildingSettingsService.getBuildingInfo(),
          buildingSettingsService.getSystemBilling(),
          buildingSettingsService.getReceiptConfig(),
          buildingSettingsService.getOfficeConfig(),
          demoDataService.getDemoDataSummary()
        ]);
        setBuildingInfo(bInfo);
        setBillingSettings(bBill);
        setReceiptSettings(rConf);
        setOfficeSettings(oConf);
        setSummary(dSum);
      } catch (error) {
        console.error('Error loading system settings:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchAllSettings();
  }, []);

  const loadSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const data = await demoDataService.getDemoDataSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Load custom Firebase config on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedConfig = localStorage.getItem('jct_custom_firebase_config');
        if (storedConfig) {
          const parsed = JSON.parse(storedConfig);
          setFirebaseApiKey(parsed.apiKey || '');
          setFirebaseProjectId(parsed.projectId || '');
          setFirebaseAppId(parsed.appId || '');
          setFirebaseAuthDomain(parsed.authDomain || '');
        }
        
        const storedAutoSync = localStorage.getItem('jct_firebase_auto_sync');
        if (storedAutoSync !== null) {
          setFirebaseAutoSync(storedAutoSync === 'true');
        } else {
          setFirebaseAutoSync(true); // default to true
        }
      } catch (e) {
        console.error('Error loading custom firebase config:', e);
      }
    }
  }, []);

  const handleSaveFirebaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseApiKey || !firebaseProjectId || !firebaseAppId) {
      showToast('অনুগ্রহ করে সব তারকা চিহ্নিত (*) প্রফিট ফিল্ড পূরণ করুন।', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const config = {
        apiKey: firebaseApiKey.trim(),
        projectId: firebaseProjectId.trim(),
        appId: firebaseAppId.trim(),
        authDomain: firebaseAuthDomain.trim() || undefined
      };
      
      localStorage.setItem('jct_custom_firebase_config', JSON.stringify(config));
      localStorage.setItem('jct_firebase_auto_sync', firebaseAutoSync ? 'true' : 'false');
      
      // Save config to cloud so mobile and other devices can sync it
      try {
        const { defaultDb } = await import('../../lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const configDocRef = doc(defaultDb, 'system_config', 'firebase');
        await setDoc(configDocRef, config);
        console.log('Firebase config successfully saved to cloud');
      } catch (cloudErr) {
        console.error('Error saving firebase config to cloud:', cloudErr);
      }
      
      showToast('ফায়ারবেস কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে! নতুন ডেটাবেজ সংযোগ কার্যকর করতে অ্যাপ্লিকেশনটি রিলোড হচ্ছে...', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      showToast('কনফিগারেশন সংরক্ষণে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestFirebaseConnection = async () => {
    if (!firebaseApiKey || !firebaseProjectId || !firebaseAppId) {
      showToast('পরীক্ষা করার জন্য অনুগ্রহ করে এপিআই কি, প্রজেক্ট আইডি এবং অ্যাপ আইডি দিন।', 'warning');
      return;
    }

    setIsTestingFirebase(true);
    try {
      const { testFirebaseConnection } = await import('../../lib/firebase');
      const success = await testFirebaseConnection({
        apiKey: firebaseApiKey.trim(),
        projectId: firebaseProjectId.trim(),
        appId: firebaseAppId.trim(),
        authDomain: firebaseAuthDomain.trim() || undefined
      });
      if (success) {
        showToast('ফায়ারবেস কানেকশন সফল হয়েছে! ডেটাবেজের সাথে যোগাযোগ স্থাপন সম্ভব হয়েছে।', 'success');
      }
    } catch (err: any) {
      console.error('Connection test error:', err);
      showToast(`কানেকশন ব্যর্থ হয়েছে: ${err.message || err}`, 'error');
    } finally {
      setIsTestingFirebase(false);
    }
  };

  const handleResetFirebaseConfig = async () => {
    if (window.confirm('আপনি কি নিশ্চিত যে আপনি ডিফল্ট ফায়ারবেস ডেটাবেজ কনফিগারেশনে ফিরে যেতে চান?')) {
      localStorage.removeItem('jct_custom_firebase_config');
      
      // Delete config from cloud so mobile and other devices reset as well
      try {
        const { defaultDb } = await import('../../lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        const configDocRef = doc(defaultDb, 'system_config', 'firebase');
        await deleteDoc(configDocRef);
        console.log('Firebase config successfully deleted from cloud');
      } catch (cloudErr) {
        console.error('Error deleting firebase config from cloud:', cloudErr);
      }

      showToast('ডিফল্ট ফায়ারবেস ডেটাবেজ কনফিগারেশন সেট করা হয়েছে। অ্যাপ্লিকেশনটি রিলোড হচ্ছে...', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  // Logo Upload Handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('লোগো ফাইলের সাইজ সর্বোচ্চ ৫ মেগাবাইটের বেশি হতে পারবে না', 'warning');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const downloadUrl = await storageService.uploadLogoFile(file);
      const updatedInfo = { ...buildingInfo, logoUrl: downloadUrl };
      setBuildingInfo(updatedInfo);
      await buildingSettingsService.updateBuildingInfo(updatedInfo);
      showToast('বিল্ডিং লোগো সফলভাবে আপলোড ও আপডেট করা হয়েছে', 'success');
    } catch (err) {
      console.error('Logo upload error:', err);
      showToast('লোগো আপলোডে সমস্যা হয়েছে', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Remove Logo
  const handleRemoveLogo = async () => {
    try {
      const updatedInfo = { ...buildingInfo, logoUrl: '' };
      setBuildingInfo(updatedInfo);
      await buildingSettingsService.updateBuildingInfo(updatedInfo);
      showToast('বিল্ডিং লোগো সফলভাবে অপসারণ করা হয়েছে', 'info');
    } catch (err) {
      showToast('লোগো অপসারণে সমস্যা হয়েছে', 'error');
    }
  };

  // Save Handlers
  const handleSaveBuildingInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await buildingSettingsService.updateBuildingInfo(buildingInfo);
      showToast('বিল্ডিং তথ্য ও পরিচিতি সফলভাবে সংরক্ষিত হয়েছে', 'success');
    } catch (err) {
      showToast('তথ্য সংরক্ষণে সমস্যা হয়েছে', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBillingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await buildingSettingsService.updateSystemBilling(billingSettings);
      showToast('বিলিং নিয়মাবলি ও সেটিংস সফলভাবে সংরক্ষিত হয়েছে', 'success');
    } catch (err) {
      showToast('বিলিং সেটিংস সংরক্ষণে সমস্যা হয়েছে', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReceiptSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await buildingSettingsService.updateReceiptConfig(receiptSettings);
      showToast('মানি রসিদ কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে', 'success');
    } catch (err) {
      showToast('রসিদ সেটিংস সংরক্ষণে সমস্যা হয়েছে', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOfficeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await buildingSettingsService.updateOfficeConfig(officeSettings);
      showToast('অফিস ঠিকানা ও যোগাযোগের তথ্য সফলভাবে সংরক্ষিত হয়েছে', 'success');
    } catch (err) {
      showToast('অফিস তথ্য সংরক্ষণে সমস্যা হয়েছে', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে', 'warning');
      return;
    }
    setIsChangingPassword(true);
    try {
      await authService.changePassword(newPassword);
      showToast('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('পাসওয়ার্ড পরিবর্তনে ব্যর্থ: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 1-Click Complete Factory Reset (Deletes Members, Flats, Transactions, Bills, Receipts)
  const handleClearEverything = async () => {
    if (clearEverythingConfirmText.trim() !== 'DELETE ALL') {
      showToast('অনুগ্রহ করে নিশ্চিত করতে "DELETE ALL" টাইপ করুন', 'warning');
      return;
    }

    setIsClearingEverything(true);
    try {
      const result = await demoDataService.clearAllDatabaseData('Admin');
      showToast(`সফলভাবে সমস্ত সদস্য (${result.deletedMembersCount} জন), ফ্ল্যাট (${result.deletedFlatsCount} টি) ও ডেমো লেনদেন মুছে ডেটাবেজ সম্পূর্ণ খালি করা হয়েছে!`, 'success');
      setShowClearEverythingModal(false);
      setClearEverythingConfirmText('');
      await loadSummary();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast('সম্পূর্ণ ডেটা মোছাতে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsClearingEverything(false);
    }
  };

  // Seed Full Database (Master Flats & Members + All Transactions)
  const handleSeedFullDatabase = async () => {
    setIsSeedingFull(true);
    try {
      await demoDataService.seedFullDatabase();
      showToast('২৮টি ফ্ল্যাট, ২৫টি সদস্য ও সকল ডেমো লেনদেন সফলভাবে সিড করা হয়েছে', 'success');
      await loadSummary();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      showToast('ডেটাবেজ সিডিংয়ে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSeedingFull(false);
    }
  };

  // Safe Demo Clear Function with typed confirmation
  const handleClearDemoData = async () => {
    if (clearDemoConfirmText.trim() !== 'CLEAR DEMO') {
      showToast('অনুগ্রহ করে নিশ্চিত করতে "CLEAR DEMO" টাইপ করুন', 'warning');
      return;
    }

    setIsClearingDemo(true);
    try {
      const result = await demoDataService.clearDemoTransactionalData('Admin');
      showToast(`ডেমো লেনদেন সফলভাবে মুছে ফেলা হয়েছে! (${result.deletedCount}টি রেকর্ড অপসারিত)`, 'success');
      setShowClearConfirmModal(false);
      setClearDemoConfirmText('');
      await loadSummary();
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      showToast('ডেমো ডেটা পরিষ্কারে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsClearingDemo(false);
    }
  };

  // Re-seed Demo Data Function
  const handleSeedDemoData = async () => {
    setIsSeedingDemo(true);
    try {
      await demoDataService.seedDemoTransactions();
      showToast('ডেমো লেনদেন ও ডাটা সফলভাবে সিড করা হয়েছে', 'success');
      await loadSummary();
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      showToast('ডেমো ডাটা সিডিংয়ে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Re-seed Master Data Function
  const handleSeedMasterData = async () => {
    setIsSeedingMaster(true);
    try {
      await demoDataService.seedMasterData();
      showToast('২৮টি ফ্ল্যাট ও সদস্য মাস্টার ডাটা ক্লাউডে সিঙ্ক করা হয়েছে', 'success');
      await loadSummary();
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      showToast('মাস্টার ডাটা সিঙ্কে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSeedingMaster(false);
    }
  };

  // Clear Master Data Function (Delete 28 Flats & 25 Members)
  const handleClearMasterData = async () => {
    if (window.confirm('সতর্কতা: আপনি কি নিশ্চিত যে আপনি ২৮টি ফ্ল্যাট এবং ২৫টি সদস্যের ডিফল্ট ডাটা পুরোপুরি মুছে ফেলে নতুনভাবে ফায়ারবেসে সদস্য যুক্ত করতে চান?')) {
      setIsSeedingMaster(true);
      try {
        const res = await demoDataService.clearMasterMembersAndFlats('Admin');
        showToast(`সকল ডিফল্ট সদস্য (${res.deletedMembersCount} জন) ও ফ্ল্যাট (${res.deletedFlatsCount} টি) মুছে ফেলা হয়েছে।`, 'success');
        await loadSummary();
        setTimeout(() => window.location.reload(), 1000);
      } catch (err: any) {
        showToast('ডিফল্ট ডাটা মোছাতে সমস্যা হয়েছে: ' + (err.message || 'Error'), 'error');
      } finally {
        setIsSeedingMaster(false);
      }
    }
  };

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title="সিস্টেম ও বিল্ডিং মাস্টার সেটিংস"
        subtitle="বিল্ডিং তথ্য, লোগো ব্যবস্থাপনা, ২০২৬–২০৩৫ বিলিং সেটিংস, রসিদ ফরম্যাট ও ডেটাবেজ কনফিগারেশন"
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('building')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'building'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>বিল্ডিং তথ্য ও লোগো</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'billing'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>বিল্ডিং ও বিলিং সেটিংস</span>
        </button>

        <button
          onClick={() => setActiveTab('receipt')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'receipt'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>মানি রসিদ সেটিংস</span>
        </button>

        <button
          onClick={() => setActiveTab('office')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'office'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>অফিস তথ্য</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>পাসওয়ার্ড ও সিকিউরিটি</span>
        </button>

        <button
          onClick={() => setActiveTab('demo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'demo'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>ডেটাবেজ ও ডেমো সুরক্ষা</span>
        </button>

        <button
          onClick={() => setActiveTab('firebase')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'firebase'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <CloudLightning className="w-4 h-4 text-sky-500" />
          <span>ফায়ারবেস ক্লাউড সিঙ্ক</span>
        </button>
      </div>

      {/* TAB 1: BUILDING INFO & LOGO */}
      {activeTab === 'building' && (
        <form onSubmit={handleSaveBuildingInfo} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">বিল্ডিং তথ্য ও লোগো ব্যবস্থাপনা</h3>
                  <p className="text-xs text-slate-500">টাওয়ারের নাম, ঠিকানা, লোগো ও সাধারণ কনফিগারেশন</p>
                </div>
              </div>
            </div>

            {/* LOGO UPLOAD SECTION */}
            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                বিল্ডিং লোগো (Logo Image)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                  {buildingInfo.logoUrl ? (
                    <img 
                      src={buildingInfo.logoUrl} 
                      alt="Building Logo" 
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto mb-1 text-slate-400" />
                      <span className="text-[10px] block font-bold">নো লোগো</span>
                    </div>
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-amber-400">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-all">
                      <Upload className="w-4 h-4" />
                      <span>{buildingInfo.logoUrl ? 'লোগো পরিবর্তন করুন' : 'লোগো আপলোড করুন'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>

                    {buildingInfo.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-semibold text-xs rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>অপসারণ</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    সমর্থিত ফরম্যাট: PNG, JPG, WebP। সর্বোচ্চ ফাইল সাইজ: ৫ মেগাবাইট। লোগোটি রসিদ ও রিপোর্টে প্রদর্শিত হবে।
                  </p>
                </div>
              </div>
            </div>

            {/* FORM FIELDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  টাওয়ারের নাম (বাংলা) *
                </label>
                <input
                  type="text"
                  required
                  value={buildingInfo.buildingNameBangla}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, buildingNameBangla: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Building Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={buildingInfo.buildingNameEnglish}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, buildingNameEnglish: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-sans bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ঠিকানা (বাংলা) *
                </label>
                <input
                  type="text"
                  required
                  value={buildingInfo.addressBangla}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, addressBangla: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address (English)
                </label>
                <input
                  type="text"
                  value={buildingInfo.addressEnglish}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, addressEnglish: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-sans bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বিল্ডিং কোড (Building Code)
                </label>
                <input
                  type="text"
                  value={buildingInfo.buildingCode}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, buildingCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  জরুরি কন্টাক্ট নম্বর
                </label>
                <input
                  type="text"
                  value={buildingInfo.emergencyContact}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, emergencyContact: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-sans bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মোট ফ্লোর সংখ্যা
                </label>
                <input
                  type="number"
                  value={buildingInfo.totalFloors}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, totalFloors: parseInt(e.target.value) || 9 })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মোট ফ্ল্যাট সংখ্যা (স্থায়ী মাস্টার ফ্ল্যাট)
                </label>
                <input
                  type="number"
                  value={buildingInfo.totalFlats}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, totalFlats: parseInt(e.target.value) || 28 })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>বিল্ডিং তথ্য সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: SYSTEM BILLING SETTINGS */}
      {activeTab === 'billing' && (
        <form onSubmit={handleSaveBillingSettings} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">সিস্টেম ও বিলিং নিয়মাবলি (2026–2035)</h3>
                  <p className="text-xs text-slate-500">বিলিং মেয়াদকাল, ডিফল্ট মাসিক বিল ও ডিউ ডেট সেটিংস</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বিলিং শুরুর বছর (Start Year)
                </label>
                <input
                  type="number"
                  min="2026"
                  max="2035"
                  value={billingSettings.startYear}
                  onChange={(e) => setBillingSettings({ ...billingSettings, startYear: parseInt(e.target.value) || 2026 })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বিলিং সমাপ্তির বছর (End Year)
                </label>
                <input
                  type="number"
                  min="2026"
                  max="2035"
                  value={billingSettings.endYear}
                  onChange={(e) => setBillingSettings({ ...billingSettings, endYear: parseInt(e.target.value) || 2035 })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ডিফল্ট মাসিক কমন বিল (প্রতি ফ্ল্যাট)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={billingSettings.defaultMonthlyBill}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBillingSettings({ ...billingSettings, defaultMonthlyBill: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white font-bold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                    টাকা
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মাসিক বিল পরিশোধের শেষ তারিখ (তারিখ/দিন)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={billingSettings.billDueDate}
                    onChange={(e) => setBillingSettings({ ...billingSettings, billDueDate: parseInt(e.target.value) || 10 })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                    তারিখ (প্রতি মাস)
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মুদ্রার প্রতীক (Currency Symbol)
                </label>
                <input
                  type="text"
                  value={billingSettings.currency}
                  onChange={(e) => setBillingSettings({ ...billingSettings, currency: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  হিসাব রাউন্ডিং মেথড (Rounding Method)
                </label>
                <select
                  value={billingSettings.roundingMethod}
                  onChange={(e) => setBillingSettings({ ...billingSettings, roundingMethod: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                >
                  <option value="NEAREST_INTEGER">নিকটতম পূর্ণসংখ্যা (Nearest Integer)</option>
                  <option value="EXACT_DECIMAL">যথাযথ দশমিক (Exact Decimal)</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold mb-1">ℹ বিলিং মেয়াদকাল সংক্রান্ত তথ্য:</p>
              <p>
                সিস্টেমটি ২০২৬ থেকে ২০৩৫ সাল পর্যন্ত পূর্ণাঙ্গ আর্থিক হিসাব ও রসিদ ট্র্যাকিং সমর্থন করার জন্য কনফিগার করা রয়েছে।
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>বিলিং সেটিংস সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: RECEIPT CONFIG */}
      {activeTab === 'receipt' && (
        <form onSubmit={handleSaveReceiptSettings} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">মানি রসিদ ফরম্যাট ও ডিজাইন সেটিংস</h3>
                  <p className="text-xs text-slate-500">রসিদ নম্বর ফরম্যাট, প্রেফিক্স, হেডার ও ফুটনোট কনফিগারেশন</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  রসিদ প্রেফিক্স (Receipt Prefix)
                </label>
                <input
                  type="text"
                  value={receiptSettings.receiptPrefix}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, receiptPrefix: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  প্রাথমিক রসিদ নম্বর (Starting Sequence Number)
                </label>
                <input
                  type="number"
                  value={receiptSettings.startingNumber}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, startingNumber: parseInt(e.target.value) || 1001 })}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  রসিদ হেডার শিরোনাম (Receipt Header Title)
                </label>
                <input
                  type="text"
                  value={receiptSettings.receiptHeader}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, receiptHeader: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  রসিদ ফুটনোট / ধন্যবাদ বার্তা (Footer Note)
                </label>
                <textarea
                  rows={2}
                  value={receiptSettings.footerText}
                  onChange={(e) => setReceiptSettings({ ...receiptSettings, footerText: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>
            </div>

            {/* PREVIEW BOX */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                রসিদ ফরম্যাট প্রিভিউ (Sample Preview):
              </span>
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-1 text-slate-800 dark:text-slate-200">
                <p className="font-bold text-amber-500">{receiptSettings.receiptHeader}</p>
                <p className="text-slate-500">রসিদ নম্বর: <span className="text-emerald-500 font-bold">{receiptSettings.receiptPrefix}2026-001001</span></p>
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {receiptSettings.footerText}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>রসিদ সেটিংস সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: OFFICE CONTACT INFO */}
      {activeTab === 'office' && (
        <form onSubmit={handleSaveOfficeSettings} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">ব্যবস্থাপনা সমিতি কার্যালয় তথ্য</h3>
                  <p className="text-xs text-slate-500">অফিস মোবাইল, টেলিফোন, সময়সূচী ও জরুরি যোগাযোগ নম্বর</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  কার্যালয়ের নাম (Office Name)
                </label>
                <input
                  type="text"
                  value={officeSettings.officeName}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, officeName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অফিস মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={officeSettings.mobile}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-sans bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অফিস টেলিফোন
                </label>
                <input
                  type="text"
                  value={officeSettings.phone}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-sans bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অফিস ইমেইল
                </label>
                <input
                  type="email"
                  value={officeSettings.email}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-sans bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অফিস সময়সূচী (Office Hours)
                </label>
                <input
                  type="text"
                  value={officeSettings.officeHours}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, officeHours: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  জরুরি যোগাযোগ (Emergency Contact)
                </label>
                <input
                  type="text"
                  value={officeSettings.emergencyContact}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, emergencyContact: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-sans bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অফিসের পূর্ণাঙ্গ ঠিকানা
                </label>
                <input
                  type="text"
                  value={officeSettings.address}
                  onChange={(e) => setOfficeSettings({ ...officeSettings, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>অফিস তথ্য সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 5: SECURITY & PASSWORD CHANGE */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">পাসওয়ার্ড ও সিকিউরিটি পরিবর্তন</h3>
                  <p className="text-xs text-slate-500">আপনার অ্যাডমিন অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন করুন</p>
                </div>
              </div>
            </div>

            <div className="max-w-md space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p>নতুন পাসওয়ার্ড সেভ করার সাথে সাথে ফায়ারবেস সিকিউরিটিতে পাসওয়ার্ড আপডেট হয়ে যাবে। পরবর্তী লগইনে নতুন পাসওয়ার্ড ব্যবহার করতে হবে।</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  নতুন পাসওয়ার্ড (New Password) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="সর্বনিম্ন ৬ অক্ষরের নতুন পাসওয়ার্ড"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  পাসওয়ার্ড নিশ্চিত করুন (Confirm Password) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ডটি পুনরায় দিন"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden dark:text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 6: DEMO & DATA PROTECTION (UNIFIED DATABASE CONTROL) */}
      {activeTab === 'demo' && (
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-white">ডেটাবেজ ও ডেমো ডেটা নিয়ন্ত্রণ কেন্দ্র</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Firestore Live
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  একটি সমন্বিত প্যানেল থেকে সমস্ত সদস্য, ফ্ল্যাট ও ডেমো হিসাব নিয়ন্ত্রণ ও এক ক্লিকে সম্পূর্ণ পরিষ্কার করার ব্যবস্থা।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadSummary}
              disabled={isLoadingSummary}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition-colors cursor-pointer border border-slate-700 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
              <span>স্ট্যাটাস রিফ্রেশ</span>
            </button>
          </div>

          {/* Unified Live Database Metrics Grid (All in 1 Grid) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>বর্তমান ডেটাবেজের রিয়েল-টাইম রেকর্ড পরিসংখ্যান</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {summary && summary.masterFlatsCount === 0 && summary.masterMembersCount === 0 
                  ? 'ডেটাবেজ সম্পূর্ণ খালি (০ ফ্ল্যাট / ০ সদস্য)' 
                  : 'সক্রিয় রেকর্ড সংরক্ষিত'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {/* Members */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-between">
                <div className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                  <Users className="w-3 h-3 text-sky-400" />
                  <span>সদস্য</span>
                </div>
                <div className="text-xl font-bold text-white font-sans my-1">
                  {summary ? summary.masterMembersCount : 0} <span className="text-xs font-normal text-slate-400 font-bengali">জন</span>
                </div>
                <div className="text-[10px] text-sky-400/80">
                  {summary && summary.masterMembersCount > 0 ? 'সদস্য তালিকা' : 'খালি (০)'}
                </div>
              </div>

              {/* Flats */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-between">
                <div className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                  <Building2 className="w-3 h-3 text-amber-400" />
                  <span>ফ্ল্যাট/ইউনিট</span>
                </div>
                <div className="text-xl font-bold text-white font-sans my-1">
                  {summary ? summary.masterFlatsCount : 0} <span className="text-xs font-normal text-slate-400 font-bengali">টি</span>
                </div>
                <div className="text-[10px] text-amber-400/80">
                  {summary && summary.masterFlatsCount > 0 ? 'ফ্ল্যাট তালিকা' : 'খালি (০)'}
                </div>
              </div>

              {/* Monthly Bills */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-between">
                <div className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  <span>মাসিক বিল</span>
                </div>
                <div className="text-xl font-bold text-indigo-400 font-sans my-1">
                  {summary ? summary.demoBillsCount : 0}
                </div>
                <div className="text-[10px] text-slate-500">বিলিং রেকর্ড</div>
              </div>

              {/* Expenses */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-between">
                <div className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                  <DollarSign className="w-3 h-3 text-rose-400" />
                  <span>খরচ এন্ট্রি</span>
                </div>
                <div className="text-xl font-bold text-rose-400 font-sans my-1">
                  {summary ? summary.demoExpensesCount : 0}
                </div>
                <div className="text-[10px] text-slate-500">ভাউচার হিসাব</div>
              </div>

              {/* Vouchers */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-between">
                <div className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span>ভাউচার</span>
                </div>
                <div className="text-xl font-bold text-cyan-400 font-sans my-1">
                  {summary ? summary.demoVouchersCount : 0}
                </div>
                <div className="text-[10px] text-slate-500">ফাইল/ডকুমেন্ট</div>
              </div>

              {/* Payments */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-between">
                <div className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  <span>পেমেন্ট</span>
                </div>
                <div className="text-xl font-bold text-emerald-400 font-sans my-1">
                  {summary ? summary.demoPaymentsCount : 0}
                </div>
                <div className="text-[10px] text-slate-500">টাকা জমা</div>
              </div>

              {/* Receipts */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-between">
                <div className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                  <Receipt className="w-3 h-3 text-teal-400" />
                  <span>মানি রসিদ</span>
                </div>
                <div className="text-xl font-bold text-teal-400 font-sans my-1">
                  {summary ? summary.demoReceiptsCount : 0}
                </div>
                <div className="text-[10px] text-slate-500">রসিদ জেনারেট</div>
              </div>

              {/* Notices */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-between">
                <div className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3 text-purple-400" />
                  <span>নোটিশ</span>
                </div>
                <div className="text-xl font-bold text-purple-400 font-sans my-1">
                  {summary ? summary.demoNoticesCount : 0}
                </div>
                <div className="text-[10px] text-slate-500">বার্তা/নোটিশ</div>
              </div>
            </div>
          </div>

          {/* PRIMARY 1-CLICK MASTER RESET BANNER (Highlighted Big Action) */}
          <div className="bg-linear-to-r from-rose-950/70 via-slate-950 to-rose-950/70 border-2 border-rose-600/60 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-rose-300">
                    ১-ক্লিক সম্পূর্ণ ডেটাবেজ রিসেট (সদস্য, ফ্ল্যাট ও সমস্ত ডেমো ডেটা ডিলিট)
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/30 text-rose-200 uppercase tracking-wider border border-rose-500/50">
                    Full Wipe
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  এক ক্লিকে ক্লাউড ডেটাবেজ থেকে সমস্ত সদস্য, ফ্ল্যাট, মাসিক বিল, খরচের হিসাব, ভাউচার, মানি রসিদ ও পেমেন্ট হিস্ট্রি সম্পূর্ণরূপে মুছে ফেলুন। এর ফলে ডেটাবেজ একদম <strong className="text-white underline">০ টি ফ্ল্যাট ও ০ জন সদস্য</strong> হয়ে সম্পূর্ণ ফ্রেশ হয়ে যাবে, যাতে আপনি আপনার আসল ডাটা শুরু থেকে যুক্ত করতে পারেন।
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setClearEverythingConfirmText('');
                    setShowClearEverythingModal(true);
                  }}
                  disabled={isClearingEverything}
                  className="px-5 py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/30 border border-rose-500 flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isClearingEverything ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>এক ক্লিকে সব ডেটা মুছে ফেলুন</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECONDARY ACTIONS & SEEDING CONTROLS */}
          <div className="space-y-3 pt-1">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>অন্যান্য অ্যাকশন ও ডেটাবেজ সিডিং টুলস</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Action 1: Clear only transactions (keep members/flats) */}
              <div className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>শুধুমাত্র লেনদেন মুছুন</span>
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">লেনদেন</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    সদস্য ও ফ্ল্যাট অপরিবর্তিত রেখে শুধুমাত্র বিল, খরচ, ভাউচার ও রসিদ রেকর্ড মুছে ফেলুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClearDemoConfirmText('');
                    setShowClearConfirmModal(true);
                  }}
                  disabled={isClearingDemo}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-amber-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ডেমো লেনদেন মুছুন</span>
                </button>
              </div>

              {/* Action 2: Seed Full Database */}
              <div className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>সম্পূর্ণ ডেটাবেজ সিড করুন</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">অল-ইন-ওয়ান</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ২৮টি ফ্ল্যাট, ২৫ জন সদস্য ও জুন ২০২৫ এর নমুনা ভাউচার/হিসাবসহ পুরো ডেমো লোড করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSeedFullDatabase}
                  disabled={isSeedingFull}
                  className="w-full py-2.5 px-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-emerald-600/30"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isSeedingFull ? 'animate-spin' : ''}`} />
                  <span>সম্পূর্ণ ডেমো সিড করুন</span>
                </button>
              </div>

              {/* Action 3: Seed only Master Flats & Members */}
              <div className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>মাস্টার ফ্ল্যাট ও সদস্য সিঙ্ক</span>
                    </span>
                    <span className="text-[10px] text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20">মাস্টার</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    কোনো লেনদেন ছাড়াই শুধুমাত্র ২৮টি ফ্ল্যাট ও ২৫টি ডিফল্ট সদস্য তথ্য লোড করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSeedMasterData}
                  disabled={isSeedingMaster}
                  className="w-full py-2.5 px-3 bg-sky-950/80 hover:bg-sky-900 text-sky-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-sky-600/30"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSeedingMaster ? 'animate-spin' : ''}`} />
                  <span>২৮ ফ্ল্যাট ও ২৫ সদস্য সিঙ্ক</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: FIREBASE CLOUD SYNC */}
      {activeTab === 'firebase' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600">
                  <CloudLightning className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">ফায়ারবেস ক্লাউড সিঙ্ক (Firebase Cloud Sync)</h3>
                  <p className="text-xs text-slate-500">আপনার নিজস্ব ক্লাউড ডাটাবেজ ফায়ারবেসের সাথে যুক্ত করুন</p>
                </div>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 bg-sky-50/50 dark:bg-sky-950/20 p-4 rounded-2xl border border-sky-100/50 dark:border-sky-950/30">
              আপনার <strong>জাপান সিটি টাওয়ার</strong> ম্যানেজমেন্ট সিস্টেমকে সম্পূর্ণ বিনামূল্যে ক্লাউড ফায়ারবেস ডাটাবেজের সাথে যুক্ত করে সম্পূর্ণ অনলাইন করুন। এর ফলে কোনো ডাটা হারানো বা মুছে যাওয়ার ভয় থাকবে না এবং একাধিক ডিভাইস (যেমন: পিছি ও মোবাইল) থেকে একসাথে রিয়াল-টাইম লাইভ ডাটা এন্ট্রি করতে পারবেন।
            </p>

            {/* AUTO-SYNC SETTING */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={firebaseAutoSync}
                  onChange={(e) => setFirebaseAutoSync(e.target.checked)}
                  className="mt-1 w-4.5 h-4.5 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                    অটোমেটিক ক্লাউড সিঙ্ক সক্রিয় করুন (Auto-Sync)
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    এটি পিসি এবং মোবাইল উভয় ডিভাইসেই চালু রাখুন। সক্রিয় থাকলে যেকোনো নতুন ডাটা এন্ট্রি বা ডিলিট করার সাথে সাথে তা অন্য ডিভাইসেও লাইভ আপডেট হয়ে যাবে।
                  </span>
                </div>
              </label>
            </div>

            {/* FIREBASE CONFIGURATION FORM */}
            <form onSubmit={handleSaveFirebaseConfig} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">ফায়ারবেস কনফিগারেশন সেট করুন</h4>
                <button
                  type="button"
                  onClick={() => setShowFirebaseInstructions(!showFirebaseInstructions)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>কিভাবে বের করবেন?</span>
                </button>
              </div>

              {showFirebaseInstructions && (
                <div className="p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-2 text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white block">কীভাবে ফায়ারবেস কনফিগারেশন বের করবেন?</span>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                    <li>প্রথমে <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-0.5">Firebase Console <Globe className="w-3 h-3 inline" /></a>-এ গিয়ে জিমেইল দিয়ে লগইন করুন।</li>
                    <li>একটি নতুন প্রজেক্ট (Create a project) তৈরি করুন (যেমন: <span className="font-mono">japan-city-tower-db</span>)।</li>
                    <li>প্রজেক্ট সেটিংস (Project Settings - গিয়ার আইকন) এ গিয়ে নিচে <strong>Add App</strong> বাটনে ক্লিক করে <strong>Web (&lt;/&gt;)</strong> নির্বাচন করুন।</li>
                    <li>যেকোনো একটি অ্যাপের নাম দিয়ে রেজিস্টার করলে সেখানে একটি <span className="font-mono">firebaseConfig</span> অবজেক্ট দেখতে পাবেন।</li>
                    <li>সেখান থেকে হুবহু <strong>API Key</strong>, <strong>Project ID</strong> এবং <strong>App ID</strong> কপি করে নিচের নির্দিষ্ট ইনপুটে বসিয়ে দিন।</li>
                    <li>এরপর ফায়ারবেস কনসোলের বাম পাশের মেনু থেকে <strong>Firestore Database</strong> তৈরি করুন এবং সিকিউরিটি রুলস **Start in Test Mode** (<span className="font-mono">allow read, write: if true;</span>) দিন যাতে যেকোনো মেম্বার তাদের ডাটা দেখতে পারে।</li>
                  </ol>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Firebase API Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firebaseApiKey}
                    onChange={(e) => setFirebaseApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    required
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firebaseProjectId}
                    onChange={(e) => setFirebaseProjectId(e.target.value)}
                    placeholder="japan-city-tower-db"
                    required
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    App ID (Web) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firebaseAppId}
                    onChange={(e) => setFirebaseAppId(e.target.value)}
                    placeholder="1:123456789:web:abcdef12345"
                    required
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Auth Domain (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={firebaseAuthDomain}
                    onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                    placeholder="japan-city-tower-db.firebaseapp.com"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden dark:text-white"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestFirebaseConnection}
                    disabled={isTestingFirebase}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isTestingFirebase ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wifi className="w-3.5 h-3.5 text-sky-500" />
                    )}
                    <span>কানেকশন টেস্ট করুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetFirebaseConfig}
                    className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-rose-500 hover:text-rose-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>ডিফল্ট কনফিগারেশনে ফিরে যান</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>কনফিগারেশন সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>

          {/* DATABASE INITIALIZATION CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">১ম ধাপ: মাস্টার ডেটা আপলোড করুন (Master Data Upload)</h3>
                <p className="text-xs text-slate-500">আপনার নতুন ক্লাউড ডাটাবেজে বিল্ডিংয়ের ফ্ল্যাট ও সদস্য তথ্য আপলোড করুন</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              যেহেতু আপনি একটি সম্পূর্ণ নতুন ফায়ারবেস প্রজেক্ট যুক্ত করেছেন, তাই আপনার ফায়ারবেস কনসোল সম্পূর্ণ খালি রয়েছে (কোনো কালেকশন বা ডকুমেন্ট নেই)। এই পিসিতে বা অন্য কোনো মোবাইলে লাইভ ডাটা দেখতে হলে প্রথমে <strong>২৮টি ফ্ল্যাট ও ২৫জন সদস্যের মূল মাস্টার ডেটা</strong> আপনার ক্লাউড ডাটাবেজে আপলোড করতে হবে।
            </p>

            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/50 dark:border-emerald-950/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-bold block text-slate-900 dark:text-white mb-0.5">কী কী ডেটা আপনার ক্লাউডে জমা হবে?</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>২৮টি ফ্ল্যাট (Flats):</strong> 2-A থেকে 9-D পর্যন্ত প্রতিটি ফ্ল্যাটের বিবরণ ও নাম।</li>
                  <li><strong>২৫জন সদস্য (Members):</strong> JCT-001 থেকে JCT-025 পর্যন্ত প্রতিটি ফ্ল্যাট মালিকের নাম, মোবাইল নম্বর এবং প্রারম্ভিক বকেয়া।</li>
                  <li><strong>বিলিং নিয়মনীতি (System Settings):</strong> সার্ভিস চার্জ, পানির বিল, জেনারেটর ফি ও অন্যান্য মাসিক বিলিং সেটিংস।</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500">
                {summary ? (
                  <span>ক্লাউডে বর্তমান তথ্য: <strong className="text-emerald-600 dark:text-emerald-400">{summary.masterFlatsCount} টি ফ্ল্যাট</strong> এবং <strong className="text-emerald-600 dark:text-emerald-400">{summary.masterMembersCount} জন সদস্য</strong>।</span>
                ) : (
                  <span>ডাটাবেজ কানেক্টেড আছে</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSeedMasterData}
                disabled={isSeedingMaster}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/15 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isSeedingMaster ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>মাস্টার ডেটা ক্লাউডে আপলোড করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Complete Wipe (1-Click Reset) */}
      {showClearEverythingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-600/70 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-4 font-bengali">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7 animate-pulse" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/50 uppercase tracking-wider">
                সতর্কতা: সম্পূর্ণ ডেটাবেজ রিসেট
              </span>
              <h3 className="text-lg font-bold text-white">আপনি কি নিশ্চিত যে সকল সদস্য, ফ্ল্যাট ও হিসাব মুছবেন?</h3>
              <p className="text-xs text-slate-300">
                এই অপশনটি ডেটাবেজ থেকে <strong className="text-rose-400">সদস্য তালিকা, ফ্ল্যাট তালিকা, ভাউচার ও সকল হিসাব</strong> পুরোপুরি মুছে ০ করে ফেলবে।
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-rose-900/40 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[12px]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>যেসব তথ্য সম্পূর্ণরূপে মুছে ফেলা হবে:</span>
              </div>
              <ul className="list-disc list-inside text-slate-300 space-y-1 pl-2 text-[11px]">
                <li><strong className="text-white">সমস্ত সদস্য তালিকা</strong> (Members)</li>
                <li><strong className="text-white">সমস্ত ফ্ল্যাট/ইউনিট তালিকা</strong> (Flats)</li>
                <li><strong className="text-white">মাসিক বিল ও হিসাব বিবরণী</strong> (Bills)</li>
                <li><strong className="text-white">সকল খরচ ও ভাউচার ফাইল</strong> (Expenses & Vouchers)</li>
                <li><strong className="text-white">সকল পেমেন্ট ও মানি রসিদ</strong> (Payments & Receipts)</li>
              </ul>
              <div className="p-2 bg-rose-950/60 rounded-xl border border-rose-800/40 text-[11px] text-rose-300 font-medium">
                ফলাফল: ডেটাবেজ সম্পূর্ণ খালি (০ ফ্ল্যাট, ০ সদস্য) হয়ে যাবে যাতে আপনি নতুন করে আসল ডাটা যুক্ত করতে পারেন।
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-slate-300 font-semibold block">
                নিশ্চিত করতে নিচে হুবহু <span className="font-mono text-rose-400 font-bold">DELETE ALL</span> টাইপ করুন:
              </label>
              <input
                type="text"
                value={clearEverythingConfirmText}
                onChange={(e) => setClearEverythingConfirmText(e.target.value)}
                placeholder="DELETE ALL"
                className="w-full px-3 py-2.5 bg-slate-950 border border-rose-700/80 rounded-xl text-center font-mono font-bold text-rose-400 text-sm tracking-wider focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearEverythingModal(false);
                  setClearEverythingConfirmText('');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>

              <button
                type="button"
                onClick={handleClearEverything}
                disabled={isClearingEverything || clearEverythingConfirmText.trim() !== 'DELETE ALL'}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/40 flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isClearingEverything ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>হ্যাঁ, সব মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Demo Clear */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-4 font-bengali">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">আপনি কি সব ডেমো লেনদেন মুছে ফেলতে চান?</h3>
              <p className="text-xs text-slate-300">
                এই অপশনটি শুধুমাত্র ট্রানজেকশনাল ডেমো রেকর্ডগুলো মুছে ফেলবে।
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>যেসব ডেমো রেকর্ড মুছে ফেলা হবে:</span>
                </div>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5 pl-2 text-[11px]">
                  <li>মাসিক বিল (Monthly Bills)</li>
                  <li>খরচ (Expenses)</li>
                  <li>ভাউচার (Vouchers)</li>
                  <li>পেমেন্ট (Payments)</li>
                  <li>রসিদ (Receipts)</li>
                  <li>নোটিশ (Notices)</li>
                </ul>
              </div>

              <div className="p-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-300 font-bold flex items-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>⚠ সদস্য ও ফ্ল্যাটের মাস্টার ডেটা মুছে যাবে না। (২৮টি ফ্ল্যাট ও স্থায়ী সদস্য অক্ষত থাকবে)</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-slate-300 font-semibold block">
                নিশ্চিত করতে নিচে হুবহু <span className="font-mono text-amber-400 font-bold">CLEAR DEMO</span> টাইপ করুন:
              </label>
              <input
                type="text"
                value={clearDemoConfirmText}
                onChange={(e) => setClearDemoConfirmText(e.target.value)}
                placeholder="CLEAR DEMO"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-center font-mono font-bold text-amber-400 text-sm tracking-wider focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirmModal(false);
                  setClearDemoConfirmText('');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>

              <button
                type="button"
                onClick={handleClearDemoData}
                disabled={isClearingDemo || clearDemoConfirmText.trim() !== 'CLEAR DEMO'}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isClearingDemo ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>হ্যাঁ, মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
