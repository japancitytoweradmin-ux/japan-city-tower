import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { LanguageProvider } from './i18n/LanguageContext';
import { BillingPeriodProvider } from './contexts/BillingPeriodContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MainLayout } from './components/layout/MainLayout';
import { NavItemKey } from './components/layout/Sidebar';
import { LoginPage } from './pages/Auth/LoginPage';
import { AdminDashboard } from './pages/Dashboard/AdminDashboard';
import { MemberDashboard } from './pages/Dashboard/MemberDashboard';
import { FlatsPage } from './pages/Flats/FlatsPage';
import { MembersPage } from './pages/Members/MembersPage';
import { MonthlyBillsPage } from './pages/Bills/MonthlyBillsPage';
import { ExpensesPage } from './pages/Expenses/ExpensesPage';
import { CollectionsPage } from './pages/Collections/CollectionsPage';
import { ReceiptsPage } from './pages/Receipts/ReceiptsPage';
import { NoticesPage } from './pages/Notices/NoticesPage';
import { SmsPage } from './pages/Communication/SmsPage';
import { WhatsAppPage } from './pages/Communication/WhatsAppPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { VoucherArchivePage } from './pages/Vouchers/VoucherArchivePage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { UserManagementPage } from './pages/Users/UserManagementPage';
import { AuditLogPage } from './pages/Audit/AuditLogPage';
import { ArchivePage } from './pages/Archive/ArchivePage';
import { FinancialSummaryPage } from './pages/Financial/FinancialSummaryPage';
import { MemberFlatsPage } from './pages/MemberPortal/MemberFlatsPage';
import { MemberBillsPage } from './pages/MemberPortal/MemberBillsPage';
import { MemberPaymentsPage } from './pages/MemberPortal/MemberPaymentsPage';
import { MemberReceiptsPage } from './pages/MemberPortal/MemberReceiptsPage';
import { MemberStatementPage } from './pages/MemberPortal/MemberStatementPage';
import { MemberProfilePage } from './pages/MemberPortal/MemberProfilePage';
import { PaymentReceiptModal } from './components/receipts/PaymentReceiptModal';
import { UserProfile, PaymentRecord } from './types';
import { sampleUsers, sampleExpensesJune2025 } from './data/mockData';
import { Loader2, Building2 } from 'lucide-react';
import { demoDataService } from './services/demoDataService';

function AppContent() {
  const { showToast } = useToast();
  const { userProfile, setUserProfile, isLoading, status } = useAuth();

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');

  // Global Modal States
  const [viewingReceipt, setViewingReceipt] = useState<PaymentRecord | null>(null);

  // Synchronize custom firebase config from default cloud database to this browser automatically (e.g. mobile synchronization)
  useEffect(() => {
    async function syncConfig() {
      try {
        const { syncFirebaseConfigFromCloud } = await import('./lib/firebase');
        const needsReload = await syncFirebaseConfigFromCloud();
        if (needsReload) {
          console.log('Firebase configuration synchronized with cloud database. Reloading to apply...');
        }
      } catch (err) {
        console.error('Error in background configuration sync:', err);
      }
    }
    syncConfig();
  }, []);

  // Auto-initialize master database if it's fresh/empty
  useEffect(() => {
    if (userProfile) {
      demoDataService.initializeDatabaseIfEmpty();
    }
  }, [userProfile]);

  // Missing vouchers count
  const missingVouchersCount = 0;

  const handleLogin = (user: UserProfile) => {
    setUserProfile(user);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setUserProfile(null);
    showToast('লগআউট সফল হয়েছে', 'info');
  };

  const handleSwitchUser = (user: UserProfile) => {
    setUserProfile(user);
    showToast(`ভূমিকা পরিবর্তিত: ${user.banglaName}`, 'info');
  };

  // Loading State with Bangla branding
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-bengali">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 mx-auto animate-pulse">
            <Building2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-white">জাপান সিটি টাওয়ার</h1>
          <p className="text-xs text-amber-400 font-sans tracking-wide">Common Bill & Management System</p>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm pt-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span>লোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is unauthenticated, show LoginPage
  if (!userProfile) {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  const isAdminRole = userProfile.role === 'SUPER_ADMIN' || userProfile.role === 'ADMIN' || userProfile.role === 'ACCOUNTANT' || userProfile.role === 'VIEWER';

  return (
    <MainLayout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      currentUser={userProfile}
      onSwitchUser={handleSwitchUser}
      onLogout={handleLogout}
      missingVoucherCount={missingVouchersCount}
    >
      <ErrorBoundary fallbackTitle="এই মডিউলটি লোড হতে সমস্যা হয়েছে" fallbackMessage="পুনরায় চেষ্টা করতে নিচে ক্লিক করুন।">
        {/* Dynamic Tab Views */}
        {currentTab === 'dashboard' && (
          isAdminRole ? (
            <AdminDashboard
              onNavigate={(tab) => setCurrentTab(tab as NavItemKey)}
              onOpenNewExpense={() => setCurrentTab('expenses')}
              onViewReceipt={(pay) => setViewingReceipt(pay)}
            />
          ) : (
            <MemberDashboard
              currentUser={userProfile}
              onViewReceipt={(pay) => setViewingReceipt(pay)}
              onNavigateTab={(tab) => setCurrentTab(tab as NavItemKey)}
            />
          )
        )}

        {currentTab === 'members' && (
          <MembersPage onNavigateTab={(tab) => setCurrentTab(tab as NavItemKey)} />
        )}

        {currentTab === 'flats' && <FlatsPage />}

        {currentTab === 'monthly-bills' && <MonthlyBillsPage />}

        {currentTab === 'expenses' && <ExpensesPage />}

        {currentTab === 'collections' && <CollectionsPage />}

        {currentTab === 'receipts' && <ReceiptsPage />}

        {currentTab === 'notices' && <NoticesPage isMemberView={!isAdminRole} />}

        {currentTab === 'sms' && <SmsPage />}

        {currentTab === 'whatsapp' && <WhatsAppPage />}

        {currentTab === 'reports' && <ReportsPage />}

        {currentTab === 'voucher-archive' && <VoucherArchivePage />}

        {currentTab === 'users' && <UserManagementPage />}

        {currentTab === 'audit-log' && <AuditLogPage />}

        {currentTab === 'archive' && <ArchivePage />}

        {currentTab === 'financial-summary' && <FinancialSummaryPage />}

        {currentTab === 'settings' && <SettingsPage />}

        {/* Member Portal Views */}
        {currentTab === 'member-flats' && (
          <MemberFlatsPage 
            currentUser={userProfile} 
            onNavigateTab={(tab) => setCurrentTab(tab as NavItemKey)} 
          />
        )}

        {currentTab === 'member-bills' && (
          <MemberBillsPage 
            currentUser={userProfile} 
            onNavigateTab={(tab) => setCurrentTab(tab as NavItemKey)} 
          />
        )}

        {currentTab === 'member-payments' && (
          <MemberPaymentsPage 
            currentUser={userProfile} 
            onViewReceipt={(pay) => setViewingReceipt(pay)} 
          />
        )}

        {currentTab === 'member-receipts' && (
          <MemberReceiptsPage 
            currentUser={userProfile} 
            onViewReceipt={(pay) => setViewingReceipt(pay)} 
          />
        )}

        {currentTab === 'member-statement' && (
          <MemberStatementPage 
            currentUser={userProfile} 
          />
        )}

        {currentTab === 'member-profile' && (
          <MemberProfilePage 
            currentUser={userProfile} 
          />
        )}

        {/* Global Payment Receipt Modal */}
        <PaymentReceiptModal
          isOpen={Boolean(viewingReceipt)}
          onClose={() => setViewingReceipt(null)}
          payment={viewingReceipt}
        />
      </ErrorBoundary>
    </MainLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <BillingPeriodProvider>
          <ToastProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </BillingPeriodProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
