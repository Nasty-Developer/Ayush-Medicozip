// PrescriptionUpload — Drag-and-drop / click-to-upload prescription image.
// Used in CheckoutPage when any cart item requires a prescription.
//
// Design:
//  • Accepts JPG / PNG / WebP / PDF (max 10 MB)
//  • Shows a file preview for images, filename for PDFs
//  • Displays upload progress bar during Firebase Storage upload
//  • Reports the final download URL via onUploadComplete()
//  • Falls back gracefully when Firebase Storage isn't configured

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Image as ImageIcon, FileText, Check, X, Loader2, AlertCircle,
} from "lucide-react";
import { uploadPrescription, validatePrescriptionFile, type UploadProgress } from "@/lib/storageService";

interface PrescriptionUploadProps {
  userId: string;
  orderId: string;
  onUploadComplete: (url: string) => void;
  onClear: () => void;
  uploadedUrl: string | null;
}

export default function PrescriptionUpload({
  userId,
  orderId,
  onUploadComplete,
  onClear,
  uploadedUrl,
}: PrescriptionUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const validationError = validatePrescriptionFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setFileName(file.name);
    setIsPdf(file.type === "application/pdf");

    // Show local preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Upload to Firebase Storage
    setUploading(true);
    try {
      const result = await uploadPrescription(file, userId, orderId, (p) => setProgress(p));
      onUploadComplete(result.url);
    } catch (err) {
      const msg = (err as Error).message ?? "Upload failed. Please try again.";
      setError(msg);
      setPreview(null);
      setFileName(null);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, [userId, orderId, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-selected after clearing
    e.target.value = "";
  };

  const handleClear = () => {
    setPreview(null);
    setFileName(null);
    setIsPdf(false);
    setError(null);
    setProgress(null);
    onClear();
  };

  // Already uploaded successfully
  if (uploadedUrl && !uploading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 p-4 rounded-xl border border-green-300 dark:border-green-700
                   bg-green-50 dark:bg-green-900/10"
      >
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <Check size={18} className="text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">Prescription uploaded ✓</p>
          {fileName && (
            <p className="text-xs text-green-600/70 dark:text-green-500/70 truncate">{fileName}</p>
          )}
        </div>
        <button
          onClick={handleClear}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          title="Remove prescription"
        >
          <X size={14} />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 p-6
                    rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                    ${dragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border hover:border-primary/50 hover:bg-primary/3"
                    }
                    ${uploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="hidden"
          onChange={handleChange}
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 w-full">
              <Loader2 size={26} className="animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Uploading prescription…</p>
              {progress && (
                <div className="w-full max-w-[200px]">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${progress.percent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">{progress.percent}%</p>
                </div>
              )}
            </motion.div>
          ) : preview ? (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
              <img src={preview} alt="Prescription preview" className="max-h-32 max-w-full rounded-lg object-contain" />
              <p className="text-xs text-muted-foreground truncate max-w-full">{fileName}</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Upload Prescription</p>
                <p className="text-xs text-muted-foreground mt-0.5">Drag & drop or click to select</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">JPG, PNG, WebP or PDF · Max 10 MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 rounded-xl border border-destructive/20 bg-destructive/5"
        >
          <AlertCircle size={14} className="text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </motion.div>
      )}

      {/* WhatsApp fallback note */}
      <p className="text-xs text-muted-foreground text-center">
        Or send your prescription via WhatsApp to{" "}
        <a href="https://wa.me/919833273838" className="text-primary underline" target="_blank" rel="noreferrer">
          +91 98332 73838
        </a>
      </p>
    </div>
  );
}
