import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  User, 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  Sparkles,
  AlertCircle,
  Calculator,
  UserCheck,
  Eye,
  Loader2,
  Database,
  Phone,
  Home,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { authService, DEMO_PRESET_USERS } from '../../services/authService';
import { useToast } from '../../components/common/Toast';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { showToast } = useToast();
  const [loginMode, setLoginMode] = useState<'MEMBER' | 'ADMIN'>('MEMBER');

  // Member Login States
  const [flatOrMemberId, setFlatOrMemberId] = useState('6-B');
  const [memberPhone, setMemberPhone] = useState('01819-223344');

  // Admin Login States
  const [adminEmail, setAdminEmail] = useState('admin@japancitytower.com');
  const [adminPassword, setAdminPassword] = useState('admin123456');

  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!flatOrMemberId.trim()) {
      setErrorMessage('আপনার ফ্ল্যাট নম্বর (যেমন: 2-A, 6-B) বা মেম্বার আইডি দিন');
      return;
    }
    if (!memberPhone.trim()) {
      setErrorMessage('সদস্য ডাটাতে নিবন্ধিত মোবাইল নম্বর দিন');
      return;
    }

    setIsLoading(true);
    try {
      const user = await authService.loginWithFlatAndPhone(flatOrMemberId, memberPhone);
      showToast(`স্বাগতম, ${user.banglaName || user.name} (ফ্ল্যাট: ${(user.flatUnits || []).join(', ')})`, 'success');
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Member login error:', err);
      setErrorMessage(err.message || 'ফ্ল্যাট নম্বর বা মোবাইল নম্বর মিলছে না। অনুগ্রহ করে সঠিক তথ্য দিন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminEmail.trim()) {
      setErrorMessage('অ্যাডমিন ইমেইল অথবা আইডি প্রদান করুন');
      return;
    }
    if (!adminPassword.trim()) {
      setErrorMessage('অ্যাডমিন পাসওয়ার্ড প্রদান করুন');
      return;
    }

    setIsLoading(true);
    try {
      const user = await authService.loginWithCredentials(adminEmail, adminPassword);
      showToast(`স্বাগতম, ${user.banglaName} (${user.roleBangla})`, 'success');
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Admin login error:', err);
      setErrorMessage(err.message || 'লগইন ব্যর্থ হয়েছে। অ্যাডমিন আইডি ও পাসওয়ার্ড সঠিক কিনা যাচাই করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPresetLogin = async (key: keyof typeof DEMO_PRESET_USERS) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const preset = DEMO_PRESET_USERS[key];
      const user = await authService.loginWithCredentials(
        preset.email, 
        preset.role === 'MEMBER' ? 'member123456' : 'admin123456'
      );
      showToast(`${user.banglaName} হিসেবে প্রবেশ করা হয়েছে`, 'info');
      onLoginSuccess(user);
    } catch (err: any) {
      // Fallback directly to preset for instant preview
      const fallback = DEMO_PRESET_USERS[key];
      onLoginSuccess(fallback);
      showToast(`${fallback.banglaName} (${fallback.roleBangla}) হিসেবে প্রবেশ করা হয়েছে`, 'info');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-bengali text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Tower Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 mb-4">
          <Building2 className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          জাপান সিটি টাওয়ার
        </h1>
        <p className="text-xs sm:text-sm text-amber-400 font-sans tracking-wide mt-1">
          Common Bill & Tower Management System
        </p>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <Database className="w-3.5 h-3.5" />
          <span>অনলাইন ক্লাউড ডাটাবেজ সক্রিয় • ২৮টি ফ্ল্যাট ও ২৫ সদস্য</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-xl py-7 px-6 sm:px-8 rounded-3xl shadow-2xl space-y-5">
          
          {/* LOGIN MODE TOGGLE (Member vs Admin) */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => {
                setLoginMode('MEMBER');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                loginMode === 'MEMBER'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>সদস্য / ফ্ল্যাট মালিক</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('ADMIN');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                loginMode === 'ADMIN'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>অ্যাডমিন / কমিটি</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MEMBER LOGIN FORM (Flat No + Mobile Number) */}
          {loginMode === 'MEMBER' ? (
            <form onSubmit={handleMemberSubmit} className="space-y-4">
              <div className="p-3 bg-sky-950/40 border border-sky-800/40 rounded-xl text-xs text-sky-200/90 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sky-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>সহজ সদস্য লগইন:</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  সদস্য ডাটাতে দেওয়া আপনার <strong>ফ্ল্যাট নম্বর</strong> এবং <strong>মোবাইল নম্বর</strong> দিয়ে সরাসরি প্রবেশ করুন। কোনো পাসওয়ার্ড মুখস্থ করার প্রয়োজন নেই।
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ফ্ল্যাট নম্বর অথবা মেম্বার আইডি *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Home className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={flatOrMemberId}
                    onChange={(e) => setFlatOrMemberId(e.target.value)}
                    placeholder="যেমন: 2-A, 6-B, 9-D অথবা JCT-006"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  নিবন্ধিত মোবাইল নম্বর (সদস্যের ফোন নম্বর) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    placeholder="যেমন: 01711-100001 অথবা 01819-223344"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded-sm bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>আমার ডিভাইস মনে রাখুন</span>
                </label>
                <button
                  type="button"
                  onClick={() => showToast('মোবাইল নম্বর পরিবর্তন বা ভেরিফিকেশনের জন্য ম্যানেজমেন্টে যোগাযোগ করুন', 'info')}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  সাহায্য প্রয়োজন?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>সদস্য হিসেবে প্রবেশ করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ADMIN LOGIN FORM */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  অ্যাডমিন ইমেইল / ইউজার আইডি *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="যেমন: admin@japancitytower.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  অ্যাডমিন পাসওয়ার্ড *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded-sm bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Remember Me</span>
                </label>
                <button
                  type="button"
                  onClick={() => showToast('পাসওয়ার্ড রিকভারির জন্য সুপার অ্যাডমিনের সাথে যোগাযোগ করুন', 'info')}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>অ্যাডমিন প্যানেলে প্রবেশ করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500 mt-5">
          © ২০২৫-২০২৬ জাপান সিটি টাওয়ার ম্যানেজমেন্ট কমিটি • Firebase Cloud Firestore Secured
        </p>
      </div>
    </div>
  );
};
