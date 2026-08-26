import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole, Member } from '../types';
import { DEMO_PRESET_USERS } from './authService';
import { sampleMembers } from '../data/mockData';
import { auditService } from './auditService';

const USERS_COLLECTION = 'users';
const MEMBERS_COLLECTION = 'members';

const mapMemberToUserProfile = (m: any): UserProfile => ({
  id: `usr-${m.memberId || m.id}`,
  memberId: m.memberId,
  name: m.name,
  banglaName: m.banglaName || m.name,
  email: m.email || `${(m.memberId || 'member').toLowerCase()}@japancitytower.com`,
  role: (m.role as UserRole) || 'MEMBER',
  roleBangla: m.roleBangla || 'ফ্ল্যাট মালিক (সদস্য)',
  phone: m.phone || m.ownerPhone || '',
  flatUnits: m.flatUnitNumbers || (m.unitNumber ? [m.unitNumber] : []),
  status: m.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
});

export const userService = {
  /**
   * Get all users combining Admin and all 25 registered Japan City Tower members
   */
  getAllUsers: async (): Promise<UserProfile[]> => {
    try {
      // 1. Fetch custom users/admins
      const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
      const customUsers = usersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as UserProfile[];

      // 2. Fetch members
      const membersSnap = await getDocs(collection(db, MEMBERS_COLLECTION));
      let memberList: UserProfile[] = [];
      if (!membersSnap.empty) {
        memberList = membersSnap.docs.map(d => mapMemberToUserProfile({ id: d.id, ...d.data() }));
      } else {
        memberList = sampleMembers.map(mapMemberToUserProfile);
      }

      // 3. Ensure primary Super Admin exists
      const adminUser: UserProfile = customUsers.find(u => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN') || {
        id: 'usr-admin',
        name: 'Super Admin - Management Committee',
        banglaName: 'সুপার অ্যাডমিন (ম্যানেজমেন্ট কমিটি)',
        email: 'admin@japancitytower.com',
        role: 'SUPER_ADMIN',
        roleBangla: 'প্রধান অ্যাডমিন (কমিটি)',
        phone: '01711-000000',
        status: 'ACTIVE'
      };

      // Combine admin + members without duplicates
      const result: UserProfile[] = [adminUser];
      const seenIds = new Set([adminUser.id, adminUser.email]);

      // Add custom users
      customUsers.forEach(u => {
        if (!seenIds.has(u.id) && !seenIds.has(u.email)) {
          seenIds.add(u.id);
          seenIds.add(u.email);
          result.push(u);
        }
      });

      // Add members
      memberList.forEach(m => {
        if (!seenIds.has(m.id) && !seenIds.has(m.memberId || '')) {
          seenIds.add(m.id);
          if (m.memberId) seenIds.add(m.memberId);
          result.push(m);
        }
      });

      return result;
    } catch (err) {
      console.warn('Error reading users from firestore, using sample members fallback:', err);
      const adminUser: UserProfile = {
        id: 'usr-admin',
        name: 'Super Admin - Management Committee',
        banglaName: 'সুপার অ্যাডমিন (ম্যানেজমেন্ট কমিটি)',
        email: 'admin@japancitytower.com',
        role: 'SUPER_ADMIN',
        roleBangla: 'প্রধান অ্যাডমিন (কমিটি)',
        phone: '01711-000000',
        status: 'ACTIVE'
      };
      return [adminUser, ...sampleMembers.map(mapMemberToUserProfile)];
    }
  },

  /**
   * Real-time subscription to user profiles (Admin + 25 Members)
   */
  subscribeToUsers: (callback: (users: UserProfile[]) => void) => {
    try {
      // Listen to members collection to sync live changes
      return onSnapshot(
        collection(db, MEMBERS_COLLECTION),
        async (snap) => {
          try {
            const all = await userService.getAllUsers();
            callback(all);
          } catch (e) {
            callback([
              {
                id: 'usr-admin',
                name: 'Super Admin - Management Committee',
                banglaName: 'সুপার অ্যাডমিন (ম্যানেজমেন্ট কমিটি)',
                email: 'admin@japancitytower.com',
                role: 'SUPER_ADMIN',
                roleBangla: 'প্রধান অ্যাডমিন (কমিটি)',
                phone: '01711-000000',
                status: 'ACTIVE'
              },
              ...sampleMembers.map(mapMemberToUserProfile)
            ]);
          }
        },
        async () => {
          const fallback = await userService.getAllUsers();
          callback(fallback);
        }
      );
    } catch (error) {
      console.warn('Users subscribe error:', error);
      callback([
        {
          id: 'usr-admin',
          name: 'Super Admin - Management Committee',
          banglaName: 'সুপার অ্যাডমিন (ম্যানেজমেন্ট কমিটি)',
          email: 'admin@japancitytower.com',
          role: 'SUPER_ADMIN',
          roleBangla: 'প্রধান অ্যাডমিন (কমিটি)',
          phone: '01711-000000',
          status: 'ACTIVE'
        },
        ...sampleMembers.map(mapMemberToUserProfile)
      ]);
      return () => {};
    }
  },

  /**
   * Update User Role
   * Rule: Normal ADMIN cannot modify SUPER_ADMIN user or change anyone to SUPER_ADMIN
   */
  updateUserRole: async (
    targetUserId: string,
    newRole: UserRole,
    actorUser: UserProfile
  ): Promise<boolean> => {
    // 1. Fetch existing profile
    const targetDocRef = doc(db, USERS_COLLECTION, targetUserId);
    let targetProfile: UserProfile | null = null;
    try {
      const snap = await getDoc(targetDocRef);
      if (snap.exists()) {
        targetProfile = snap.data() as UserProfile;
      }
    } catch (err) {
      console.warn('Error reading user profile for update:', err);
    }

    const currentRole = targetProfile?.role || 'MEMBER';

    // Security Check: Normal ADMIN cannot modify SUPER_ADMIN
    if (actorUser.role !== 'SUPER_ADMIN') {
      if (currentRole === 'SUPER_ADMIN') {
        throw new Error('সাধারণ অ্যাডমিন সুপার অ্যাডমিনের ভূমিকা পরিবর্তন করতে পারবে না।');
      }
      if (newRole === 'SUPER_ADMIN') {
        throw new Error('শুধুমাত্র সুপার অ্যাডমিন নতুন সুপার অ্যাডমিন নির্ধারণ করতে পারবে।');
      }
    }

    const roleBanglaMap: Record<UserRole, string> = {
      SUPER_ADMIN: 'সুপার অ্যাডমিন',
      ADMIN: 'অ্যাডমিন',
      ACCOUNTANT: 'হিসাবরক্ষক',
      MEMBER: 'ফ্ল্যাট মালিক / সদস্য',
      VIEWER: 'ভিউয়ার (রিড-অনলি)'
    };

    try {
      await setDoc(targetDocRef, {
        role: newRole,
        roleBangla: roleBanglaMap[newRole],
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await auditService.logAction(
        'UPDATE',
        'USERS',
        `ইউজার ভূমিকা পরিবর্তন: ${targetProfile?.name || targetUserId} (${currentRole} → ${newRole})`,
        actorUser.id,
        actorUser.name,
        targetUserId,
        actorUser.role,
        undefined,
        { role: currentRole },
        { role: newRole }
      );

      return true;
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  },

  /**
   * Activate / Deactivate User Profile
   */
  updateUserStatus: async (
    targetUserId: string,
    newStatus: 'ACTIVE' | 'INACTIVE',
    actorUser: UserProfile
  ): Promise<boolean> => {
    const targetDocRef = doc(db, USERS_COLLECTION, targetUserId);
    
    // Check if target is SUPER_ADMIN
    let targetProfile: UserProfile | null = null;
    try {
      const snap = await getDoc(targetDocRef);
      if (snap.exists()) targetProfile = snap.data() as UserProfile;
    } catch (err) {}

    if (actorUser.role !== 'SUPER_ADMIN' && targetProfile?.role === 'SUPER_ADMIN') {
      throw new Error('সুপার অ্যাডমিনকে নিষ্ক্রিয় করা সম্ভব নয়।');
    }

    try {
      await setDoc(targetDocRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await auditService.logAction(
        'UPDATE',
        'USERS',
        `ইউজার স্ট্যাটাস পরিবর্তন: ${targetProfile?.name || targetUserId} (${newStatus === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'})`,
        actorUser.id,
        actorUser.name,
        targetUserId,
        actorUser.role
      );

      return true;
    } catch (error) {
      console.error('Failed to update user status:', error);
      throw error;
    }
  },

  /**
   * Create or Upsert User Profile
   */
  saveUserProfile: async (user: UserProfile, actorUser?: UserProfile): Promise<void> => {
    try {
      const userRef = doc(db, USERS_COLLECTION, user.id);
      await setDoc(userRef, {
        ...user,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (actorUser) {
        await auditService.logAction(
          'CREATE',
          'USERS',
          `ইউজার প্রোফাইল সংরক্ষণ: ${user.name} (${user.role})`,
          actorUser.id,
          actorUser.name,
          user.id,
          actorUser.role
        );
      }
    } catch (err) {
      console.error('Error saving user profile:', err);
      throw err;
    }
  }
};
