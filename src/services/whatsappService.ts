import { 
  collection, 
  addDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  CommunicationLog, 
  CommunicationStatus, 
  MessageTemplateType 
} from '../types';
import { auditService } from './auditService';
import { smsService } from './smsService';

const COMMUNICATION_LOGS_COLLECTION = 'communicationLogs';

export interface WhatsAppSendParams {
  recipientMobile: string;
  recipientName: string;
  message: string;
  memberId?: string;
  flatNumber?: string;
  templateType?: MessageTemplateType;
  billingPeriodId?: string;
  relatedDocumentId?: string;
  sentBy?: string;
  isDemo?: boolean;
}

export const whatsappService = {
  /**
   * Format phone number for WhatsApp wa.me link (+880...)
   */
  formatWhatsAppUrl: (mobile: string, message: string): { url: string; validPhone: string } => {
    const clean = mobile.replace(/[^0-9]/g, '');
    let fullPhone = clean;
    if (fullPhone.startsWith('01')) {
      fullPhone = `88${fullPhone}`;
    } else if (fullPhone.startsWith('1')) {
      fullPhone = `880${fullPhone}`;
    } else if (!fullPhone.startsWith('880')) {
      fullPhone = `880${fullPhone}`;
    }

    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    return { url, validPhone: fullPhone };
  },

  /**
   * Send / Open WhatsApp Message and log to Firestore
   */
  sendWhatsAppMessage: async (params: WhatsAppSendParams): Promise<{ success: boolean; url: string; logId: string }> => {
    const { url, validPhone } = whatsappService.formatWhatsAppUrl(params.recipientMobile, params.message);
    const logId = `WA-${Date.now().toString().slice(-6)}`;

    const logEntry: Omit<CommunicationLog, 'id'> = {
      logId,
      recipientMemberId: params.memberId || '',
      recipientName: params.recipientName,
      recipientMobile: params.recipientMobile,
      flatNumber: params.flatNumber || '',
      channel: 'WHATSAPP',
      templateType: params.templateType,
      message: params.message,
      status: 'SENT',
      retryCount: 0,
      billingPeriodId: params.billingPeriodId || '',
      relatedDocumentId: params.relatedDocumentId || '',
      sentBy: params.sentBy || 'Admin',
      sentAt: new Date().toISOString(),
      isDemo: params.isDemo ?? true,
    };

    try {
      const docRef = await addDoc(collection(db, COMMUNICATION_LOGS_COLLECTION), logEntry);
      
      await auditService.logAction(
        'WHATSAPP_SENT',
        'WHATSAPP',
        `হোয়াটসঅ্যাপ বার্তা প্রেরণ (${params.recipientName} - ${params.recipientMobile})`,
        params.sentBy || 'usr-admin',
        params.sentBy || 'Admin',
        docRef.id,
        'ADMIN',
        params.billingPeriodId
      );

      return { success: true, url, logId: docRef.id };
    } catch (error) {
      console.warn('Error saving WhatsApp log to Firestore:', error);
      return { success: true, url, logId };
    }
  },

  /**
   * Helper to format a rich payment receipt WhatsApp text
   */
  generateReceiptMessage: (receipt: {
    receiptNumber: string;
    memberName: string;
    flatNumber: string;
    monthNameBangla?: string;
    billingPeriodId?: string;
    paidAmount: number;
    paymentMethod: string;
    currentDue: number;
    paymentDate: string;
  }): string => {
    return `আসসালামু আলাইকুম ${receipt.memberName}।\n\n*জাপান সিটি টাওয়ার – অফিসিয়াল মানি রসিদ*\n===================================\nরসিদ নং: *${receipt.receiptNumber}*\nফ্ল্যাট / ইউনিট: *${receipt.flatNumber}*\nবিলিং মাস: *${receipt.monthNameBangla || receipt.billingPeriodId}*\nপরিশোধের পরিমাণ: *৳${receipt.paidAmount.toLocaleString('bn-BD')}/-*\nপরিশোধের মাধ্যম: *${receipt.paymentMethod}*\nতারিখ: *${receipt.paymentDate}*\nঅবশিষ্ট বকেয়া: *৳${receipt.currentDue.toLocaleString('bn-BD')}/-*\n\nধন্যবাদান্তে,\nব্যবস্থাপনা কমিটি, জাপান সিটি টাওয়ার।`;
  }
};
