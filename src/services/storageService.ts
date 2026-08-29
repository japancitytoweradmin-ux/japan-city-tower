import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { VoucherAttachment } from '../types';

export interface UploadProgressCallback {
  (progress: number): void;
}

// Convert File to base64 Data URL for persistent offline preview
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Compress image file to a lightweight Data URL (WebP/PNG)
const compressImageToDataUrl = (file: File, maxWidth = 500, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      fileToDataUrl(file).then(resolve).catch(() => resolve(''));
    };
    reader.readAsDataURL(file);
  });
};

export const storageService = {
  /**
   * Upload voucher file to Firebase Storage
   * Path: /building-expenses/{year}/{month}/{expenseId}/{fileName}
   */
  uploadVoucherFile: async (
    file: File,
    year: string,
    month: string,
    expenseId: string,
    onProgress?: UploadProgressCallback
  ): Promise<VoucherAttachment> => {
    // Sanitize fileName
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `building-expenses/${year}/${month}/${expenseId}/${safeFileName}`;
    const voucherId = `vch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    let downloadUrl = '';
    let previewUrl = '';

    try {
      // 1. Try real Firebase Storage upload
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(progress);
          },
          (error) => {
            console.warn('Firebase Storage upload failed, switching to local DataURL fallback:', error);
            reject(error);
          },
          async () => {
            try {
              downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      previewUrl = downloadUrl;
    } catch (err) {
      // Fallback: convert file to DataURL so app & Firestore never fail
      if (onProgress) {
        onProgress(50);
        await new Promise((r) => setTimeout(r, 100));
        onProgress(100);
      }
      previewUrl = await fileToDataUrl(file);
    }

    const attachment: VoucherAttachment = {
      id: voucherId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      previewUrl: previewUrl,
      storagePath: `/${storagePath}`,
      downloadUrl: downloadUrl || previewUrl,
      uploadedAt: new Date().toLocaleString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      uploadedBy: 'ম্যানেজার (Admin)',
      isVerified: true
    };

    return attachment;
  },

  /**
   * Remove voucher reference from Firebase Storage
   */
  deleteVoucher: async (storagePath: string): Promise<boolean> => {
    try {
      if (storagePath) {
        const cleanPath = storagePath.startsWith('/') ? storagePath.substring(1) : storagePath;
        const storageRef = ref(storage, cleanPath);
        await deleteObject(storageRef);
      }
      return true;
    } catch (error) {
      console.warn('Delete object warning:', error);
      return true;
    }
  },

  /**
   * Upload Building Logo to Firebase Storage
   * Path: /system-settings/logo/building_logo
   */
  uploadLogoFile: async (
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<string> => {
    // 1. Prepare compressed Data URL fallback upfront so CORS/Network errors can't block logo upload
    const dataUrlFallback = await compressImageToDataUrl(file, 450, 0.85);

    const ext = file.name.split('.').pop() || 'png';
    const storagePath = `system-settings/logo/building_logo_${Date.now()}.${ext}`;

    try {
      if (onProgress) onProgress(30);
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      const downloadUrl = await new Promise<string>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn('Firebase storage upload timed out, resolving to compressed DataURL');
          resolve(dataUrlFallback);
        }, 3500);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(progress);
          },
          (error) => {
            clearTimeout(timeoutId);
            console.warn('Logo upload to Firebase Storage failed (CORS/Network), using DataURL fallback:', error);
            resolve(dataUrlFallback);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (err) {
              resolve(dataUrlFallback);
            }
          }
        );
      });

      if (onProgress) onProgress(100);
      return downloadUrl;
    } catch (err) {
      console.warn('Firebase Storage upload exception, falling back to compressed DataURL:', err);
      if (onProgress) onProgress(100);
      return dataUrlFallback;
    }
  }
};

