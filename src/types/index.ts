export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'MEMBER' | 'VIEWER';

export type UnitType = 'Residential' | 'Commercial' | 'Office' | 'Duplex' | 'Other';

export type UnitStatus = 'ACTIVE' | 'INACTIVE' | 'OCCUPIED_OWNER' | 'OCCUPIED_TENANT' | 'VACANT';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE';

export type BillStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export type ExpenseCategory = 
  | 'ELECTRICITY' // বিদ্যুৎ বিল
  | 'GUARD_SALARY' // দারোয়ানের বেতন
  | 'LIFT_SERVICE' // লিফট সার্ভিস
  | 'GARBAGE_CLEANING' // ময়লা পরিষ্কার
  | 'STAIR_CLEANING' // সিঁড়ি পরিষ্কার
  | 'GENERATOR_DIESEL' // জেনারেটর ডিজেল
  | 'DIESEL_TRANSPORT' // ডিজেল আনার ভাড়া
  | 'MAINTENANCE' // মেরামত ও রক্ষণাবেক্ষণ
  | 'OTHER'; // অন্যান্য

export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'CHEQUE';

export interface VoucherFileMetadata {
  id?: string;
  fileName: string;
  fileSize: number; // bytes
  fileType: string;
  previewUrl?: string;
  storagePath?: string;
  downloadUrl?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface VoucherAttachment {
  id: string;
  fileName: string;
  fileSize: number; // bytes
  fileType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | string;
  previewUrl: string; // Blob or sample mock url
  storagePath?: string; // e.g. /building-expenses/2025/06/expense-001/voucher.jpg
  downloadUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
  isVerified?: boolean;
}

export interface ExpenseItem {
  id: string;
  title: string;
  category: ExpenseCategory;
  categoryNameBangla: string;
  amount: number;
  date: string; // YYYY-MM-DD
  month: string; // e.g. "2026-08" or legacy "2025-06"
  monthNameBangla: string; // e.g. "আগস্ট ২০২৬"
  billingYear?: number; // 2026-2035
  billingMonth?: number; // 1-12
  billingPeriodId?: string; // e.g. "2026-08"
  description: string;
  paymentMethod: PaymentMethod;
  voucherNumber?: string;
  voucher?: VoucherAttachment | null;
  voucherFiles?: VoucherFileMetadata[];
  additionalAttachment?: VoucherAttachment | null;
  comments?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  isDemo?: boolean; // Demo transactional data marker
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deleteReason?: string;
}

export interface MonthlyBill {
  id: string;
  billId?: string;
  month: string; // e.g. "2026-08"
  monthBangla?: string;
  monthNameBangla?: string;
  year?: string;
  billingYear?: number; // 2026-2035
  billingMonth?: number; // 1-12
  billingPeriodId?: string; // e.g. "2026-08"
  totalExpense: number;
  totalFlats: number;
  perFlatAmount: number;
  adjustment?: number;
  customAdjustment?: number;
  finalPerFlatAmount?: number;
  status: BillStatus;
  billStatus?: BillStatus;
  expenseCount?: number;
  missingVouchersCount?: number;
  publishedAt?: string;
  isApproved?: boolean;
  generatedDate?: string;
  publishedDate?: string;
  isMasterData?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isDemo?: boolean;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deleteReason?: string;
}

export type MonthlyExpenseSummary = MonthlyBill;

export interface OwnershipHistoryRecord {
  id: string;
  previousMemberId: string;
  previousOwnerName: string;
  newMemberId: string;
  newOwnerName: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface FlatUnit {
  id: string;
  unitNumber: string; // e.g. "6-B", "2-A"
  floor: number; // e.g. 6
  blockSection?: string; // Block A / B
  areaSqFt?: number; // Sq Ft area
  unitType: UnitType;
  memberId: string; // e.g. "JCT-006"
  ownerName: string; // e.g. "SM Khalilur Rahman Properties"
  ownerPhone: string;
  monthlyBaseBill: number;
  currentPaid: number;
  currentDue: number;
  status: UnitStatus;
  paymentStatus: PaymentStatus;
  lastPaymentDate?: string;
  notes?: string;
  isMasterData?: boolean; // Master data flag: Protected from demo clear
  isDemo?: boolean;
  isDeleted?: boolean;
  ownershipHistory?: OwnershipHistoryRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Member {
  id: string;
  memberId: string; // e.g. "JCT-006"
  name: string;
  banglaName?: string;
  memberType: 'INDIVIDUAL' | 'COMPANY' | 'PROPERTY_OWNER' | 'COMMERCIAL' | 'FLAT_OWNER';
  memberTypeBangla: string;
  phone: string;
  email?: string;
  emergencyContact?: string;
  address?: string;
  flatUnitNumbers: string[]; // e.g. ["6-B", "7-B", "8-B"]
  flatIds?: string[];
  totalUnits: number;
  totalBill?: number;
  totalPaid?: number;
  totalDue?: number;
  status: 'ACTIVE' | 'INACTIVE';
  joinedDate?: string;
  avatarUrl?: string;
  isMasterData?: boolean; // Master data flag: Protected from demo clear
  isDemo?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentMethodType = 'Cash' | 'Bank' | 'Other' | 'CASH' | 'BANK_TRANSFER' | 'BKASH' | 'NAGAD' | 'CHEQUE' | string;

export interface PaymentRecord {
  id: string;
  paymentId?: string;
  receiptId?: string;
  receiptNumber: string; // e.g. "JCT-2026-000001"
  memberId: string;
  memberName: string;
  flatUnitNumber: string;
  flatId?: string;
  billId?: string;
  month?: string; // "2026-08"
  monthBangla?: string;
  billingYear?: number;
  billingMonth?: number;
  billingPeriodId?: string;
  billAmount: number;
  previousDue?: number;
  paidAmount: number;
  currentDue?: number;
  dueAmount: number; // for backward compatibility, equal to currentDue
  paymentMethod: PaymentMethodType;
  transactionRef?: string;
  paymentDate: string;
  collectedBy: string;
  remarks?: string;
  notes?: string;
  status: 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE';
  createdBy?: string;
  isDemo?: boolean; // Demo transaction flag
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deleteReason?: string;
}

export interface ReceiptRecord {
  id: string;
  receiptId?: string;
  receiptNumber: string;
  paymentId: string;
  memberId: string;
  memberName: string;
  flatUnitNumber: string;
  flatId?: string;
  billingYear?: number;
  billingMonth?: number;
  billingPeriodId?: string;
  billAmount?: number;
  previousDue?: number;
  paidAmount?: number;
  currentDue?: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethodType;
  transactionRef?: string;
  remarks?: string;
  collectedBy?: string;
  createdBy?: string;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deleteReason?: string;
}

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Notice {
  id: string;
  noticeId?: string;
  title: string;
  content: string;
  publishedDate: string;
  priority: PriorityLevel;
  targetAudience: 'ALL' | 'MEMBERS_ONLY' | 'MANAGEMENT_ONLY' | 'MANAGEMENT';
  author: string;
  status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  isPinned?: boolean;
  isDemo?: boolean; // Demo notice flag
  createdAt?: string;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deleteReason?: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  date?: string;
  priority: 'URGENT' | 'NORMAL' | 'INFORMATIONAL';
  priorityBangla?: string;
  content: string;
  author: string;
  publishedDate: string;
  targetAudience: 'ALL' | 'MEMBERS_ONLY' | 'MANAGEMENT';
  attachmentName?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  isDemo?: boolean;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deleteReason?: string;
}

export interface BuildingSettings {
  buildingNameBangla: string;
  buildingNameEnglish: string;
  addressBangla: string;
  addressEnglish: string;
  buildingCode?: string;
  contactPhone: string;
  contactEmail: string;
  emergencyContact?: string;
  totalFloors: number;
  totalUnits: number;
  logoUrl: string;
  billingDueDayOfMonth: number;
  lateFeeAmount: number;
  enableLateFee: boolean;
  voucherSettings: {
    allowImageUpload: boolean;
    allowPdfUpload: boolean;
    maxFileSizeBytes: number;
    memberVoucherVisibility: boolean;
    requiredVoucherForExpense: boolean;
    enableImageCompression: boolean;
  };
  smsSettings: {
    providerName: string;
    senderId: string;
    apiKeyConfigured: boolean;
    smsBalance: number;
    autoSendOnBillPublish: boolean;
    autoSendOnPaymentReceived: boolean;
  };
  whatsappSettings: {
    businessNumber: string;
    configured: boolean;
    autoGenerateBillMessage: boolean;
  };
}

export interface BuildingInfoSettings {
  buildingNameBangla: string;
  buildingNameEnglish: string;
  addressBangla: string;
  addressEnglish: string;
  buildingCode: string;
  totalFloors: number;
  totalFlats: number;
  managementOfficeMobile: string;
  managementOfficeEmail: string;
  emergencyContact: string;
  logoUrl: string;
}

export interface SystemBillingSettings {
  startYear: number;
  endYear: number;
  defaultMonthlyBill: number;
  billDueDate: number;
  currency: string;
  roundingMethod: 'EXACT_DECIMAL' | 'NEAREST_INTEGER';
}

export interface ReceiptConfigSettings {
  receiptPrefix: string;
  receiptFormat: string;
  startingNumber: number;
  receiptHeader: string;
  footerText: string;
}

export interface OfficeConfigSettings {
  officeName: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  officeHours: string;
  emergencyContact: string;
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  banglaName: string;
  email: string;
  memberId?: string;
  role: UserRole;
  roleBangla: string;
  phone: string;
  mobile?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  flatUnits?: string[];
  avatar?: string;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

export type AuditActionType = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'PUBLISH' 
  | 'CLOSE' 
  | 'REOPEN' 
  | 'RESTORE' 
  | 'PAYMENT' 
  | 'RECEIPT' 
  | 'UPLOAD' 
  | 'REPLACE' 
  | 'REMOVE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'DEMO_RESET' 
  | 'SEED'
  | 'SMS_SENT'
  | 'SMS_FAILED'
  | 'SMS_RETRY'
  | 'WHATSAPP_SENT'
  | 'WHATSAPP_FAILED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_READ'
  | 'BULK_SMS_SENT'
  | 'SMS_SETTINGS_UPDATED'
  | 'WHATSAPP_SETTINGS_UPDATED';

export type AuditModuleType = 
  | 'EXPENSES' 
  | 'BILLS' 
  | 'PAYMENTS' 
  | 'RECEIPTS' 
  | 'MEMBERS' 
  | 'FLATS' 
  | 'NOTICES' 
  | 'AUTH' 
  | 'SETTINGS' 
  | 'USERS' 
  | 'ARCHIVE' 
  | 'OPENING_BALANCE'
  | 'COMMUNICATION'
  | 'SMS'
  | 'WHATSAPP'
  | 'NOTIFICATIONS';

export interface AuditLog {
  id: string;
  logId?: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  action: AuditActionType;
  module: AuditModuleType;
  documentId?: string;
  recordId?: string;
  billingPeriodId?: string;
  description: string;
  oldData?: any;
  newData?: any;
  timestamp: string;
}

export interface OpeningBalance {
  id: string;
  billingPeriodId: string; // e.g. "2026-08"
  openingBalance: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FinancialMismatch {
  type: 'PAYMENT_SUM_MISMATCH' | 'MISSING_VOUCHER' | 'BILL_TOTAL_MISMATCH' | 'CLOSING_BALANCE_MISMATCH';
  title: string;
  expected: string;
  actual: string;
  difference: string;
  severity: 'WARNING' | 'ERROR';
  description: string;
}

export interface DemoDataSummary {
  masterFlatsCount: number;
  masterMembersCount: number;
  demoExpensesCount: number;
  demoBillsCount: number;
  demoPaymentsCount: number;
  demoReceiptsCount: number;
  demoNoticesCount: number;
  demoVouchersCount: number;
  realExpensesCount: number;
  realBillsCount: number;
  realPaymentsCount: number;
  realReceiptsCount: number;
  realNoticesCount: number;
}

// ==========================================
// PHASE 08: COMMUNICATION & NOTIFICATION TYPES
// ==========================================

export type CommunicationChannel = 'SMS' | 'WHATSAPP' | 'NOTIFICATION';

export type CommunicationStatus = 'SENT' | 'FAILED' | 'PENDING' | 'QUEUED';

export type MessageTemplateType = 
  | 'PAYMENT_CONFIRMATION' 
  | 'BILL_PUBLISHED' 
  | 'DUE_REMINDER' 
  | 'OVERDUE_REMINDER' 
  | 'NOTICE' 
  | 'GENERAL_ANNOUNCEMENT';

export type RecipientTargetType = 
  | 'SINGLE_MEMBER' 
  | 'SINGLE_FLAT' 
  | 'MULTIPLE_MEMBERS' 
  | 'DUE_MEMBERS' 
  | 'ALL_ACTIVE' 
  | 'CUSTOM_MOBILE';

export interface CommunicationLog {
  id: string;
  logId?: string;
  recipientMemberId?: string;
  recipientName: string;
  recipientMobile: string;
  flatNumber?: string;
  flatId?: string;
  channel: CommunicationChannel;
  templateType?: MessageTemplateType;
  templateId?: string;
  message: string;
  status: CommunicationStatus;
  errorMessage?: string;
  retryCount: number;
  billingPeriodId?: string;
  relatedDocumentId?: string;
  sentBy: string;
  sentAt: string;
  isDemo?: boolean;
}

export type NotificationType = 
  | 'BILL_PUBLISHED' 
  | 'PAYMENT_RECEIVED' 
  | 'DUE_REMINDER' 
  | 'OVERDUE' 
  | 'NOTICE' 
  | 'GENERAL';

export interface AppNotification {
  id: string;
  notificationId?: string;
  recipientUserId?: string;
  recipientMemberId?: string;
  title: string;
  message: string;
  type: NotificationType;
  billingPeriodId?: string;
  relatedDocumentId?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export interface MessageTemplate {
  id: string;
  type: MessageTemplateType;
  title: string;
  titleBangla: string;
  body: string;
  channel: CommunicationChannel | 'ALL';
  variables: string[];
  isSystemDefault?: boolean;
  isActive: boolean;
  updatedAt?: string;
}

export interface CommunicationSettings {
  smsEnabled: boolean;
  smsMaskingName: string;
  smsProviderName: string;
  smsBalance: number;
  autoSendPaymentSms: boolean;
  autoSendBillPublishedSms: boolean;
  autoSendDueReminderSms: boolean;
  autoSendNoticeSms: boolean;
  whatsappEnabled: boolean;
  whatsappBusinessNumber: string;
  autoSendPaymentWhatsApp: boolean;
  autoSendBillPublishedWhatsApp: boolean;
  autoSendDueReminderWhatsApp: boolean;
  autoSendNoticeWhatsApp: boolean;
  inAppNotificationsEnabled: boolean;
  notifyBillPublished: boolean;
  notifyPaymentReceived: boolean;
  notifyDueReminder: boolean;
  notifyNotice: boolean;
  notifyGeneralAnnouncement: boolean;
  duplicateCheckWindowDays: number;
}

