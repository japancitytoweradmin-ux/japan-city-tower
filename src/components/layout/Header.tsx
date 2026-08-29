import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Bell, 
  User, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  Users, 
  Sparkles,
  Menu,
  X,
  CheckCircle2,
  CheckCheck
} from 'lucide-react';
import { UserProfile, UserRole, AppNotification } from '../../types';
import { sampleUsers } from '../../data/mockData';
import { useTranslation } from '../../i18n/LanguageContext';
import { BillingPeriodSelector } from '../common/BillingPeriodSelector';
import { LanguageToggle } from '../common/LanguageToggle';
import { notificationService } from '../../services/notificationService';
import { memberService } from '../../services/memberService';
import { buildingSettingsService, DEFAULT_BUILDING_INFO } from '../../services/buildingSettingsService';
import { Member, BuildingInfoSettings } from '../../types';

interface HeaderProps {
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
  activeNavTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  onToggleMobileMenu,
  activeNavTitle,
}) => {
  const { t, isBangla } = useTranslation();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dbMembers, setDbMembers] = useState<Member[]>([]);
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfoSettings>(DEFAULT_BUILDING_INFO);

  useEffect(() => {
    const unsubscribeNotif = notificationService.subscribeToNotifications(
      (list) => setNotifications(list),
      currentUser.id,
      currentUser.memberId
    );
    const unsubscribeMembers = memberService.subscribeToMembers((loaded) => {
      setDbMembers(loaded);
    });
    const unsubscribeBuilding = buildingSettingsService.subscribeToBuildingInfo((info) => {
      setBuildingInfo(info);
    });

    return () => {
      unsubscribeNotif();
      unsubscribeMembers();
      unsubscribeBuilding();
    };
  }, [currentUser.id, currentUser.memberId]);

  // Combine default sample users (Admins/Accountant) with real loaded members from Firestore
  const realMemberProfiles: UserProfile[] = dbMembers.map((m) => ({
    id: `usr-${m.memberId || m.id}`,
    memberId: m.memberId,
    name: m.name,
    banglaName: m.banglaName || m.name,
    email: m.email || `${(m.memberId || 'member').toLowerCase()}@japancitytower.com`,
    role: 'MEMBER' as UserRole,
    roleBangla: 'ফ্ল্যাট মালিক (সদস্য)',
    phone: m.phone,
    flatUnits: m.flatUnitNumbers || [],
    status: 'ACTIVE' as const
  }));

  // Ensure unique selectable profiles list
  const adminUsers = sampleUsers.filter(u => u.role !== 'MEMBER');
  const allSelectableUsers: UserProfile[] = [
    ...adminUsers,
    ...(realMemberProfiles.length > 0 ? realMemberProfiles : sampleUsers.filter(u => u.role === 'MEMBER'))
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(currentUser.id, currentUser.memberId);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        {/* Row 1 / Left Side: Menu toggle, App Logo, Title & Billing Period */}
        <div className="flex items-center justify-between md:justify-start gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 sm:gap-2.5">
              {buildingInfo.logoUrl ? (
                <img
                  src={buildingInfo.logoUrl}
                  alt={buildingInfo.buildingNameBangla || 'Logo'}
                  className="w-9 h-9 rounded-xl object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-amber-600 flex items-center justify-center text-amber-300 shadow-xs shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {t.app.title}
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 rounded-sm">
                    {t.app.phase}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-sans tracking-tight line-clamp-1">
                  {t.app.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Right Controls: Language & Role */}
          <div className="flex md:hidden items-center gap-1.5">
            <LanguageToggle />
          </div>
        </div>

        {/* Center / Right: Billing Period Selector, Language Toggle, Role Switcher, Profile */}
        <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 overflow-x-auto py-0.5">
          {/* Reusable Billing Period Selector (2026-2035) */}
          <div className="shrink-0">
            <BillingPeriodSelector />
          </div>

          {/* Desktop Language Switcher */}
          <div className="hidden md:block shrink-0">
            <LanguageToggle />
          </div>

          {/* Demo Role Switcher */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
              title={t.auth.switchRoleTitle}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="max-w-[90px] sm:max-w-[130px] truncate text-[11px] sm:text-xs">
                {currentUser.role === 'ADMIN' ? t.auth.adminMode : t.auth.memberMode}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">{t.auth.switchRoleTitle}</p>
                  <p className="text-[11px] text-slate-500">{t.auth.previewRoles}</p>
                </div>
                <div className="py-1 space-y-1">
                  {allSelectableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        onSwitchUser(user);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        currentUser.id === user.id
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <p className="truncate font-semibold">{isBangla ? user.banglaName : user.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {user.role === 'MEMBER' 
                            ? `Units: ${user.flatUnits?.join(', ')}` 
                            : (isBangla ? user.roleBangla : 'System Administrator')}
                        </p>
                      </div>
                      {currentUser.id === user.id && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Trigger */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span>{isBangla ? 'বিজ্ঞপ্তি ও নোটিফিকেশন' : 'Notifications'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 rounded-full text-[10px] font-semibold">
                        {unreadCount} {isBangla ? 'নতুন' : 'new'}
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-normal"
                        title={isBangla ? 'সব পঠিত হিসেবে চিহ্নিত করুন' : 'Mark all read'}
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>{isBangla ? 'সব পঠিত' : 'Read all'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      {isBangla ? 'কোনো নোটিফিকেশন নেই' : 'No notifications yet'}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id}
                        onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                        className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer space-y-1 ${
                          n.isRead 
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400' 
                            : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-slate-900 dark:text-slate-100 font-medium shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-[11px] text-amber-800 dark:text-amber-300">
                            {n.title}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Avatar & Logout */}
          <div className="flex items-center gap-1 sm:gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 font-bold text-xs flex items-center justify-center">
              {currentUser.name.charAt(0)}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              title={t.auth.logout}
              aria-label={t.auth.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
