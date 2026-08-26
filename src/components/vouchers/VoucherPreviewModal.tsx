import React from 'react';
import { 
  Download, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  HardDrive, 
  User, 
  ExternalLink 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { VoucherAttachment } from '../../types';
import { formatBytes } from '../../utils/formatters';
import { useToast } from '../common/Toast';

interface VoucherPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: VoucherAttachment | null;
  expenseTitle?: string;
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  isOpen,
  onClose,
  voucher,
  expenseTitle = 'খরচের ভাউচার',
}) => {
  const { showToast } = useToast();

  if (!voucher) return null;

  const isPdf = voucher.fileType === 'application/pdf' || voucher.fileName.endsWith('.pdf');

  const handleDownload = () => {
    // In Phase 01 Mock Download:
    if (voucher.previewUrl) {
      const a = document.createElement('a');
      a.href = voucher.previewUrl;
      a.download = voucher.fileName;
      a.click();
    }
    showToast(`ভাউচার ডাউনলোড হচ্ছে: ${voucher.fileName}`, 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseTitle}
      subtitle={`ভাউচার ফাইল: ${voucher.fileName}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 font-bengali">
        {/* Preview Viewer Canvas */}
        <div className="relative w-full min-h-[280px] max-h-[500px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 p-2">
          {isPdf ? (
            <div className="text-center p-8 space-y-3">
              <div className="w-16 h-16 mx-auto bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center">
                <FileText className="w-9 h-9" />
              </div>
              <div className="text-white">
                <p className="font-semibold text-base">{voucher.fileName}</p>
                <p className="text-xs text-slate-400 mt-1">PDF ডকুমেন্ট ({formatBytes(voucher.fileSize)})</p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 mx-auto transition-colors"
                >
                  <Download className="w-4 h-4" />
                  PDF ডকুমেন্ট ডাউনলোড করুন
                </button>
              </div>
            </div>
          ) : voucher.previewUrl ? (
            <img
              src={voucher.previewUrl}
              alt={voucher.fileName}
              className="max-h-[460px] w-auto max-w-full object-contain rounded-lg shadow-lg"
            />
          ) : (
            <div className="text-slate-400 text-center p-8">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">ভাউচার ইমেজ লোড করা সম্ভব হয়নি</p>
            </div>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> ফাইলের আকার
            </span>
            <p className="font-semibold text-slate-800">{formatBytes(voucher.fileSize)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> আপলোড সময়
            </span>
            <p className="font-semibold text-slate-800">{voucher.uploadedAt || 'মে/জুন ২০২৫'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> আপলোডকারী
            </span>
            <p className="font-semibold text-slate-800">{voucher.uploadedBy || 'ম্যানেজার'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> স্ট্যাটাস
            </span>
            <p className="font-semibold text-teal-700">ভাউচার সংরক্ষিত</p>
          </div>
        </div>

        {/* Storage Path Info */}
        {voucher.storagePath && (
          <div className="p-2.5 bg-slate-100/70 rounded-lg text-xs font-mono text-slate-600 flex items-center justify-between gap-2 overflow-hidden">
            <span className="truncate">Firebase Path: {voucher.storagePath}</span>
            <span className="text-slate-400 text-[10px] uppercase shrink-0">Storage Ready</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            বন্ধ করুন
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              ভাউচার ডাউনলোড
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
