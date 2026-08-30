import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Layers, 
  Info, 
  Lock,
  Calendar,
  CheckCircle2,
  Bell,
  MessageSquare
} from 'lucide-react';
import { UserProfile, Member, FlatUnit, AppNotification } from '../../types';
import { sampleMembers, sampleUnits } from '../../data/mockData';
import { PageHeader } from '../../components/common/PageHeader';
import { useTranslation } from '../../i18n/LanguageContext';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';
import { notificationService } from '../../services/notificationService';
import { buildingSettingsService, DEFAULT_OFFICE_CONFIG, DEFAULT_BUILDING_INFO } from '../../services/buildingSettingsService';
import { resolveActiveMember, resolveMemberFlats } from '../../utils/memberResolver';
import { OfficeConfigSettings, BuildingInfoSettings } from '../../types';

interface MemberProfilePageProps {
  currentUser: UserProfile;
}

export const MemberProfilePage: React.FC<MemberProfilePageProps> = ({
  currentUser,
}) => {
  const { t, formatNumber, isBangla } = useTranslation();

  const [members, setMembers] = useState<Member[]>([]);
  const [flats, setFlats] = useState<FlatUnit[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfigSettings>(DEFAULT_OFFICE_CONFIG);
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfoSettings>(DEFAULT_BUILDING_INFO);

  useEffect(() => {
    const unsubMem = memberService.subscribeToMembers((loaded) => setMembers(loaded));
    const unsubFlats = flatService.subscribeToFlats((loaded) => setFlats(loaded));
    const unsubNotif = notificationService.subscribeToNotifications(
      (loaded) => setNotifications(loaded),
      currentUser.id,
      currentUser.memberId
    );
    const unsubOffice = buildingSettingsService.subscribeToOfficeConfig((loaded) => setOfficeConfig(loaded));
    const unsubBuilding = buildingSettingsService.subscribeToBuildingInfo((loaded) => setBuildingInfo(loaded));

    return () => {
      unsubMem();
      unsubFlats();
      unsubNotif();
      unsubOffice();
      unsubBuilding();
    };
  }, [currentUser.id, currentUser.memberId]);

  const activeMember = resolveActiveMember(currentUser, members);
  const memberFlats = resolveMemberFlats(activeMember, currentUser, flats);

  return (
    <div className="space-y-6 font-bengali">
      <PageHeader
        title={isBangla ? 'আমার সদস্য প্রোফাইল' : 'My Member Profile'}
        subtitle={isBangla 
          ? 'জাপান সিটি টাওয়ার ফ্ল্যাট মালিক সমিতির সংরক্ষিত প্রোফাইল ও মালিকানা তথ্য' 
          : 'Permanent member registry and unit ownership records'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20">
              {activeMember.name ? activeMember.name.charAt(0) : 'M'}
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {isBangla ? (activeMember.banglaName || activeMember.name) : activeMember.name}
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold mt-0.5">
                Member ID: {activeMember.memberId}
              </p>
            </div>

            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-800">
              {isBangla ? (activeMember.memberTypeBangla || 'স্থায়ী ফ্ল্যাট মালিক') : activeMember.memberType}
            </span>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono">{activeMember.phone || currentUser.phone || officeConfig.mobile}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono">{activeMember.email || currentUser.email || officeConfig.email}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{buildingInfo.buildingNameBangla || 'জাপান সিটি টাওয়ার'}, ঢাকা</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{isBangla ? 'স্থায়ী মাস্টার ডাটা ভেরিফাইড' : 'Master Data Verified'}</span>
          </div>
        </div>

        {/* Right Column: Units Ownership & Management Office Note */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Units List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  {isBangla ? 'বরাদ্দকৃত ফ্ল্যাট ও ইউনিটসমূহ' : 'Assigned Flats & Units'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isBangla ? `মোট ${formatNumber(memberFlats.length)}টি ফ্ল্যাটের রেজিস্ট্রিকৃত মালিকানা` : `Registered ownership of ${formatNumber(memberFlats.length)} flats`}
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg font-mono">
                {formatNumber(memberFlats.length)} {t.members.unitsCount}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {memberFlats.map((flat) => (
                <div
                  key={flat.id || flat.unitNumber}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono block">
                      {isBangla ? 'ফ্ল্যাট' : 'Flat'} {flat.unitNumber}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatNumber(flat.floor)} {isBangla ? 'ম তলা' : 'Floor'} • {flat.unitType || 'আবাসিক'}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isBangla ? 'মালিকানাধীন' : 'Owned'}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Member Notifications & Communication History Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>{isBangla ? 'আমার সাম্প্রতিক নোটিফিকেশন ও বার্তা' : 'Recent In-App Notifications'}</span>
              </div>
              <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full font-bold">
                {formatNumber(notifications.length)} {isBangla ? 'টি' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  {isBangla ? 'আপনার কোনো নোটিফিকেশন নেই।' : 'No notifications for your profile.'}
                </p>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Security & Modification Notice Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>{isBangla ? 'ডাটা নিরাপত্তা ও সংশোধন সংক্রান্ত নির্দেশনা' : 'Data Integrity & Modification Policy'}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isBangla
                ? 'সদস্যের নাম, মোবাইল নম্বর বা ফ্ল্যাটের মালিকানা রেকর্ড নিরাপত্তা ও হিসাব সুরক্ষার স্বার্থে সদস্য কর্তৃক সরাসরি পরিবর্তনযোগ্য নয়। যেকোনো তথ্য আপডেট বা সংশোধন করতে জাপান সিটি টাওয়ার ম্যানেজমেন্ট অফিসে যোগাযোগ করুন।'
                : 'For security and audit protection, ownership records and contact profiles cannot be edited directly by members. Please contact the management office for updates.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-amber-300/90 font-medium">
              <span>🏢 {officeConfig.officeName || 'ম্যানেজমেন্ট অফিস, নিচতলা'}</span>
              <span>📞 {isBangla ? 'হটলাইন' : 'Hotline'}: {officeConfig.mobile || officeConfig.phone}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
