import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Member } from '../types';
import { sampleMembers } from '../data/mockData';
import { flatService } from './flatService';
import { auditService } from './auditService';

const MEMBERS_COLLECTION = 'members';

export const memberService = {
  // Fetch all members
  getAllMembers: async (): Promise<Member[]> => {
    try {
      const q = query(collection(db, MEMBERS_COLLECTION), orderBy('memberId', 'asc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return sampleMembers;
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
    } catch (error) {
      console.warn('Error loading members from Firestore, falling back to master sample data:', error);
      return sampleMembers;
    }
  },

  // Subscribe to members updates
  subscribeToMembers: (callback: (members: Member[]) => void) => {
    try {
      const q = query(collection(db, MEMBERS_COLLECTION), orderBy('memberId', 'asc'));
      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback(sampleMembers);
          } else {
            const members = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            })) as Member[];
            callback(members);
          }
        },
        (error) => {
          console.warn('Members snapshot listener error:', error);
          callback(sampleMembers);
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to members:', error);
      callback(sampleMembers);
      return () => {};
    }
  },

  // Get member by member ID
  getMemberById: async (memberId: string): Promise<Member | null> => {
    try {
      const docRef = doc(db, MEMBERS_COLLECTION, memberId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Member;
      }
      const localMember = sampleMembers.find((m) => m.memberId === memberId || m.id === memberId);
      return localMember || null;
    } catch (error) {
      console.warn('Error getting member by ID:', error);
      const localMember = sampleMembers.find((m) => m.memberId === memberId || m.id === memberId);
      return localMember || null;
    }
  },

  // Update member
  updateMember: async (memberId: string, updates: Partial<Member>): Promise<void> => {
    try {
      const memberRef = doc(db, MEMBERS_COLLECTION, memberId);
      await updateDoc(memberRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      await auditService.logAction(
        'UPDATE',
        'MEMBERS',
        `সদস্য ${memberId}-এর তথ্য আপডেট করা হয়েছে`,
        'usr-admin',
        'Admin',
        memberId
      );
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  // Toggle Member Active Status
  toggleMemberStatus: async (memberId: string, currentStatus: 'ACTIVE' | 'INACTIVE', updatedBy = 'Admin'): Promise<'ACTIVE' | 'INACTIVE'> => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const memberRef = doc(db, MEMBERS_COLLECTION, memberId);
      await setDoc(memberRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await auditService.logAction(
        'UPDATE',
        'MEMBERS',
        `সদস্য ${memberId}-এর স্ট্যাটাস পরিবর্তন: ${currentStatus} -> ${newStatus}`,
        'usr-admin',
        updatedBy,
        memberId
      );
      return newStatus;
    } catch (error) {
      console.error('Error toggling member status:', error);
      throw error;
    }
  },

  // Add existing flat unit to member (Multi-Flat Allocation)
  addFlatToMember: async (member: Member, unitNumber: string): Promise<Member> => {
    try {
      const currentFlats = member.flatUnitNumbers || [];
      if (currentFlats.includes(unitNumber)) {
        return member;
      }

      const updatedFlats = [...currentFlats, unitNumber];
      const newTotalUnits = updatedFlats.length;
      const newTotalBill = newTotalUnits * 1997;
      const newTotalDue = Math.max(0, newTotalBill - (member.totalPaid || 0));

      const updatedMember: Member = {
        ...member,
        flatUnitNumbers: updatedFlats,
        totalUnits: newTotalUnits,
        totalBill: newTotalBill,
        totalDue: newTotalDue,
        updatedAt: new Date().toISOString()
      };

      // 1. Update Member in Firestore
      const memberRef = doc(db, MEMBERS_COLLECTION, member.memberId || member.id);
      await setDoc(memberRef, updatedMember, { merge: true });

      // 2. Link Flat to Member (Updating flat ownership without deleting flat master data)
      try {
        await flatService.updateFlat(unitNumber, {
          memberId: member.memberId,
          ownerName: member.name,
          ownerPhone: member.phone,
          status: 'OCCUPIED_OWNER',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Could not update linked flat in Firestore:', err);
      }

      await auditService.logAction(
        'UPDATE',
        'MEMBERS',
        `সদস্য ${member.name} (${member.memberId})-এর সাথে ফ্ল্যাট ${unitNumber} সংযুক্ত করা হয়েছে`
      );

      return updatedMember;
    } catch (error) {
      console.error('Error assigning flat to member:', error);
      throw error;
    }
  },

  // Remove flat unit from member (Does NOT delete Flat Master record)
  removeFlatFromMember: async (member: Member, unitNumber: string): Promise<Member> => {
    try {
      const updatedFlats = (member.flatUnitNumbers || []).filter((f) => f !== unitNumber);
      const newTotalUnits = updatedFlats.length;
      const newTotalBill = newTotalUnits * 1997;
      const newTotalDue = Math.max(0, newTotalBill - (member.totalPaid || 0));

      const updatedMember: Member = {
        ...member,
        flatUnitNumbers: updatedFlats,
        totalUnits: newTotalUnits,
        totalBill: newTotalBill,
        totalDue: newTotalDue,
        updatedAt: new Date().toISOString()
      };

      // 1. Update Member in Firestore
      const memberRef = doc(db, MEMBERS_COLLECTION, member.memberId || member.id);
      await setDoc(memberRef, updatedMember, { merge: true });

      // 2. Unlink flat (keep Flat master record intact, just mark unassigned/vacant)
      try {
        await flatService.updateFlat(unitNumber, {
          memberId: 'UNASSIGNED',
          ownerName: 'অবরাদ্দকৃত (Unassigned)',
          status: 'VACANT',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Could not update unlinked flat in Firestore:', err);
      }

      await auditService.logAction(
        'UPDATE',
        'MEMBERS',
        `সদস্য ${member.name} (${member.memberId}) থেকে ফ্ল্যাট ${unitNumber} মুক্ত করা হয়েছে (ফ্ল্যাট রেকর্ড অক্ষত)`
      );

      return updatedMember;
    } catch (error) {
      console.error('Error removing flat from member:', error);
      throw error;
    }
  },

  // Upsert member (for master data)
  upsertMember: async (member: Member): Promise<void> => {
    try {
      const memberRef = doc(db, MEMBERS_COLLECTION, member.memberId || member.id);
      await setDoc(memberRef, {
        ...member,
        isMasterData: true,
        isDemo: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error upserting member:', error);
      throw error;
    }
  }
};
