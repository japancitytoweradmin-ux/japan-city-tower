import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, NavItemKey } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { UserProfile } from '../../types';

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  onLogout: () => void;
  missingVoucherCount?: number;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentTab,
  onTabChange,
  currentUser,
  onSwitchUser,
  onLogout,
  missingVoucherCount = 2,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-bengali print:h-auto print:overflow-visible print:bg-white">
      {/* Desktop Left Sidebar */}
      <div className="hidden lg:block h-full shrink-0 no-print print:hidden">
        <Sidebar
          currentTab={currentTab}
          onTabChange={onTabChange}
          userRole={currentUser.role}
          missingVoucherCount={missingVoucherCount}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex no-print print:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="w-72 h-full max-w-[85vw] bg-slate-950 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              currentTab={currentTab}
              onTabChange={onTabChange}
              userRole={currentUser.role}
              missingVoucherCount={missingVoucherCount}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:h-auto print:overflow-visible">
        {/* Top Header */}
        <div className="no-print print:hidden">
          <Header
            currentUser={currentUser}
            onSwitchUser={onSwitchUser}
            onLogout={onLogout}
            onToggleMobileMenu={() => setMobileMenuOpen(true)}
          />
        </div>

        {/* Dynamic Page Scroll Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 print:p-0 print:m-0 print:overflow-visible print:h-auto">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="no-print print:hidden">
          <MobileBottomNav
            currentTab={currentTab}
            onTabChange={onTabChange}
            onOpenMenuDrawer={() => setMobileMenuOpen(true)}
            userRole={currentUser.role}
          />
        </div>
      </div>
    </div>
  );
};
