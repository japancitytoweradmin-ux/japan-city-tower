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

    // 1. First check in Firestore members collection
    try {
      const membersSnap = await getDocs(collection(db, 'members'));
      const firestoreMembers = membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const searchPool = firestoreMembers.length > 0 ? firestoreMembers : sampleMembers;

      // Find member matching memberId or having flat in flatUnitNumbers
      let matchedMember = searchPool.find(m => {
        const idMatches = (m.memberId || '').toUpperCase() === inputIdentifier || 
                          (m.id || '').toUpperCase() === inputIdentifier ||
                          inputIdentifier.endsWith(m.memberId?.replace('JCT-', '') || 'XYZ');
        const flatMatches = (m.flatUnitNumbers || []).some((f: string) => f.toUpperCase() === inputIdentifier);
        return idMatches || flatMatches;
      });

      // If not matched in members, check flats
      if (!matchedMember) {
        const flatsSnap = await getDocs(collection(db, 'flats'));
        const firestoreFlats = flatsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const matchedFlat = firestoreFlats.find(f => (f.unitNumber || '').toUpperCase() === inputIdentifier);
        if (matchedFlat) {
          matchedMember = {
            id: matchedFlat.memberId || `mem-${matchedFlat.unitNumber}`,
            memberId: matchedFlat.memberId || 'JCT-MEMBER',
            name: matchedFlat.ownerName || 'ফ্ল্যাট মালিক',
            banglaName: matchedFlat.ownerName || 'ফ্ল্যাট মালিক',
            phone: matchedFlat.ownerPhone || '',
            flatUnitNumbers: [matchedFlat.unitNumber],
            status: 'ACTIVE'
          };
        }
      }

      if (matchedMember) {
        const memberPhoneClean = normalizePhone(matchedMember.phone || matchedMember.ownerPhone || '');
        // Compare last 10 digits
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

          await auditService.logAction(
            'LOGIN',
            'AUTH',
            `সদস্য ফ্ল্যাট/মোবাইল দিয়ে লগইন করেছেন: ${profile.name} (ফ্ল্যাট: ${(profile.flatUnits || []).join(', ')})`,
            profile.id,
            profile.name
          );

          return profile;
        } else {
          throw new Error(`প্রদত্ত মোবাইল নম্বরটি ফ্ল্যাট ${inputIdentifier}-এর সাথে মিলছে না। সদস্য ডাটাতে সংরক্ষিত মোবাইল নম্বর দিন।`);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('মিলছে না')) {
        throw err;
      }
      console.warn('Firestore member login search note, falling back to mockData:', err);
    }

    // 2. Fallback in sampleMembers & sampleUnits
    const localMember = sampleMembers.find(m => {
      const idMatches = m.memberId.toUpperCase() === inputIdentifier;
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
          role: 'MEMBER',
          roleBangla: 'ফ্ল্যাট মালিক (সদস্য)',
          phone: localMember.phone,
          flatUnits: localMember.flatUnitNumbers,
          status: 'ACTIVE'
        };
      } else {
        throw new Error(`মোবাইল নম্বরটি ফ্ল্যাট/সদস্য ${inputIdentifier}-এর সাথে মিলছে না।`);
      }
    }

    throw new Error(`ফ্ল্যাট নম্বর বা মেম্বার আইডি "${inputIdentifier}" সিস্টেমে পাওয়া যায়নি।`);
  },

  // Login with Email or Member ID
  loginWithCredentials: async (identifier: string, password: string): Promise<UserProfile> => {
    let emailToUse = identifier.trim();

    // If identifier is a Member ID like JCT-006, resolve member email
    if (identifier.toUpperCase().startsWith('JCT-') || !identifier.includes('@')) {
      const formattedMemberId = identifier.trim().toUpperCase();
      const member = sampleMembers.find(m => m.memberId.toUpperCase() === formattedMemberId);
      if (member && member.email) {
        emailToUse = member.email;
      } else if (formattedMemberId === 'JCT-006') {
        emailToUse = 'khalilur@japancitytower.com';
      } else {
        emailToUse = `${formattedMemberId.toLowerCase()}@japancitytower.com`;
      }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const uid = userCredential.user.uid;
      
      // Fetch user profile from Firestore
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const profile = { id: uid, uid, ...userDocSnap.data() } as UserProfile;
        await auditService.logAction('LOGIN', 'AUTH', `ইউজার লগইন করেছেন: ${profile.name} (${profile.role})`, uid, profile.name);
        return profile;
      } else {
        // Create user profile in Firestore
        const defaultRole: UserRole = emailToUse.includes('admin') 
          ? 'SUPER_ADMIN' 
          : emailToUse.includes('accountant') 
            ? 'ACCOUNTANT' 
            : 'MEMBER';
            
        const isKhalilur = emailToUse.includes('khalilur') || identifier.includes('006');
        const fallbackProfile: UserProfile = {
          id: uid,
          uid,
          name: isKhalilur ? 'SM Khalilur Rahman Properties' : userCredential.user.displayName || emailToUse.split('@')[0],
          banglaName: isKhalilur ? 'এস এম খলিলুর রহমান প্রোপার্টিজ' : 'ব্যবহারকারী',
          email: emailToUse,
          memberId: isKhalilur ? 'JCT-006' : undefined,
          role: defaultRole,
          roleBangla: defaultRole === 'SUPER_ADMIN' ? 'সুপার অ্যাডমিন' : defaultRole === 'ACCOUNTANT' ? 'হিসাবরক্ষক' : 'ফ্ল্যাট মালিক',
          phone: '০১৭১১-০০০০০০',
          flatUnits: isKhalilur ? ['6-B', '7-B', '8-B'] : ['2-A'],
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };

        await setDoc(userDocRef, fallbackProfile);
        return fallbackProfile;
      }
    } catch (authError: any) {
      console.warn('Firebase Auth direct attempt note:', authError?.message);

      // If user is not yet created in Firebase Auth, attempt auto-creation for known test users
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, emailToUse, password || 'admin123456');
          const uid = userCredential.user.uid;
          const matchedPreset = Object.values(DEMO_PRESET_USERS).find(u => u.email.toLowerCase() === emailToUse.toLowerCase()) 
            || DEMO_PRESET_USERS.SUPER_ADMIN;
          
          const newProfile: UserProfile = {
            ...matchedPreset,
            id: uid,
            uid,
            email: emailToUse,
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'users', uid), newProfile);
          return newProfile;
        } catch (createErr) {
          console.warn('Auto registration fallback note:', createErr);
        }
      }

      // Check presets for instant simulation fallback if offline
      const matchedPreset = Object.values(DEMO_PRESET_USERS).find(
        u => u.email.toLowerCase() === emailToUse.toLowerCase() || (u.memberId && u.memberId.toUpperCase() === identifier.trim().toUpperCase())
      );

      if (matchedPreset) {
        return matchedPreset;
      }

      throw authError;
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
