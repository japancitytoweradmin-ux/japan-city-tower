import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Coins, 
  Bell, 
  FileText,
  Menu 
} from 'lucide-react';
import { NavItemKey } from './Sidebar';
import { UserRole } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface MobileBottomNavProps {
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  onOpenMenuDrawer: () => void;
  userRole?: UserRole;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenMenuDrawer,
  userRole = 'ADMIN'
}) => {
  const { t, isBangla } = useTranslation();

  const isMember = userRole === 'MEMBER';

  const memberTabs = [
    { key: 'dashboard' as NavItemKey, label: isBangla ? 'হোম' : 'Home', icon: LayoutDashboard },
    { key: 'member-bills' as NavItemKey, label: isBangla ? 'বিল' : 'Bills', icon: Receipt },
    { key: 'member-payments' as NavItemKey, label: isBangla ? 'পেমেন্ট' : 'Payments', icon: Coins },
    { key: 'member-receipts' as NavItemKey, label: isBangla ? 'রসিদ' : 'Receipts', icon: FileText },
  ];

  const adminTabs = [
    { key: 'dashboard' as NavItemKey, label: isBangla ? 'হোম' : 'Home', icon: LayoutDashboard },
    { key: 'monthly-bills' as NavItemKey, label: isBangla ? 'বিল' : 'Bills', icon: Receipt },
    { key: 'collections' as NavItemKey, label: isBangla ? 'পেমেন্ট' : 'Collect', icon: Coins },
    { key: 'notices' as NavItemKey, label: isBangla ? 'নোটিশ' : 'Notices', icon: Bell },
  ];

  const tabs = isMember ? memberTabs : adminTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 text-slate-400 px-2 py-1 no-print print:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}

        {/* Menu button to open full drawer */}
        <button
          type="button"
          onClick={onOpenMenuDrawer}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">{isBangla ? 'মেনু' : 'Menu'}</span>
        </button>
      </div>
    </nav>
  );
};
