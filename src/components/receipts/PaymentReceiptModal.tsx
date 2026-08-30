import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  MessageSquare, 
  Send, 
  Building2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { PaymentRecord, BuildingInfoSettings, Member, FlatUnit } from '../../types';
import { formatTaka } from '../../utils/formatters';
import { useToast } from '../common/Toast';
import { useLanguage } from '../../i18n/LanguageContext';
import { whatsappService } from '../../services/whatsappService';
import { smsService } from '../../services/smsService';
import { templateService } from '../../services/templateService';
import { buildingSettingsService, DEFAULT_BUILDING_INFO } from '../../services/buildingSettingsService';
import { memberService } from '../../services/memberService';
import { flatService } from '../../services/flatService';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
}) => {
  const { showToast } = useToast();
  const { language } = useLanguage();
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfoSettings>(DEFAULT_BUILDING_INFO);
  const [members, setMembers] = useState<Member[]>([]);
  const [flats, setFlats] = useState<FlatUnit[]>([]);

  useEffect(() => {
    const unsub = buildingSettingsService.subscribeToBuildingInfo((info) => {
      setBuildingInfo(info);
    });
    const unsubMem = memberService.subscribeToMembers((mList) => {
      setMembers(mList);
    });
    const unsubFlat = flatService.subscribeToFlats((fList) => {
      setFlats(fList);
    });
    return () => {
      unsub();
      unsubMem();
      unsubFlat();
    };
  }, []);

  if (!payment) return null;

  const isBn = language === 'bn';

  // Resolve recipient phone number
  const resolveRecipientPhone = (): string => {
    // 1. Direct phone on payment if available
    const directPhone = (payment as any).memberPhone || (payment as any).phone;
    if (directPhone && directPhone.trim().length > 5) {
      return directPhone.trim();
    }
    // 2. Lookup in members list by memberId
    if (payment.memberId) {
      const matchMember = members.find(m => m.memberId === payment.memberId || m.id === payment.memberId);
      if (matchMember && matchMember.phone) {
        return matchMember.phone.trim();
      }
    }
    // 3. Lookup in flats list by unitNumber
    if (payment.flatUnitNumber) {
      const matchFlat = flats.find(f => f.unitNumber === payment.flatUnitNumber);
      if (matchFlat && matchFlat.ownerPhone) {
        return matchFlat.ownerPhone.trim();
      }
    }
    return '';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    showToast(
      isBn 
        ? `রসিদ PDF প্রস্তুত হচ্ছে (রসিদ নং: ${payment.receiptNumber})` 
        : `Preparing Receipt PDF (${payment.receiptNumber})`, 
      'info'
    );
    window.print();
  };

  const handleWhatsAppShare = async () => {
    const phone = resolveRecipientPhone();
    if (!phone) {
      showToast(
        isBn 
          ? `সদস্য ${payment.memberName}-এর কোনো মোবাইল নম্বর পাওয়া যায়নি। সদস্য প্রোফাইলে নম্বর যোগ করুন।` 
          : `No phone number found for ${payment.memberName}. Please update member profile.`,
        'error'
      );
      return;
    }

    const message = whatsappService.generateReceiptMessage({
      receiptNumber: payment.receiptNumber,
      memberName: payment.memberName,
      flatNumber: payment.flatUnitNumber,
      monthNameBangla: payment.monthBangla,
      billingPeriodId: payment.billingPeriodId || payment.month,
      paidAmount: paidAmount,
      paymentMethod: payment.paymentMethod || 'Cash',
      currentDue: currentDue,
      paymentDate: payment.paymentDate,
    });

    const { url } = await whatsappService.sendWhatsAppMessage({
      recipientMobile: phone,
      recipientName: payment.memberName,
      message,
      memberId: payment.memberId,
      flatNumber: payment.flatUnitNumber,
      templateType: 'PAYMENT_CONFIRMATION',
      billingPeriodId: payment.billingPeriodId || payment.month,
      relatedDocumentId: payment.id,
      sentBy: 'Admin',
    });

    window.open(url, '_blank');
    showToast(
      isBn 
        ? `${payment.memberName} (${phone})-এর WhatsApp চ্যাটে মানি রসিদ পাঠানো হয়েছে` 
        : `Money receipt shared to WhatsApp for ${payment.memberName} (${phone})`, 
      'success'
    );
  };

  const handleSmsShare = async () => {
    const phone = resolveRecipientPhone();
    if (!phone) {
      showToast(
        isBn 
          ? `সদস্য ${payment.memberName}-এর কোনো মোবাইল নম্বর পাওয়া যায়নি। সদস্য প্রোফাইলে নম্বর যোগ করুন।` 
          : `No phone number found for ${payment.memberName}. Please update member profile.`,
        'error'
      );
      return;
    }

    const tmpl = await templateService.getTemplateByType('PAYMENT_CONFIRMATION');
    const message = templateService.replaceVariables(tmpl.body, {
      memberName: payment.memberName,
      flatNumber: payment.flatUnitNumber,
      billingMonth: payment.monthBangla || payment.month,
      billingYear: String(payment.billingYear || 2026),
      paidAmount: paidAmount.toLocaleString('bn-BD'),
      receiptNumber: payment.receiptNumber,
      dueAmount: currentDue.toLocaleString('bn-BD'),
    });

    const result = await smsService.sendSms({
      recipientMobile: phone,
      recipientName: payment.memberName,
      message,
      memberId: payment.memberId,
      flatNumber: payment.flatUnitNumber,
      templateType: 'PAYMENT_CONFIRMATION',
      billingPeriodId: payment.billingPeriodId || payment.month,
      relatedDocumentId: payment.id,
      sentBy: 'Admin',
      bypassDuplicateCheck: true,
    });

    if (result.success) {
      showToast(
        isBn 
          ? `মানি রসিদ SMS সফলভাবে প্রেরিত হয়েছে (${payment.memberName} - ${phone})` 
          : `Money receipt SMS sent successfully to ${payment.memberName} (${phone})`, 
        'success'
      );
    } else {
      showToast(result.errorMessage || 'SMS sending failed', 'error');
    }
  };

  const billAmount = payment.billAmount ?? 1997;
  const previousDue = payment.previousDue ?? 0;
  const totalPayable = billAmount + previousDue;
  const paidAmount = payment.paidAmount ?? 0;
  const currentDue = payment.currentDue ?? payment.dueAmount ?? Math.max(0, totalPayable - paidAmount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? "অফিসিয়াল মানি রসিদ" : "Official Money Receipt"}
      subtitle={`${isBn ? 'রসিদ নং' : 'Receipt No'}: ${payment.receiptNumber}`}
      maxWidth="xl"
    >
      <div className="space-y-5 font-bengali">
        {/* Printable Receipt Card */}
        <div id="printable-receipt" className="p-6 bg-white border-2 border-slate-300 rounded-2xl shadow-xs space-y-5 relative overflow-hidden text-slate-900">
          
          {/* Status Watermark Badge */}
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center pointer-events-none">
            <span className={`text-2xl font-black rotate-12 uppercase ${currentDue === 0 ? 'text-emerald-700/30' : 'text-amber-700/30'}`}>
              {currentDue === 0 ? (isBn ? 'পরিশোধিত' : 'PAID') : (isBn ? 'আংশিক' : 'PARTIAL')}
            </span>
          </div>

          {/* Building Header */}
          <div className="text-center border-b pb-4 border-slate-200">
            <div className="flex items-center justify-center gap-2 mb-1">
              {buildingInfo.logoUrl ? (
                <img 
                  src={buildingInfo.logoUrl} 
                  alt="Logo" 
                  className="w-8 h-8 object-contain rounded-lg border border-slate-200 p-0.5" 
                />
              ) : (
                <div className="p-2 bg-slate-900 text-amber-400 rounded-xl shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {isBn ? (buildingInfo.buildingNameBangla || 'জাপান সিটি টাওয়ার') : (buildingInfo.buildingNameEnglish || 'Japan City Tower')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {isBn 
                ? `${buildingInfo.buildingNameBangla || 'জাপান সিটি টাওয়ার'} – ফ্ল্যাট মালিক ও পরিচালনা কমিটি` 
                : `${buildingInfo.buildingNameEnglish || 'Japan City Tower'} – Flat Owners & Management Committee`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBn 
                ? (buildingInfo.addressBangla || buildingInfo.addressEnglish || 'প্লট নং ২৪/বি, রিং রোড, শ্যামলী, ঢাকা-১২০৭') 
                : (buildingInfo.addressEnglish || buildingInfo.addressBangla || 'Plot # 24/B, Ring Road, Shyamoli, Dhaka-1207')}
            </p>
            <div className="inline-block mt-3 px-4 py-1 bg-slate-900 text-amber-300 text-xs font-extrabold rounded-full tracking-wider uppercase">
              {isBn ? 'মানি রসিদ / MONEY RECEIPT' : 'MONEY RECEIPT'}
            </div>
          </div>

          {/* Receipt Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 font-medium">{isBn ? 'রসিদ নম্বর:' : 'Receipt No:'}</span>
              <p className="font-extrabold text-slate-900 font-mono text-sm">{payment.receiptNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium">{isBn ? 'পরিশোধের তারিখ:' : 'Payment Date:'}</span>
              <p className="font-bold text-slate-900 text-sm">{payment.paymentDate}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">{isBn ? 'সদস্যের নাম:' : 'Member Name:'}</span>
              <p className="font-bold text-slate-900 text-sm">{payment.memberName}</p>
              <span className="text-slate-500 font-mono text-[11px]">{isBn ? 'আইডি' : 'ID'}: {payment.memberId}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium">{isBn ? 'ফ্ল্যাট / ইউনিট:' : 'Flat / Unit:'}</span>
              <p className="font-bold text-slate-900 text-sm">{payment.flatUnitNumber}</p>
              <span className="text-slate-500 text-[11px]">{isBn ? 'বিল পিরিয়ড' : 'Period'}: {payment.billingPeriodId || payment.month}</span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">{isBn ? 'বিবরণ' : 'Description'}</th>
                  <th className="p-3 text-right">{isBn ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="p-3 text-slate-800">
                    {isBn 
                      ? `মাসিক কমন বিল (${payment.billingPeriodId || payment.month}) - ফ্ল্যাট ${payment.flatUnitNumber}` 
                      : `Monthly Common Service Bill (${payment.billingPeriodId || payment.month}) - Unit ${payment.flatUnitNumber}`}
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-800">
                    {formatTaka(billAmount)}
                  </td>
                </tr>
                {previousDue > 0 && (
                  <tr className="bg-amber-50/50">
                    <td className="p-3 text-amber-900 font-medium">
                      {isBn ? 'পূর্বের বকেয়া (Previous Due)' : 'Previous Accumulated Due'}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-800">
                      {formatTaka(previousDue)}
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-3 text-slate-900">{isBn ? 'মোট দাবিকৃত পাওনা (Total Demand)' : 'Total Demand Payable'}</td>
                  <td className="p-3 text-right text-slate-900">{formatTaka(totalPayable)}</td>
                </tr>
                <tr className="bg-emerald-50 text-emerald-950 font-extrabold text-sm border-t border-emerald-200">
                  <td className="p-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isBn ? 'আদায়কৃত অর্থ (Received Amount)' : 'Amount Received'}</span>
                  </td>
                  <td className="p-3 text-right text-emerald-700">
                    {formatTaka(paidAmount)}
                  </td>
                </tr>
                <tr className={`font-bold ${currentDue > 0 ? 'bg-rose-50 text-rose-900' : 'bg-slate-50 text-slate-700'}`}>
                  <td className="p-3">
                    {isBn ? 'অবশিষ্ট বকেয়া (Current Remaining Due)' : 'Current Remaining Due'}
                  </td>
                  <td className="p-3 text-right font-extrabold text-sm">
                    {formatTaka(currentDue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Method & Signatures */}
          <div className="grid grid-cols-2 gap-4 items-end pt-3 text-xs">
            <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-slate-600">
                {isBn ? 'পরিশোধের মাধ্যম:' : 'Payment Method:'} <span className="font-bold text-slate-900">{payment.paymentMethod}</span>
              </p>
              {payment.transactionRef && (
                <p className="text-slate-600 font-mono text-[11px]">
                  {isBn ? 'রেফারেন্স:' : 'Ref:'} {payment.transactionRef}
                </p>
              )}
              {payment.remarks && (
                <p className="text-slate-600 italic text-[11px]">
                  {isBn ? 'মন্তব্য:' : 'Remarks:'} {payment.remarks}
                </p>
              )}
              <p className="text-slate-600 pt-1">
                {isBn ? 'আদায়কারী:' : 'Collected By:'} <span className="font-bold text-slate-900">{payment.collectedBy || 'Admin'}</span>
              </p>
            </div>

            <div className="text-center space-y-1 pb-1">
              <div className="w-36 border-b-2 border-dashed border-slate-400 mx-auto mb-2"></div>
              <p className="font-bold text-slate-900">{isBn ? 'কর্তৃপক্ষের স্বাক্ষর ও সিল' : 'Authorized Signature & Seal'}</p>
              <p className="text-[10px] text-slate-500">{isBn ? 'ব্যবস্থাপনা পর্ষদ, জাপান সিটি টাওয়ার' : 'Management Board, Japan City Tower'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isBn ? 'প্রিন্ট রসিদ' : 'Print Receipt'}
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isBn ? 'PDF ডাউনলোড' : 'Download PDF'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="WhatsApp integration placeholder"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={handleSmsShare}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="SMS integration placeholder"
            >
              <Send className="w-4 h-4" />
              SMS
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

