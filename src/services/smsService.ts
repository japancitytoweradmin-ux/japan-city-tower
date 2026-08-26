import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  CommunicationLog, 
  CommunicationStatus, 
  MessageTemplateType, 
  RecipientTargetType 
} from '../types';
import { auditService } from './auditService';
import { communicationSettingsService } from './communicationSettingsService';

const COMMUNICATION_LOGS_COLLECTION = 'communicationLogs';

export interface SendSmsParams {
  recipientMobile: string;
  recipientName: string;
  message: string;
  memberId?: string;
  flatNumber?: string;
  flatId?: string;
  templateType?: MessageTemplateType;
  templateId?: string;
  billingPeriodId?: string;
  relatedDocumentId?: string;
  sentBy?: string;
  isDemo?: boolean;
  bypassDuplicateCheck?: boolean;
}

export interface SmsSendResult {
  success: boolean;
  logId: string;
  status: CommunicationStatus;
  smsCount: number;
  message: string;
  errorMessage?: string;
  isDuplicateWarning?: boolean;
}

export const sampleCommunicationLogs: CommunicationLog[] = [
  {
    id: 'log-001',
    logId: 'SMS-202506-001',
    recipientMemberId: 'mem-001',
    recipientName: 'মোহাম্মদ রফিকুল ইসলাম',
    recipientMobile: '01711-123456',
    flatNumber: '2-A',
    channel: 'SMS',
    templateType: 'BILL_PUBLISHED',
    message: 'আসসালামু আলাইকুম। জাপান সিটি টাওয়ারের জুন ২০২৫ মাসের কমন বিল ৳১,৯৯৭/- ধার্য করা হয়েছে। অনুগ্রহ করে ১০ তারিখের মধ্যে পরিশোধ করুন।',
    status: 'SENT',
    retryCount: 0,
    billingPeriodId: '2026-08',
    sentBy: 'Admin',
    sentAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    isDemo: true,
  },
  {
    id: 'log-002',
    logId: 'SMS-202506-002',
    recipientMemberId: 'mem-006',
    recipientName: 'এস এম খলিলুর রহমান',
    recipientMobile: '01711-654321',
    flatNumber: '6-B, 7-B, 8-B',
    channel: 'SMS',
    templateType: 'BILL_PUBLISHED',
    message: 'আসসালামু আলাইকুম। জাপান সিটি টাওয়ারের জুন ২০২৫ মাসের কমন বিল প্রস্তুত হয়েছে। ফ্ল্যাট: 6-B, 7-B, 8-B। মোট বিল: ৳৫,৯৯১/-।',
    status: 'SENT',
    retryCount: 0,
    billingPeriodId: '2026-08',
    sentBy: 'Admin',
    sentAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    isDemo: true,
  },
  {
    id: 'log-003',
    logId: 'SMS-202506-003',
    recipientMemberId: 'mem-002',
    recipientName: 'আব্দুল করিম চৌধুরী',
    recipientMobile: '01819-234567',
    flatNumber: '3-A',
    channel: 'SMS',
    templateType: 'DUE_REMINDER',
    message: 'জরুরি তাগিদ: জাপান সিটি টাওয়ারের মাসিক বিল বাবদ আপনার পূর্বের বকেয়া রয়েছে। ঝামেলা এড়াতে দ্রুত পরিশোধের অনুরোধ করা হচ্ছে।',
    status: 'FAILED',
    errorMessage: 'Network timeout / Gateway route busy',
    retryCount: 1,
    billingPeriodId: '2026-08',
    sentBy: 'Admin',
    sentAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    isDemo: true,
  },
  {
    id: 'log-004',
    logId: 'WA-202506-001',
    recipientMemberId: 'mem-001',
    recipientName: 'মোহাম্মদ রফিকুল ইসলাম',
    recipientMobile: '01711-123456',
    flatNumber: '2-A',
    channel: 'WHATSAPP',
    templateType: 'PAYMENT_CONFIRMATION',
    message: 'ধন্যবাদ। জাপান সিটি টাওয়ারে আপনার ফ্ল্যাট 2-A এর জুন ২০২৫ মাসের বিল ৳১,৯৯৭/- পরিশোধ গৃহীত হয়েছে। রসিদ নং: REC-202506-001।',
    status: 'SENT',
    retryCount: 0,
    billingPeriodId: '2026-08',
    relatedDocumentId: 'pay-001',
    sentBy: 'Admin',
    sentAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    isDemo: true,
  }
];

export const smsService = {
  /**
   * Validate and format Bangladeshi Mobile Numbers
   */
  normalizeMobileNumber: (input: string): { isValid: boolean; formatted: string; clean: string } => {
    if (!input) return { isValid: false, formatted: '', clean: '' };
    const clean = input.replace(/[^0-9]/g, '');
    let normalized = clean;

    if (normalized.startsWith('8801') && normalized.length === 13) {
      normalized = '01' + normalized.slice(4);
    } else if (normalized.startsWith('880') && normalized.length === 13) {
      normalized = '0' + normalized.slice(3);
    }

    const isValid = /^01[3-9]\d{8}$/.test(normalized);
    const formatted = isValid 
      ? `${normalized.slice(0, 5)}-${normalized.slice(5)}` 
      : input;

    return {
      isValid,
      formatted,
      clean: normalized,
    };
  },

  /**
   * Calculate SMS parts based on character set (Unicode/Bangla vs ASCII/English)
   */
  calculateSmsParts: (text: string): { characterCount: number; smsCount: number; isUnicode: boolean } => {
    if (!text) return { characterCount: 0, smsCount: 0, isUnicode: false };
    
    // Check if contains non-ASCII (Bangla, etc.)
    const isUnicode = /[^\u0000-\u007F]/.test(text);
    const length = text.length;

    let smsCount = 1;
    if (isUnicode) {
      if (length <= 70) {
        smsCount = 1;
      } else {
        smsCount = Math.ceil(length / 67);
      }
    } else {
      if (length <= 160) {
        smsCount = 1;
      } else {
        smsCount = Math.ceil(length / 153);
      }
    }

    return {
      characterCount: length,
      smsCount,
      isUnicode,
    };
  },

  /**
   * Duplicate Protection Check
   */
  checkDuplicateSms: async (
    memberId?: string,
    flatNumber?: string,
    billingPeriodId?: string,
    templateType?: MessageTemplateType
  ): Promise<{ isDuplicate: boolean; lastSentAt?: string }> => {
    if (!memberId && !flatNumber) return { isDuplicate: false };

    try {
      const logs = await smsService.getCommunicationLogs();
      const settings = await communicationSettingsService.getSettings();
      const windowHours = (settings.duplicateCheckWindowDays || 1) * 24;
      const cutoff = Date.now() - windowHours * 3600 * 1000;

      const duplicate = logs.find(log => {
        if (log.channel !== 'SMS' || log.status !== 'SENT') return false;
        const logTime = new Date(log.sentAt).getTime();
        if (logTime < cutoff) return false;

        const sameMember = memberId && log.recipientMemberId === memberId;
        const sameFlat = flatNumber && log.flatNumber === flatNumber;
        const samePeriod = !billingPeriodId || log.billingPeriodId === billingPeriodId;
        const sameType = !templateType || log.templateType === templateType;

        return (sameMember || sameFlat) && samePeriod && sameType;
      });

      if (duplicate) {
        return { isDuplicate: true, lastSentAt: duplicate.sentAt };
      }
      return { isDuplicate: false };
    } catch (error) {
      console.warn('Error checking duplicate SMS:', error);
      return { isDuplicate: false };
    }
  },

  /**
   * Send single SMS with provider simulation & Firestore logging
   */
  sendSms: async (params: SendSmsParams): Promise<SmsSendResult> => {
    const { isValid, clean } = smsService.normalizeMobileNumber(params.recipientMobile);
    const { smsCount } = smsService.calculateSmsParts(params.message);

    if (!isValid) {
      return {
        success: false,
        logId: '',
        status: 'FAILED',
        smsCount,
        message: params.message,
        errorMessage: 'অকার্যকর মোবাইল নম্বর (Valid 11-digit Bangladeshi number required)',
      };
    }

    if (!params.bypassDuplicateCheck) {
      const dup = await smsService.checkDuplicateSms(
        params.memberId,
        params.flatNumber,
        params.billingPeriodId,
        params.templateType
      );
      if (dup.isDuplicate) {
        return {
          success: false,
          logId: '',
          status: 'FAILED',
          smsCount,
          message: params.message,
          errorMessage: `ডুপ্লিকেট মেসেজ প্রতিরোধ: এই সদস্য/ফ্ল্যাটে ইতোমধ্যে একই বিলিং পিরিয়ডের জন্য SMS পাঠানো হয়েছে (${new Date(dup.lastSentAt!).toLocaleString('bn-BD')})।`,
          isDuplicateWarning: true,
        };
      }
    }

    const logId = `SMS-${Date.now().toString().slice(-6)}`;
    const isSuccess = Math.random() > 0.03; // 97% realistic success simulation
    const status: CommunicationStatus = isSuccess ? 'SENT' : 'FAILED';
    const errorMessage = isSuccess ? undefined : 'SMS Gateway route busy / Temporary network issue';

    const logEntry: Omit<CommunicationLog, 'id'> = {
      logId,
      recipientMemberId: params.memberId || '',
      recipientName: params.recipientName,
      recipientMobile: params.recipientMobile,
      flatNumber: params.flatNumber || '',
      flatId: params.flatId || '',
      channel: 'SMS',
      templateType: params.templateType,
      templateId: params.templateId,
      message: params.message,
      status,
      errorMessage,
      retryCount: 0,
      billingPeriodId: params.billingPeriodId || '',
      relatedDocumentId: params.relatedDocumentId || '',
      sentBy: params.sentBy || 'Admin',
      sentAt: new Date().toISOString(),
      isDemo: params.isDemo ?? true,
    };

    try {
      const docRef = await addDoc(collection(db, COMMUNICATION_LOGS_COLLECTION), logEntry);
      
      // Update balance if sent
      if (status === 'SENT') {
        const settings = await communicationSettingsService.getSettings();
        if (settings.smsBalance >= smsCount) {
          await communicationSettingsService.updateSettings(
            { smsBalance: settings.smsBalance - smsCount },
            params.sentBy,
            params.sentBy
          );
        }
      }

      await auditService.logAction(
        status === 'SENT' ? 'SMS_SENT' : 'SMS_FAILED',
        'SMS',
        `এসএমএস প্রেরণ (${params.recipientName} - ${params.recipientMobile}): ${status}`,
        params.sentBy || 'usr-admin',
        params.sentBy || 'Admin',
        docRef.id,
        'ADMIN',
        params.billingPeriodId
      );

      return {
        success: isSuccess,
        logId: docRef.id,
        status,
        smsCount,
        message: params.message,
        errorMessage,
      };
    } catch (error: any) {
      console.warn('Error saving SMS log to Firestore, saving in-memory:', error);
      const fallbackId = `log-fb-${Date.now()}`;
      sampleCommunicationLogs.unshift({
        id: fallbackId,
        ...logEntry,
      });

      return {
        success: isSuccess,
        logId: fallbackId,
        status,
        smsCount,
        message: params.message,
        errorMessage,
      };
    }
  },

  /**
   * Bulk Send SMS with aggregated metrics
   */
  sendBulkSms: async (
    recipients: Array<{
      memberId?: string;
      recipientName: string;
      recipientMobile: string;
      flatNumber?: string;
      message: string;
    }>,
    meta: {
      templateType?: MessageTemplateType;
      billingPeriodId?: string;
      sentBy?: string;
      isDemo?: boolean;
    }
  ): Promise<{ total: number; sent: number; failed: number; duplicates: number }> => {
    let sent = 0;
    let failed = 0;
    let duplicates = 0;

    for (const r of recipients) {
      const res = await smsService.sendSms({
        recipientMobile: r.recipientMobile,
        recipientName: r.recipientName,
        message: r.message,
        memberId: r.memberId,
        flatNumber: r.flatNumber,
        templateType: meta.templateType,
        billingPeriodId: meta.billingPeriodId,
        sentBy: meta.sentBy,
        isDemo: meta.isDemo,
      });

      if (res.success) {
        sent++;
      } else if (res.isDuplicateWarning) {
        duplicates++;
      } else {
        failed++;
      }
    }

    await auditService.logAction(
      'BULK_SMS_SENT',
      'SMS',
      `বাল্ক এসএমএস প্রেরণ সম্পন্ন: মোট ${recipients.length}টি (সফল: ${sent}, ব্যর্থ: ${failed}, ডুপ্লিকেট বাদ: ${duplicates})`,
      meta.sentBy || 'usr-admin',
      meta.sentBy || 'Admin',
      undefined,
      'ADMIN',
      meta.billingPeriodId
    );

    return { total: recipients.length, sent, failed, duplicates };
  },

  /**
   * Retry failed message
   */
  retryMessage: async (
    log: CommunicationLog, 
    sentBy: string = 'Admin'
  ): Promise<boolean> => {
    const isSuccess = Math.random() > 0.05; // 95% retry success
    const newStatus: CommunicationStatus = isSuccess ? 'SENT' : 'FAILED';
    const newRetryCount = (log.retryCount || 0) + 1;
    const newError = isSuccess ? undefined : 'Retry failed: Network timeout';

    try {
      const docRef = doc(db, COMMUNICATION_LOGS_COLLECTION, log.id);
      await updateDoc(docRef, {
        status: newStatus,
        retryCount: newRetryCount,
        errorMessage: newError || '',
        sentAt: new Date().toISOString(),
      });

      await auditService.logAction(
        'SMS_RETRY',
        'SMS',
        `ব্যর্থ বার্তা পুনরায় প্রেরণ চেষ্টা (${log.recipientName} - ${log.recipientMobile}): ${newStatus}`,
        sentBy,
        sentBy,
        log.id,
        'ADMIN',
        log.billingPeriodId
      );

      return isSuccess;
    } catch (error) {
      console.warn('Error updating retry log in Firestore:', error);
      const found = sampleCommunicationLogs.find(l => l.id === log.id);
      if (found) {
        found.status = newStatus;
        found.retryCount = newRetryCount;
        found.errorMessage = newError;
        found.sentAt = new Date().toISOString();
      }
      return isSuccess;
    }
  },

  /**
   * Get all communication logs
   */
  getCommunicationLogs: async (): Promise<CommunicationLog[]> => {
    try {
      const q = query(
        collection(db, COMMUNICATION_LOGS_COLLECTION),
        orderBy('sentAt', 'desc')
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return sampleCommunicationLogs;
      }
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunicationLog));
    } catch (error) {
      console.warn('Error loading communication logs from Firestore:', error);
      return sampleCommunicationLogs;
    }
  },

  /**
   * Subscribe to live communication logs
   */
  subscribeToCommunicationLogs: (
    callback: (logs: CommunicationLog[]) => void
  ) => {
    try {
      const q = query(
        collection(db, COMMUNICATION_LOGS_COLLECTION),
        orderBy('sentAt', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            callback(sampleCommunicationLogs);
          } else {
            callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunicationLog)));
          }
        },
        (error) => {
          console.warn('Communication logs snapshot listener error:', error);
          callback(sampleCommunicationLogs);
        }
      );
    } catch (error) {
      console.warn('Error setting up communication logs subscription:', error);
      callback(sampleCommunicationLogs);
      return () => {};
    }
  },

  /**
   * Get communication statistics
   */
  getStats: async (): Promise<{
    smsBalance: number;
    smsSentToday: number;
    smsSentThisMonth: number;
    whatsappSent: number;
    failedMessages: number;
    pendingMessages: number;
  }> => {
    const logs = await smsService.getCommunicationLogs();
    const settings = await communicationSettingsService.getSettings();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    const smsSentToday = logs.filter(l => l.channel === 'SMS' && l.status === 'SENT' && l.sentAt.startsWith(todayStr)).length;
    const smsSentThisMonth = logs.filter(l => l.channel === 'SMS' && l.status === 'SENT' && l.sentAt.startsWith(monthStr)).length;
    const whatsappSent = logs.filter(l => l.channel === 'WHATSAPP' && l.status === 'SENT').length;
    const failedMessages = logs.filter(l => l.status === 'FAILED').length;
    const pendingMessages = logs.filter(l => l.status === 'PENDING' || l.status === 'QUEUED').length;

    return {
      smsBalance: settings.smsBalance,
      smsSentToday,
      smsSentThisMonth,
      whatsappSent,
      failedMessages,
      pendingMessages,
    };
  }
};
