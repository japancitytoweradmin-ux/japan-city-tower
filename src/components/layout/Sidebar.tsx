import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Receipt, 
  CreditCard, 
  Coins, 
  FileText, 
  Bell, 
  MessageSquare, 
  Send, 
  BarChart3, 
  Archive, 
  Settings,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import { UserRole } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

export type NavItemKey = 
  | 'dashboard'
  | 'members'
  | 'flats'
  | 'monthly-bills'
  | 'expenses'
  | 'collections'
  | 'receipts'
  | 'notices'
  | 'sms'
  | 'whatsapp'
  | 'reports'
  | 'voucher-archive'
  | 'users'
  | 'audit-log'
  | 'archive'
  | 'financial-summary'
  | 'settings'
  | 'member-flats'
  | 'member-bills'
  | 'member-payments'
  | 'member-receipts'
  | 'member-statement'
  | 'member-profile';

interface NavItem {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface SidebarProps {
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  userRole: UserRole;
  missingVoucherCount?: number;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  userRole,
  missingVoucherCount = 2,
  onCloseMobile,
}) => {
  const { t, formatNumber, isBangla } = useTranslation();

  const isMemberRole = userRole === 'MEMBER';

  // Member Portal Specific Navigation
  const memberNavItems: NavItem[] = [
    { key: 'dashboard', label: t.memberPortal?.myDashboard || (isBangla ? 'আমার ড্যাশবোর্ড' : 'My Dashboard'), icon: LayoutDashboard },
    { key: 'member-flats', label: t.memberPortal?.myFlats || (isBangla ? 'আমার ফ্ল্যাট' : 'My Flats'), icon: Building2 },
    { key: 'member-bills', label: t.memberPortal?.myBills || (isBangla ? 'আমার বিল' : 'My Bills'), icon: Receipt },
    { key: 'member-payments', label: t.memberPortal?.myPayments || (isBangla ? 'আমার পেমেন্ট হিস্টোরি' : 'My Payments'), icon: Coins },
    { key: 'member-receipts', label: t.memberPortal?.myReceipts || (isBangla ? 'আমার রসিদ' : 'My Receipts'), icon: FileText },
    { key: 'member-statement', label: t.memberPortal?.myStatement || (isBangla ? 'আমার স্টেটমেন্ট' : 'My Statement'), icon: BarChart3 },
    { key: 'notices', label: t.nav.notices, icon: Bell },
    { key: 'member-profile', label: t.memberPortal?.myProfile || (isBangla ? 'আমার প্রোফাইল' : 'My Profile'), icon: UserCheck },
  ];

  // Admin / Management Navigation
  const adminNavItems: NavItem[] = [
    { key: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { key: 'members', label: t.nav.members, icon: Users },
    { key: 'flats', label: t.nav.flats, icon: Building2 },
    { key: 'monthly-bills', label: t.nav.monthlyBills, icon: Receipt },
    { 
      key: 'expenses', 
      label: t.nav.expenses, 
      icon: CreditCard,
      badge: missingVoucherCount > 0 ? `${formatNumber(missingVoucherCount)} ${t.nav.missingVouchers}` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    { key: 'collections', label: t.nav.collections, icon: Coins },
    { key: 'receipts', label: t.nav.receipts, icon: FileText },
    { key: 'financial-summary', label: t.nav.cashSummary || (isBangla ? 'আর্থিক সারসংক্ষেপ' : 'Financial Summary'), icon: Calculator },
    { key: 'reports', label: t.nav.reports, icon: BarChart3 },
    { key: 'users', label: t.nav.users || (isBangla ? 'ইউজার ব্যবস্থাপনা' : 'User Management'), icon: ShieldCheck },
    { key: 'audit-log', label: t.nav.auditLog || (isBangla ? 'অডিট লগ' : 'Audit Log'), icon: FileText },
    { key: 'archive', label: t.nav.archive || (isBangla ? 'আর্কাইভ' : 'Archive'), icon: Archive },
    { key: 'notices', label: t.nav.notices, icon: Bell },
    { key: 'sms', label: t.nav.sms, icon: Send },
    { key: 'whatsapp', label: t.nav.whatsapp, icon: MessageSquare },
    { key: 'voucher-archive', label: t.nav.voucherArchive, icon: Archive },
    { key: 'settings', label: t.nav.settings, icon: Settings },
  ];

  const navItems = isMemberRole ? memberNavItems : adminNavItems;

  const handleSelect = (key: NavItemKey) => {
    onTabChange(key);
    onCloseMobile?.();
  };

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/10">
            <Building2 className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">
              {t.app.title}
            </h2>
            <p className="text-[11px] text-amber-400 font-sans tracking-wide">
              {t.app.portalTitle}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {t.nav.mainMenu}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelect(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Building Info Footer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/60 text-xs">
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>{t.nav.towerUnits}</span>
            <span className="text-amber-400 font-bold">{formatNumber(28)} {isBangla ? 'টি ফ্ল্যাট' : 'Flats'}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>{t.nav.totalFloors}</span>
            <span className="text-white font-medium">{formatNumber(9)} {isBangla ? 'তলা' : 'Floors'}</span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{t.nav.liveSystem} ({t.app.phase})</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
