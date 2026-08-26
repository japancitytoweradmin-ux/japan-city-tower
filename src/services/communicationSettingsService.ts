import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CommunicationSettings } from '../types';
import { auditService } from './auditService';

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  smsEnabled: true,
  smsMaskingName: 'JAPAN TOWER',
  smsProviderName: 'Bangladesh Masking / Non-Masking SMS Gateway',
  smsBalance: 1420,
  autoSendPaymentSms: true,
  autoSendBillPublishedSms: true,
  autoSendDueReminderSms: false,
  autoSendNoticeSms: false,
  whatsappEnabled: true,
  whatsappBusinessNumber: '+8801711000000',
  autoSendPaymentWhatsApp: true,
  autoSendBillPublishedWhatsApp: false,
  autoSendDueReminderWhatsApp: false,
  autoSendNoticeWhatsApp: false,
  inAppNotificationsEnabled: true,
  notifyBillPublished: true,
  notifyPaymentReceived: true,
  notifyDueReminder: true,
  notifyNotice: true,
  notifyGeneralAnnouncement: true,
  duplicateCheckWindowDays: 1, // Prevent duplicate SMS to same member/flat within 24h
};

export const communicationSettingsService = {
  getSettings: async (): Promise<CommunicationSettings> => {
    try {
      const docRef = doc(db, 'settings', 'communication');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return {
          ...DEFAULT_COMMUNICATION_SETTINGS,
          ...snap.data(),
        } as CommunicationSettings;
      }
      return DEFAULT_COMMUNICATION_SETTINGS;
    } catch (error) {
      console.warn('Error loading communication settings from Firestore, using default:', error);
      return DEFAULT_COMMUNICATION_SETTINGS;
    }
  },

  updateSettings: async (
    newSettings: Partial<CommunicationSettings>,
    userId: string = 'usr-admin',
    userName: string = 'Admin'
  ): Promise<CommunicationSettings> => {
    try {
      const current = await communicationSettingsService.getSettings();
      const merged = { ...current, ...newSettings };
      const docRef = doc(db, 'settings', 'communication');
      await setDoc(docRef, merged, { merge: true });

      await auditService.logAction(
        'SMS_SETTINGS_UPDATED',
        'SETTINGS',
        'যোগাযোগ ও এসএমএস কনফিগারেশন পরিবর্তন করা হয়েছে',
        userId,
        userName,
        'settings-communication',
        'ADMIN',
        undefined,
        current,
        merged
      );

      return merged;
    } catch (error) {
      console.error('Error saving communication settings:', error);
      throw error;
    }
  },
};
