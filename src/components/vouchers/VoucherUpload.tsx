import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Eye, 
  RefreshCw, 
  Trash2, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  FileImage,
  Loader2
} from 'lucide-react';
import { VoucherAttachment } from '../../types';
import { formatBytes } from '../../utils/formatters';
import { storageService } from '../../services/storageService';
import { useToast } from '../common/Toast';

interface VoucherUploadProps {
  expenseId?: string;
  year?: string;
  month?: string;
  existingVoucher?: VoucherAttachment | null;
  onVoucherChange: (voucher: VoucherAttachment | null) => void;
  onPreviewClick?: (voucher: VoucherAttachment) => void;
  compact?: boolean;
  required?: boolean;
  label?: string;
}

export const VoucherUpload: React.FC<VoucherUploadProps> = ({
  expenseId = 'temp-expense',
  year = '2025',
  month = '06',
  existingVoucher = null,
  onVoucherChange,
  onPreviewClick,
  compact = false,
  required = false,
  label = 'ভাউচার / বিল রশিদ সংযুক্ত করুন',
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);

    // Validation
    if (!allowedTypes.includes(file.type)) {
      const err = 'ফাইলের ধরন সঠিক নয়। শুধুমাত্র JPG, PNG, WEBP বা PDF আপলোড করুন।';
      setErrorMessage(err);
      showToast(err, 'error');
      return;
    }

    if (file.size > maxSizeBytes) {
      const err = `ফাইলের আকার নির্ধারিত ৫ MB সীমার বেশি (${formatBytes(file.size)})`;
      setErrorMessage(err);
      showToast(err, 'error');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Call storage service simulation
      const attachment = await storageService.uploadVoucherFile(
        file,
        year,
        month,
        expenseId,
        (progress) => setUploadProgress(progress)
      );

      onVoucherChange(attachment);
      showToast('ভাউচার সফলভাবে নির্বাচিত ও আপলোড হয়েছে', 'success');
    } catch (err) {
      setErrorMessage('ভাউচার আপলোডে ত্রুটি দেখা দিয়েছে। আবার চেষ্টা করুন।');
      showToast('ভাউচার আপলোডে ত্রুটি', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onVoucherChange(null);
    showToast('ভাউচার মুছে ফেলা হয়েছে', 'info');
  };

  // IF VOUCHER ALREADY ATTACHED
  if (existingVoucher) {
    const isPdf = existingVoucher.fileType === 'application/pdf' || existingVoucher.fileName.endsWith('.pdf');

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-bengali">
          <span className="font-medium text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ভাউচার সংযুক্ত রয়েছে
          </span>
          <span className="text-slate-400">{formatBytes(existingVoucher.fileSize)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 transition-all hover:border-slate-300">
          <div 
            onClick={() => onPreviewClick?.(existingVoucher)} 
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          >
            {isPdf ? (
              <div className="w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            ) : existingVoucher.previewUrl ? (
              <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                <img 
                  src={existingVoucher.previewUrl} 
                  alt={existingVoucher.fileName} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <FileImage className="w-6 h-6" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate" title={existingVoucher.fileName}>
                📎 {existingVoucher.fileName}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{existingVoucher.uploadedAt || 'সম্প্রতি আপলোডকৃত'}</span>
                {existingVoucher.storagePath && (
                  <span className="text-slate-400 hidden sm:inline truncate max-w-[120px]">
                    {existingVoucher.storagePath}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onPreviewClick && (
              <button
                type="button"
                onClick={() => onPreviewClick(existingVoucher)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors text-xs flex items-center gap-1 font-bengali"
                title="দেখুন"
              >
                <Eye className="w-4 h-4 text-sky-600" />
                <span className="hidden sm:inline">দেখুন</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors text-xs flex items-center gap-1 font-bengali"
              title="পরিবর্তন করুন"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">পরিবর্তন</span>
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-bengali"
              title="মুছে ফেলুন"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">মুছুন</span>
            </button>
          </div>
        </div>

        {/* Hidden inputs for replacement */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    );
  }

  // UPLOAD PROGRESS STATE
  if (isUploading) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center font-bengali">
        <div className="flex items-center justify-center gap-2 text-slate-700 text-sm font-medium">
          <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
          <span>ভাউচার আপলোড হচ্ছে ({uploadProgress}%)...</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-amber-500 h-full transition-all duration-200 rounded-full"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">Firebase Storage পাথ প্রস্তুত হচ্ছে...</p>
      </div>
    );
  }

  // DEFAULT UPLOAD DROPZONE
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600 font-bengali">
        <span>{label} {required && <span className="text-rose-500">*</span>}</span>
        <span className="text-slate-400">সর্বোচ্চ ৫ MB (JPG, PNG, PDF)</span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          isDragging 
            ? 'border-amber-500 bg-amber-50/50' 
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'
        } ${compact ? 'p-3' : 'p-5'}`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-2.5 bg-white rounded-full shadow-xs border border-slate-200 text-slate-600 mb-2">
            <Upload className="w-5 h-5 text-slate-600" />
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-800 font-bengali">
            {compact ? 'ভাউচার ফাইল যুক্ত করুন' : 'ভাউচার বা বিল রশিদ আপলোড করতে ক্লিক করুন'}
          </p>
          
          <p className="text-xs text-slate-500 font-bengali mt-0.5">
            অথবা ড্র্যাগ করে এখানে ফাইল ছেড়ে দিন
          </p>

          {/* Action pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 font-bengali"
            >
              <FileImage className="w-3.5 h-3.5 text-blue-600" />
              গ্যালারি / ফাইল
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 font-bengali"
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              ছবি তুলুন (ক্যামেরা)
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 font-bengali"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              PDF নির্বাচন
            </button>
          </div>
        </div>

        {/* Hidden standard file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Hidden camera input for mobile direct capture */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bengali bg-rose-50 p-2 rounded-lg border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
