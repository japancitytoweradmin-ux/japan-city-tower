import React from 'react';
import { Users, Building2, ChevronDown, UserCheck, Search } from 'lucide-react';
import { Member, UserProfile } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';

interface MemberSelectorBarProps {
  members: Member[];
  activeMember: Member;
  onSelectMember: (member: Member) => void;
  currentUserRole?: string;
}

export const MemberSelectorBar: React.FC<MemberSelectorBarProps> = ({
  members,
  activeMember,
  onSelectMember,
  currentUserRole
}) => {
  const { isBangla } = useTranslation();

  if (!members || members.length <= 1) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 dark:bg-slate-800/80 dark:border-slate-700/80 rounded-2xl p-3.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs font-bengali">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {isBangla ? 'সদস্য বেছে নিন' : 'Select Member Profile'}:
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
              {isBangla ? `মোট ${members.length} জন সদস্য` : `${members.length} Members`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isBangla ? 'অন্যান্য সদস্যদের বিল, পেমেন্ট ও স্টেটমেন্ট দেখতে নিচে তালিকা থেকে নির্বাচন করুন' : 'Select any registered member to view their breakdown & bills'}
          </p>
        </div>
      </div>

      <div className="w-full sm:w-auto min-w-[240px]">
        <select
          value={activeMember.memberId || activeMember.id}
          onChange={(e) => {
            const selected = members.find(m => (m.memberId || m.id) === e.target.value);
            if (selected) onSelectMember(selected);
          }}
          className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer shadow-xs"
        >
          {members.map((m) => {
            const flats = (m.flatUnitNumbers || []).join(', ') || 'ফ্ল্যাট-নির্ধারিত নয়';
            return (
              <option key={m.id || m.memberId} value={m.memberId || m.id}>
                {m.memberId ? `[${m.memberId}] ` : ''}{m.banglaName || m.name} (ফ্ল্যাট: {flats})
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
};
