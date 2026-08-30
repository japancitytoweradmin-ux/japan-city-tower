import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Edit, 
  Key, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Lock,
  Eye,
  Building
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';

export const UserManagementPage: React.FC = () => {
  const { userProfile: currentUser } = useAuth();
  const { language, isBangla } = useTranslation();
  const isBn = isBangla;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('MEMBER');
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);

  useEffect(() => {
    const unsub = userService.subscribeToUsers((list) => {
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenEditRole = (user: UserProfile) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSelectedUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!selectedUser || !currentUser) return;
    setUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await userService.updateUserRole(selectedUser.id, newRole, currentUser);
      setSuccessMsg(isBn ? 'ইউজার ভূমিকা সফলভাবে আপডেট করা হয়েছে।' : 'User role updated successfully.');
      setTimeout(() => {
        setSelectedUser(null);
        setSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || (isBn ? 'ভূমিকা আপডেটে ব্যর্থ হয়েছে' : 'Failed to update user role'));
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    if (!currentUser) return;
    const nextStatus = user.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    try {
      await userService.updateUserStatus(user.id, nextStatus, currentUser);
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!u) return false;
    const s = (search || '').toLowerCase().trim();
    if (!s) {
      return roleFilter === 'ALL' || u.role === roleFilter;
    }
    const nameStr = (u.name || '').toLowerCase();
    const banglaStr = (u.banglaName || '').toLowerCase();
    const emailStr = (u.email || '').toLowerCase();
    const phoneStr = (u.phone || (u as any).mobile || '').toLowerCase();
    const memberIdStr = (u.memberId || '').toLowerCase();
    const flatStr = (u.flatUnits || []).join(' ').toLowerCase();

    const matchesSearch = 
      nameStr.includes(s) ||
      banglaStr.includes(s) ||
      emailStr.includes(s) ||
      phoneStr.includes(s) ||
      memberIdStr.includes(s) ||
      flatStr.includes(s);

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">সুপার অ্যাডমিন</span>;
      case 'ADMIN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">অ্যাডমিন</span>;
      case 'ACCOUNTANT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">হিসাবরক্ষক</span>;
      case 'MEMBER':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">মেম্বার / সদস্য</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">ভিউয়ার</span>;
    }
  };

  const isUserAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'ACCOUNTANT';

  if (!isUserAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4 my-10 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {isBn ? 'সংরক্ষিত অ্যাডমিন এলাকা' : 'Admin Area Restricted'}
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          {isBn 
            ? 'ইউজার ও ভূমিকা ব্যবস্থাপনা শুধুমাত্র সিস্টেম অ্যাডমিন ও ম্যানেজমেন্ট কমিটির জন্য নির্ধারিত। আপনি সদস্য হিসেবে লগইন করেছেন।'
            : 'User management is only available to system administrators and management committee. You are currently logged in as a member.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {isBn ? 'ইউজার ব্যবস্থাপনা ও পারমিশন ম্যাট্রিক্স' : 'User Management & Role Permissions'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isBn ? 'অ্যাডমিন, একাউন্টেন্ট ও ফ্ল্যাট সদস্যদের রোল, স্ট্যাটাস ও রোল পারমিশন ব্যাকএন্ড কন্ট্রোল' : 'Manage system accounts, user roles and security permissions'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowPermissionMatrix(!showPermissionMatrix)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition"
        >
          <Key className="w-4 h-4 text-amber-500" />
          {showPermissionMatrix ? (isBn ? 'পারমিশন ম্যাট্রিক্স লুকান' : 'Hide Matrix') : (isBn ? 'ভূমিকা ও অনুমতি ম্যাট্রিক্স' : 'Role Matrix')}
        </button>
      </div>

      {/* Permission Matrix Drawer */}
      {showPermissionMatrix && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4 shadow-lg border border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              {isBn ? 'ভূমিকা ও সিস্টেম অনুমতি তালিকা (Role Permission Matrix)' : 'Role Permission Matrix'}
            </h2>
            <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
              Firebase Rules Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-800 text-slate-200 border-b border-slate-700">
                <tr>
                  <th className="p-3">ফাংশনালিটি / মডিউল</th>
                  <th className="p-3 text-center text-purple-400">SUPER_ADMIN</th>
                  <th className="p-3 text-center text-blue-400">ADMIN</th>
                  <th className="p-3 text-center text-amber-400">ACCOUNTANT</th>
                  <th className="p-3 text-center text-emerald-400">MEMBER</th>
                  <th className="p-3 text-center text-slate-400">VIEWER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="p-3 font-medium text-slate-200">ড্যাশবোর্ড ও আর্থিক ওভারভিউ</td>
                  <td className="p-3 text-center text-emerald-400">✓ পূর্ণ নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-emerald-400">✓ দেখা ও নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-emerald-400">✓ دیکھا ও দেখা</td>
                  <td className="p-3 text-center text-amber-400">নিজ ফ্ল্যাট শুধুমাত্র</td>
                  <td className="p-3 text-center text-slate-400">রিড-অনলি</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-200">খরচ এন্ট্রি, আপডেট ও ক্যাশ মেমো</td>
                  <td className="p-3 text-center text-emerald-400">✓ পূর্ণ নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-emerald-400">✓ দেখা ও তৈরি</td>
                  <td className="p-3 text-center text-emerald-400">✓ এন্ট্রি ও আপলোড</td>
                  <td className="p-3 text-center text-red-400">✕ নিষিদ্ধ</td>
                  <td className="p-3 text-center text-slate-400">রিড-অনলি</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-200">বিল তৈরি, রাউন্ডিং ও প্রকাশ</td>
                  <td className="p-3 text-center text-emerald-400">✓ পূর্ণ হিসাব</td>
                  <td className="p-3 text-center text-emerald-400">✓ প্রকাশ করতে পারবেন</td>
                  <td className="p-3 text-center text-amber-400">ড্রাফট দেখুন</td>
                  <td className="p-3 text-center text-red-400">✕ নিষিদ্ধ</td>
                  <td className="p-3 text-center text-slate-400">প্রকাশিত দেখুন</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-200">পেমেন্ট কালেকশন ও রসিদ তৈরি</td>
                  <td className="p-3 text-center text-emerald-400">✓ পূর্ণ নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-emerald-400">✓ টাকা জমা গ্রহণ</td>
                  <td className="p-3 text-center text-emerald-400">✓ টাকা জমা গ্রহণ</td>
                  <td className="p-3 text-center text-slate-400">রসিদ ডাউনলোড</td>
                  <td className="p-3 text-center text-slate-400">রিড-অনলি</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-200">বন্ধ পিরিয়ড পুনঃউন্মুক্তকরণ (Reopen)</td>
                  <td className="p-3 text-center text-purple-400 font-bold">✓ একক অনুমতি (SUPER_ADMIN)</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-200">সফট ডিলিট রিস্টোর (Archive Restore)</td>
                  <td className="p-3 text-center text-purple-400 font-bold">✓ একক অনুমতি</td>
                  <td className="p-3 text-center text-red-400">✕ শুধু সফট ডিলিট</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-200">সুপার অ্যাডমিন ভূমিকা পরিবর্তন</td>
                  <td className="p-3 text-center text-purple-400 font-bold">✓ সুপার অ্যাডমিন নিয়ন্ত্রণ</td>
                  <td className="p-3 text-center text-red-400 font-semibold">✕ সুরক্ষিত (Protected)</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                  <td className="p-3 text-center text-red-400">✕ বন্ধ</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? 'নাম, ইমেইল, মেম্বার আইডি খুঁজুন...' : 'Search name, email, member ID...'}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {isBn ? 'ভূমিকা ফিল্টার:' : 'Filter Role:'}
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          >
            <option value="ALL">{isBn ? 'সকল ইউজার ও সদস্য (মোট ২৬ জন)' : 'All Users & Members (26 Total)'}</option>
            <option value="SUPER_ADMIN">{isBn ? '১ম সুপার অ্যাডমিন (ম্যানেজমেন্ট কমিটি)' : 'Super Admin (Management)'}</option>
            <option value="MEMBER">{isBn ? 'ফ্ল্যাট মালিক / সদস্য (২৫ জন সদস্য)' : 'Flat Member (25 Owners)'}</option>
            <option value="ACCOUNTANT">{isBn ? 'হিসাবরক্ষক (Accountant)' : 'Accountant'}</option>
            <option value="ADMIN">{isBn ? 'সহকারী অ্যাডমিন (Assistant Admin)' : 'Assistant Admin'}</option>
            <option value="VIEWER">{isBn ? 'ভিউয়ার (View Only)' : 'Viewer (View Only)'}</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-4">{isBn ? 'ইউজার নাম ও ইমেইল' : 'User Name & Email'}</th>
                <th className="p-4">{isBn ? 'ভূমিকা (Role)' : 'Role'}</th>
                <th className="p-4">{isBn ? 'মেম্বার / আইডি' : 'Member ID'}</th>
                <th className="p-4">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="p-4">{isBn ? 'যোগদানের তারিখ' : 'Joined Date'}</th>
                <th className="p-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isBn ? 'ইউজার তালিকা লোড হচ্ছে...' : 'Loading users...'}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isBn ? 'কোনো ইউজার রেকর্ড পাওয়া যায়নি' : 'No users found'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-800">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{user.banglaName || user.name}</span>
                            {user.role === 'SUPER_ADMIN' && (
                              <span title="SUPER_ADMIN Protected" className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-300 dark:border-purple-800">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>১ম অ্যাডমিন</span>
                              </span>
                            )}
                          </div>
                          {user.name && user.name !== user.banglaName && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {user.name}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>📱 {user.phone || user.mobile || 'ফোন নম্বর নেই'}</span>
                            {user.flatUnits && user.flatUnits.length > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-[10px] font-bold rounded">
                                ফ্ল্যাট {user.flatUnits.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">
                      {user.memberId ? (
                        <span className="font-mono text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">
                          {user.memberId}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {user.status === 'INACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          <XCircle className="w-3.5 h-3.5" />
                          {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isBn ? 'সক্রিয়' : 'Active'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      {user.createdAt ? user.createdAt.split('T')[0] : '2026-01-01'}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditRole(user)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {isBn ? 'ভূমিকা সম্পাদন' : 'Edit Role'}
                      </button>

                      {user.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                            user.status === 'INACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          {user.status === 'INACTIVE' ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              {isBn ? 'সক্রিয় করুন' : 'Activate'}
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              {isBn ? 'নিষ্ক্রিয় করুন' : 'Deactivate'}
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {isBn ? 'ইউজার ভূমিকা পরিবর্তন' : 'Edit User Role'}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.name} ({selectedUser.banglaName || selectedUser.name})
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  ইমেইল: {selectedUser.email}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                  <span>বর্তমান ভূমিকা:</span>
                  {getRoleBadge(selectedUser.role)}
                </div>
              </div>

              {selectedUser.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-xl text-xs flex items-center gap-2 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>সুপার অ্যাডমিনের ভূমিকা সাধারণ অ্যাডমিন দ্বারা পরিবর্তনযোগ্য নয়।</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isBn ? 'নতুন ভূমিকা নির্বাচন করুন:' : 'Select New Role:'}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  disabled={selectedUser.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN'}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <option value="SUPER_ADMIN">SUPER_ADMIN (সুপার অ্যাডমিন)</option>
                  )}
                  <option value="ADMIN">ADMIN (সাধারণ অ্যাডমিন)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (হিসাবরক্ষক)</option>
                  <option value="MEMBER">MEMBER (ফ্ল্যাট মালিক / সদস্য)</option>
                  <option value="VIEWER">VIEWER (ভিউয়ার / রিড-অনলি)</option>
                </select>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-xl text-xs flex items-center gap-2 border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveRole}
                disabled={updating || (selectedUser.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN')}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {updating ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'ভূমিকা সংরক্ষণ করুন' : 'Save Role')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
