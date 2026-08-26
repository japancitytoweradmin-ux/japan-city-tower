import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageTemplate, MessageTemplateType } from '../types';

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl-payment-conf',
    type: 'PAYMENT_CONFIRMATION',
    title: 'Payment Confirmation',
    titleBangla: 'টাকা জমা ও পেমেন্ট রসিদ নিশ্চিতকরণ',
    channel: 'ALL',
    variables: ['{{memberName}}', '{{flatNumber}}', '{{billingMonth}}', '{{billingYear}}', '{{paidAmount}}', '{{receiptNumber}}', '{{dueAmount}}', '{{buildingName}}'],
    body: 'আসসালামু আলাইকুম {{memberName}}। {{buildingName}}-এ আপনার ফ্ল্যাট {{flatNumber}}-এর {{billingMonth}} {{billingYear}} বিল বাবদ ৳{{paidAmount}}/- পরিশোধ সফলভাবে গৃহীত হয়েছে। মানি রসিদ নং: {{receiptNumber}}। অবশিষ্ট বকেয়া: ৳{{dueAmount}}/-। ধন্যবাদ।',
    isSystemDefault: true,
    isActive: true,
  },
  {
    id: 'tmpl-bill-published',
    type: 'BILL_PUBLISHED',
    title: 'Monthly Bill Published',
    titleBangla: 'মাসিক কমন বিল ধার্য ও প্রকাশ নোটিশ',
    channel: 'ALL',
    variables: ['{{memberName}}', '{{flatNumber}}', '{{billingMonth}}', '{{billingYear}}', '{{billAmount}}', '{{buildingName}}'],
    body: 'আসসালামু আলাইকুম {{memberName}}। {{buildingName}}-এর {{billingMonth}} {{billingYear}} মাসের কমন সার্ভিস বিল ৳{{billAmount}}/- ধার্য করা হয়েছে (ফ্ল্যাট: {{flatNumber}})। অনুগ্রহ করে চলতি মাসের ১০ তারিখের মধ্যে পরিশোধ করুন।',
    isSystemDefault: true,
    isActive: true,
  },
  {
    id: 'tmpl-due-reminder',
    type: 'DUE_REMINDER',
    title: 'Due Bill Reminder',
    titleBangla: 'বকেয়া বিল পরিশোধ তাগিদ',
    channel: 'ALL',
    variables: ['{{memberName}}', '{{flatNumber}}', '{{billingMonth}}', '{{billingYear}}', '{{dueAmount}}', '{{buildingName}}'],
    body: 'জরুরি তাগিদ: জনাব {{memberName}}, {{buildingName}}-এর ফ্ল্যাট {{flatNumber}}-এর {{billingMonth}} {{billingYear}} পর্যন্ত মোট বকেয়া ৳{{dueAmount}}/- রয়েছে। ভবন ব্যবস্থাপনায় নিরবচ্ছিন্ন সেবা বজায় রাখতে দ্রুত পরিশোধের বিনীত অনুরোধ করা হচ্ছে।',
    isSystemDefault: true,
    isActive: true,
  },
  {
    id: 'tmpl-overdue-reminder',
    type: 'OVERDUE_REMINDER',
    title: 'Overdue Notice',
    titleBangla: 'দীর্ঘমেয়াদী বকেয়া নোটিশ',
    channel: 'ALL',
    variables: ['{{memberName}}', '{{flatNumber}}', '{{dueAmount}}', '{{buildingName}}'],
    body: 'জরুরি নোটিশ: জনাব {{memberName}}, {{buildingName}}-এ ফ্ল্যাট {{flatNumber}}-এর দীর্ঘমেয়াদী বকেয়া ৳{{dueAmount}}/- দ্রুত পরিশোধ করুন। বিস্তারিত জানতে ম্যানেজমেন্ট কমিটির সাথে যোগাযোগ করুন।',
    isSystemDefault: true,
    isActive: true,
  },
  {
    id: 'tmpl-notice',
    type: 'NOTICE',
    title: 'Building Notice Alert',
    titleBangla: 'ভবন জরুরি নোটিশ ও বিজ্ঞপ্তি',
    channel: 'ALL',
    variables: ['{{memberName}}', '{{noticeTitle}}', '{{buildingName}}'],
    body: 'জরুরি নোটিশ: {{buildingName}} এর সকল সদস্য ও বাসিন্দাদের অবগতির জন্য জানানো যাচ্ছে যে, "{{noticeTitle}}"। বিস্তারিত পোর্টাল নোটিশ বোর্ডে দেখুন।',
    isSystemDefault: true,
    isActive: true,
  },
  {
    id: 'tmpl-general',
    type: 'GENERAL_ANNOUNCEMENT',
    title: 'General Announcement',
    titleBangla: 'সাধারণ ঘোষণা ও বার্তা',
    channel: 'ALL',
    variables: ['{{memberName}}', '{{buildingName}}'],
    body: 'আসসালামু আলাইকুম {{memberName}}। {{buildingName}} ব্যবস্থাপনা কমিটির পক্ষ থেকে শুভেচ্ছা।',
    isSystemDefault: true,
    isActive: true,
  },
];

export const templateService = {
  replaceVariables: (templateBody: string, data: Record<string, string | number | undefined>): string => {
    let result = templateBody;
    const defaultBuilding = 'জাপান সিটি টাওয়ার';
    const mergedData: Record<string, string | number> = {
      buildingName: defaultBuilding,
      ...Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
      ),
    };

    for (const [key, value] of Object.entries(mergedData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  },

  getAllTemplates: async (): Promise<MessageTemplate[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'messageTemplates'));
      if (snapshot.empty) {
        return DEFAULT_MESSAGE_TEMPLATES;
      }
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
    } catch (error) {
      console.warn('Using default message templates fallback:', error);
      return DEFAULT_MESSAGE_TEMPLATES;
    }
  },

  getTemplateByType: async (type: MessageTemplateType): Promise<MessageTemplate> => {
    const templates = await templateService.getAllTemplates();
    const found = templates.find(t => t.type === type && t.isActive);
    if (found) return found;
    return DEFAULT_MESSAGE_TEMPLATES.find(t => t.type === type) || DEFAULT_MESSAGE_TEMPLATES[0];
  },

  saveTemplate: async (template: MessageTemplate): Promise<void> => {
    try {
      const docRef = doc(db, 'messageTemplates', template.id);
      await setDoc(docRef, {
        ...template,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.warn('Error saving template to Firestore:', error);
    }
  }
};
