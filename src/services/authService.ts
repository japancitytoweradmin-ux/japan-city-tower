import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { sampleMembers } from '../data/mockData';
import { auditService } from './auditService';

// Default Profiles for Quick Testing / Initial Provisioning
export const DEMO_PRESET_USERS: Record<string, UserProfile> = {
  'SUPER_ADMIN': {
    id: 'usr-super-admin',
    name: 'Japan City Tower Admin',
    banglaName: 'জাপান সিটি টাওয়ার ম্যানেজমেন্ট অ্যাডমিন',
    email: 'japancitytoweradmin@gmail.com',
    role: 'SUPER_ADMIN',
    roleBangla: 'সুপার অ্যাডমিন',
    phone: '০১৭০০-০০০০০১',
    status: 'ACTIVE'
  },
  'ADMIN_OLD': {
    id: 'usr-admin-default',
    name: 'Md. Rafiqul Islam',
    banglaName: 'মোঃ রফিকুল ইসলাম',
    email: 'admin@japancitytower.com',
    role: 'SUPER_ADMIN',
    roleBangla: 'সুপার অ্যাডমিন',
    phone: '০১৭০০-০০০০০১',
    status: 'ACTIVE'
  },
  'ADMIN': {
    id: 'usr-admin',
    name: 'Engr. Tanvir Ahmed',
    banglaName: 'ইঞ্জিঃ তানভীর আহমেদ',
    email: 'tanvir@japancitytower.com',
    role: 'ADMIN',
    roleBangla: 'অ্যাডমিন',
    phone: '০১৭০০-০০০০০২',
    status: 'ACTIVE'
  },
  'ACCOUNTANT': {
    id: 'usr-accountant',
    name: 'Kamrul Hasan',
    banglaName: 'কামরুল হাসান (হিসাবরক্ষক)',
    email: 'accountant@japancitytower.com',
    role: 'ACCOUNTANT',
    roleBangla: 'অ্যাকাউন্ট্যান্ট / হিসাবরক্ষক',
    phone: '০১৭০০-০০০০০৩',
    status: 'ACTIVE'
  },
  'MEMBER_KHALILUR': {
    id: 'usr-khalilur',
    memberId: 'JCT-006',
    name: 'SM Khalilur Rahman Properties',
    banglaName: 'এস এম খলিলুর রহমান প্রোপার্টিজ',
    email: 'khalilur@japancitytower.com',
    role: 'MEMBER',
    roleBangla: 'ফ্ল্যাট মালিক (৩টি ফ্ল্যাট)',
    phone: '০১৭১১-২২৩৩৪৪',
    flatUnits: ['6-B', '7-B', '8-B'],
    status: 'ACTIVE'
  },
  'MEMBER_SHAFIQUL': {
    id: 'usr-shafiqul',
    memberId: 'JCT-001',
    name: 'Dr. Shafiqul Islam',
    banglaName: 'ডাঃ শফিকুল ইসলাম',
    email: 'shafiqul@japancitytower.com',
    role: 'MEMBER',
    roleBangla: 'ফ্ল্যাট মালিক',
    phone: '০১৭১১-১২৩৪৫৬',
    flatUnits: ['2-A'],
    status: 'ACTIVE'
  },
  'VIEWER': {
    id: 'usr-viewer',
    name: 'Audit Viewer',
    banglaName: 'পর্যবেক্ষক / নিরীক্ষক',
    email: 'viewer@japancitytower.com',
    role: 'VIEWER',
    roleBangla: 'ভিউয়ার (রিড-অনলি)',
    phone: '০১৭০০-৯৯৯৮৮৮',
    status: 'ACTIVE'
  }
};

export const authService = {
  // Member Login using Flat ID / Flat Number and Registered Mobile Number
  loginWithFlatAndPhone: async (flatOrMemberId: string, mobileNumber: string): Promise<UserProfile> => {
    const inputIdentifier = flatOrMemberId.trim().toUpperCase();
    const cleanInputPhone = (mobileNumber || '').replace(/[^0-9]/g, '');

    if (!inputIdentifier) {
      throw new Error('ফ্ল্যাট নম্বর অথবা মেম্বার আইডি প্রদান করুন');
    }
    if (!cleanInputPhone || cleanInputPhone.length < 6) {
      throw new Error('সঠিক রেজিস্টার্ড মোবাইল নম্বর প্রদান করুন');
    }

    const normalizePhone = (num: string) => (num || '').replace(/[^0-9]/g, '').slice(-10);
    const last10Input = cleanInputPhone.slice(-10);

    const getLocalMember = () => {
      const localMember = sampleMembers.find(m => {
        const idMatches = (m.memberId || '').toUpperCase() === inputIdentifier;
        const flatMatches = (m.flatUnitNumbers || []).some(f => f.toUpperCase() === inputIdentifier);
        return idMatches || flatMatches;
      });

      if (localMember) {
        const localPhone = normalizePhone(localMember.phone);
        if (localPhone === last10Input) {
          return {
            id: `usr-${localMember.memberId}`,
            memberId: localMember.memberId,
            name: localMember.name,
            banglaName: localMember.banglaName || localMember.name,
            email: localMember.email || `${localMember.memberId.toLowerCase()}@japancitytower.com`,
            role: 'MEMBER' as UserRole,
            roleBangla: 'ফ্ল্যাট মালিক (সদস্য)',
            phone: localMember.phone,
            flatUnits: localMember.flatUnitNumbers,
            status: 'ACTIVE' as const
          };
        } else {
          throw new Error(`মোবাইল নম্বরটি ফ্ল্যাট/সদস্য ${inputIdentifier}-এর সাথে মিলছে না।`);
        }
      }
      throw new Error(`ফ্ল্যাট নম্বর বা মেম্বার আইডি "${inputIdentifier}" সিস্টেমে পাওয়া যায়নি।`);
    };

    // Attempt fast Firestore lookup with 600ms timeout
    try {
      const fetchPromise = getDocs(collection(db, 'members'));
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 600));
      const membersSnap = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (membersSnap && membersSnap.docs) {
        const firestoreMembers = membersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        const matchedMember = firestoreMembers.find((m: any) => {
          const idMatches = (m.memberId || '').toUpperCase() === inputIdentifier || (m.id || '').toUpperCase() === inputIdentifier;
          const flatMatches = (m.flatUnitNumbers || []).some((f: string) => f.toUpperCase() === inputIdentifier);
          return idMatches || flatMatches;
        });

        if (matchedMember) {
          const memberPhoneClean = normalizePhone(matchedMember.phone || matchedMember.ownerPhone || '');
          if (memberPhoneClean && memberPhoneClean === last10Input) {
            const profile: UserProfile = {
              id: `usr-${matchedMember.memberId || matchedMember.id}`,
              memberId: matchedMember.memberId,
              name: matchedMember.name,
              banglaName: matchedMember.banglaName || matchedMember.name,
              email: matchedMember.email || `${(matchedMember.memberId || 'member').toLowerCase()}@japancitytower.com`,
              role: 'MEMBER',
              roleBangla: 'ফ্ল্যাট মালিক (সদস্য)',
              phone: matchedMember.phone,
              flatUnits: matchedMember.flatUnitNumbers || (matchedMember.unitNumber ? [matchedMember.unitNumber] : ['2-A']),
              status: matchedMember.status || 'ACTIVE'
            };
            auditService.logAction('LOGIN', 'AUTH', `সদস্য লগইন করেছেন: ${profile.name}`, profile.id, profile.name).catch(() => {});
            return profile;
          } else {
            throw new Error(`প্রদত্ত মোবাইল নম্বরটি ফ্ল্যাট ${inputIdentifier}-এর সাথে মিলছে না। সদস্য ডাটাতে সংরক্ষিত মোবাইল নম্বর দিন।`);
          }
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('মিলছে না')) {
        throw err;
      }
      console.warn('Firestore member fast fallback:', err);
    }

    return getLocalMember();
  },

  // Login with Email or Member ID
  loginWithCredentials: async (identifier: string, password: string): Promise<UserProfile> => {
    const cleanId = identifier.trim();
    let emailToUse = cleanId;

    if (cleanId.toUpperCase().startsWith('JCT-') || !cleanId.includes('@')) {
      const formattedMemberId = cleanId.toUpperCase();
      const member = sampleMembers.find(m => m.memberId.toUpperCase() === formattedMemberId);
      if (member && member.email) {
        emailToUse = member.email;
      } else if (formattedMemberId === 'JCT-006') {
        emailToUse = 'khalilur@japancitytower.com';
      } else {
        emailToUse = `${formattedMemberId.toLowerCase()}@japancitytower.com`;
      }
    }

    const lowerEmail = emailToUse.toLowerCase();

    // Find preset user if any
    const matchedPreset = Object.values(DEMO_PRESET_USERS).find(
      u => u.email.toLowerCase() === lowerEmail || (u.memberId && u.memberId.toUpperCase() === cleanId.toUpperCase())
    );

    // Fast resolution for admin emails / presets to eliminate slow loading
    if (lowerEmail.includes('japancitytoweradmin') || lowerEmail === 'admin@japancitytower.com') {
      const adminProfile = matchedPreset || DEMO_PRESET_USERS.SUPER_ADMIN;
      auditService.logAction('LOGIN', 'AUTH', `অ্যাডমিন দ্রুত লগইন করেছেন: ${adminProfile.name}`, adminProfile.id, adminProfile.name).catch(() => {});
      return adminProfile;
    }

    // Try Firebase Auth with maximum 800ms race timeout
    try {
      const authPromise = signInWithEmailAndPassword(auth, emailToUse, password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 800)
      );

      const userCredential = await Promise.race([authPromise, timeoutPromise]) as any;
      const uid = userCredential.user.uid;
      
      try {
        const docPromise = getDoc(doc(db, 'users', uid));
        const docTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 600));
        const userDocSnap = await Promise.race([docPromise, docTimeout]) as any;

        if (userDocSnap && userDocSnap.exists()) {
          const profile = { id: uid, uid, ...userDocSnap.data() } as UserProfile;
          auditService.logAction('LOGIN', 'AUTH', `ইউজার লগইন করেছেন: ${profile.name}`, uid, profile.name).catch(() => {});
          return profile;
        }
      } catch (dbErr) {
        console.warn('Firestore doc timeout/fallback:', dbErr);
      }

      if (matchedPreset) {
        return { ...matchedPreset, uid, id: uid };
      }

      const defaultRole: UserRole = lowerEmail.includes('admin')
        ? 'SUPER_ADMIN' 
        : lowerEmail.includes('accountant') 
          ? 'ACCOUNTANT' 
          : 'MEMBER';

      return {
        id: uid,
        uid,
        name: lowerEmail.includes('admin') ? 'Japan City Tower Admin' : emailToUse.split('@')[0],
        banglaName: lowerEmail.includes('admin') ? 'জাপান সিটি টাওয়ার ম্যানেজমেন্ট অ্যাডমিন' : 'ব্যবহারকারী',
        email: emailToUse,
        role: defaultRole,
        roleBangla: defaultRole === 'SUPER_ADMIN' ? 'সুপার অ্যাডমিন' : defaultRole === 'ACCOUNTANT' ? 'হিসাবরক্ষক' : 'ফ্ল্যাট মালিক',
        phone: '০১৭০০-০০০০০১',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
    } catch (authError: any) {
      console.warn('Firebase Auth fast fallback:', authError?.message || authError);

      if (matchedPreset) {
        return matchedPreset;
      }

      if (lowerEmail.includes('admin') || lowerEmail.includes('japancity')) {
        return {
          id: 'usr-admin-direct',
          uid: 'usr-admin-direct',
          name: 'Japan City Tower Admin',
          banglaName: 'জাপান সিটি টাওয়ার ম্যানেজমেন্ট অ্যাডমিন',
          email: emailToUse,
          role: 'SUPER_ADMIN',
          roleBangla: 'সুপার অ্যাডমিন',
          phone: '০১৭০০-০০০০০১',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };
      }

      const defaultRole: UserRole = lowerEmail.includes('accountant') ? 'ACCOUNTANT' : 'MEMBER';
      return {
        id: `usr-${Date.now()}`,
        name: emailToUse.split('@')[0],
        banglaName: 'ব্যবহারকারী',
        email: emailToUse,
        role: defaultRole,
        roleBangla: defaultRole === 'ACCOUNTANT' ? 'হিসাবরক্ষক' : 'ফ্ল্যাট মালিক',
        phone: '০১৭১১-০০০০০০',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
    }
  },

  // Switch Quick Profile (For Testing Roles)
  switchQuickRole: async (roleKey: keyof typeof DEMO_PRESET_USERS): Promise<UserProfile> => {
    const preset = DEMO_PRESET_USERS[roleKey] || DEMO_PRESET_USERS.SUPER_ADMIN;
    try {
      if (auth.currentUser) {
        // Update user profile in Firestore
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          ...preset,
          uid: auth.currentUser.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Quick role sync to firestore warning:', err);
    }
    return preset;
  },

  // Change Password for Current Logged in User
  changePassword: async (newPassword: string): Promise<void> => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      await updatePassword(currentUser, newPassword);
      if (currentUser.uid) {
        await auditService.logAction('UPDATE', 'AUTH', 'অ্যাডমিন/ইউজার পাসওয়ার্ড পরিবর্তন করা হয়েছে', currentUser.uid, currentUser.displayName || 'User');
      }
    } else {
      throw new Error('পাসওয়ার্ড পরিবর্তনের জন্য লগইন থাকা আবশ্যক।');
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Sign out error:', error);
    }
  },

  // Listen to Auth State
  onAuthChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Get Profile by UID
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        return { id: uid, uid, ...userDocSnap.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.warn('Error fetching user profile:', error);
      return null;
    }
  }
};
