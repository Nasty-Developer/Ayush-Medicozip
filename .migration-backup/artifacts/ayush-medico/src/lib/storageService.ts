// storageService — Firebase Storage helpers for prescription upload.
// Prescriptions are stored at:  prescriptions/{userId}/{orderId}/{timestamp}_{filename}

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type StorageReference,
} from "firebase/storage";
import { storage } from "./firebase";

export type UploadProgress = {
  bytesTransferred: number;
  totalBytes: number;
  percent: number;
};

export type UploadResult = {
  url: string;
  path: string;
  fileName: string;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validatePrescriptionFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only JPG, PNG, WebP, or PDF files are allowed.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File must be smaller than 10 MB.";
  }
  return null;
}

/**
 * Upload a prescription file to Firebase Storage.
 * Calls `onProgress` with 0–100 during the upload.
 * Resolves with the public download URL.
 */
export function uploadPrescription(
  file: File,
  userId: string,
  orderId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    if (!storage) {
      reject(new Error("Firebase Storage is not configured. Please share your prescription via WhatsApp at +91 98332 73838."));
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${Date.now()}_prescription.${ext}`;
    const path = `prescriptions/${userId}/${orderId}/${fileName}`;
    const storageRef: StorageReference = ref(storage, path);

    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: { orderId, userId, originalName: file.name },
    });

    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.({ bytesTransferred: snapshot.bytesTransferred, totalBytes: snapshot.totalBytes, percent });
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path, fileName });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
