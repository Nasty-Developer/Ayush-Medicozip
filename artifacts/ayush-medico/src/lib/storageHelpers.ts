// Cloudinary upload — no API secret in frontend
// Uses unsigned upload preset (safe for client-side)

const CLOUD_NAME = "oiav8jah";
const UPLOAD_PRESET = "ayush-medico";
// /image/upload — for images only
const UPLOAD_URL_IMAGE = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
// /auto/upload — accepts images AND PDFs (prescriptions)
const UPLOAD_URL_AUTO = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB — for medicine/brand images
const MAX_PRESCRIPTION_SIZE = 10 * 1024 * 1024; // 10 MB — prescriptions can be PDFs
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.82;

export type UploadProgress = (percent: number) => void;

// Compress image client-side before upload
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// Core Cloudinary upload — returns secure_url
function uploadToCloudinary(
  file: File,
  uploadUrl: string,
  maxSize: number,
  onProgress?: UploadProgress
): Promise<string> {
  if (file.size > maxSize) {
    const limit = maxSize / 1024 / 1024;
    const got = (file.size / 1024 / 1024).toFixed(1);
    return Promise.reject(new Error(`File too large. Maximum size is ${limit} MB (got ${got} MB).`));
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url as string);
        } catch {
          reject(new Error("Invalid response from Cloudinary"));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const msg = errData?.error?.message ?? `Upload failed (HTTP ${xhr.status})`;
          reject(new Error(msg));
        } catch {
          reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload. Check your internet connection."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));
    xhr.timeout = 90000; // 90 seconds

    xhr.send(formData);
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function uploadMedicineImage(
  file: File,
  _medicineId: string,
  onProgress?: UploadProgress
): Promise<string> {
  const compressed = await compressImage(file);
  return uploadToCloudinary(compressed, UPLOAD_URL_IMAGE, MAX_IMAGE_SIZE, onProgress);
}

export async function uploadBrandLogo(
  file: File,
  _brandId: string,
  onProgress?: UploadProgress
): Promise<string> {
  const compressed = await compressImage(file);
  return uploadToCloudinary(compressed, UPLOAD_URL_IMAGE, MAX_IMAGE_SIZE, onProgress);
}

export async function uploadPrescription(
  file: File,
  _inquiryId: string,
  onProgress?: UploadProgress
): Promise<string> {
  // Use auto/upload to accept images AND PDFs
  // No compression — keep original quality for prescription readability
  return uploadToCloudinary(file, UPLOAD_URL_AUTO, MAX_PRESCRIPTION_SIZE, onProgress);
}

export async function uploadBannerImage(
  file: File,
  _name: string,
  onProgress?: UploadProgress
): Promise<string> {
  const compressed = await compressImage(file);
  return uploadToCloudinary(compressed, UPLOAD_URL_IMAGE, MAX_IMAGE_SIZE, onProgress);
}

export async function uploadStoreLogo(
  file: File,
  onProgress?: UploadProgress
): Promise<string> {
  const compressed = await compressImage(file);
  return uploadToCloudinary(compressed, UPLOAD_URL_IMAGE, MAX_IMAGE_SIZE, onProgress);
}

export const MAX_PRESCRIPTION_BYTES = MAX_PRESCRIPTION_SIZE;
