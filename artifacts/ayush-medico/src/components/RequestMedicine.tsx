import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  PackageSearch, MessageCircle, Mail, Loader2, CheckCircle2,
  Paperclip, X, Send, Hash,
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRequestMedicine } from "@/context/RequestMedicineContext";
import { addDocument, updateDocument } from "@/lib/firestoreHelpers";
import { uploadPrescription } from "@/lib/storageHelpers";
import { isFirebaseConfigured } from "@/lib/firebase";

const requestSchema = z.object({
  customerName: z.string().min(2, "Please enter your full name"),
  mobileNumber: z
    .string()
    .min(10, "Enter a valid 10-digit mobile number")
    .regex(/^[0-9+\s-]+$/, "Enter a valid mobile number"),
  medicineName: z.string().min(2, "Please enter the medicine name"),
  quantity: z.string().min(1, "Please enter a quantity"),
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;
type Source = "website" | "whatsapp" | "email";

const REQUEST_EMAIL = import.meta.env.VITE_REQUEST_EMAIL || "orders@ayushmedico.com";
const WA_NUMBER = "919833273838";

function generateRequestId(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `REQ-${datePart}-${rand}`;
}

export default function RequestMedicine() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { toast } = useToast();
  const { prefillMedicine, requestToken } = useRequestMedicine();
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<"send" | "whatsapp" | "email" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastRequestId, setLastRequestId] = useState("");

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      customerName: "",
      mobileNumber: "",
      medicineName: "",
      quantity: "1",
      notes: "",
    },
  });

  useEffect(() => {
    if (requestToken > 0 && prefillMedicine) {
      form.setValue("medicineName", prefillMedicine, { shouldValidate: false });
      form.setFocus("customerName");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestToken]);

  // ── Save to Firestore ────────────────────────────────────────────────────────
  // Writes to the "inquiries" collection (which has allow create: if true in
  // Firebase Console) with type:"medicine-request" to separate from general
  // inquiries. Returns immediately — prescription upload is fire-and-forget.
  const saveToFirestore = async (
    values: RequestFormValues,
    source: Source
  ): Promise<string> => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured. Set VITE_FIREBASE_* environment variables.");
    }
    const requestId = generateRequestId();
    const fileToUpload = prescriptionFile; // capture before state clears
    const docId = await addDocument("inquiries", {
      type: "medicine-request",      // differentiates from general inquiries
      requestId,
      customerName: values.customerName,
      mobileNumber: values.mobileNumber,
      medicineName: values.medicineName,
      quantity: values.quantity,
      notes: values.notes || "",
      hasPrescription: !!fileToUpload,
      prescriptionUrl: null,
      prescriptionUploadStatus: fileToUpload ? "pending" : null,
      source,
      status: "pending",
    });

    // Fire-and-forget prescription upload — never blocks channel launch
    if (fileToUpload) {
      void (async () => {
        try {
          const url = await uploadPrescription(fileToUpload, docId);
          await updateDocument("inquiries", docId, {
            prescriptionUrl: url,
            prescriptionUploadStatus: "uploaded",
          });
        } catch (uploadErr) {
          console.error("[RequestMedicine] Prescription upload failed:", uploadErr);
          void updateDocument("inquiries", docId, {
            prescriptionUploadStatus: "failed",
          }).catch(() => {});
        }
      })();
    }
    return requestId;
  };

  // ── Build message strings ────────────────────────────────────────────────────
  const buildWAMessage = (values: RequestFormValues) => {
    const lines = [
      "Hello Ayush Medico,",
      "",
      "I would like to request the following medicine.",
      "",
      `Customer Name: ${values.customerName}`,
      `Mobile Number: ${values.mobileNumber}`,
      `Medicine Name: ${values.medicineName}`,
      `Quantity: ${values.quantity}`,
    ];
    if (values.notes) lines.push(`Additional Notes: ${values.notes}`);
    if (prescriptionFile) lines.push(`Prescription: ${prescriptionFile.name} (please ask me to share)`);
    lines.push("", "Please let me know whether this medicine is available.");
    lines.push("If it is currently unavailable, kindly arrange it and inform me when it arrives.");
    lines.push("", "Thank you.");
    return lines.join("\n");
  };

  const buildEmailBody = (values: RequestFormValues) => {
    const lines = [
      "Hello,",
      "",
      "I would like to request the following medicine.",
      "",
      `Customer Name: ${values.customerName}`,
      `Mobile Number: ${values.mobileNumber}`,
      `Medicine Name: ${values.medicineName}`,
      `Quantity: ${values.quantity}`,
    ];
    if (values.notes) lines.push(`Additional Notes: ${values.notes}`);
    lines.push("", "Please let me know whether this medicine is available.");
    lines.push("If it is currently unavailable, kindly arrange it and inform me once it is available.");
    lines.push("", "Thank you.");
    return lines.join("\n");
  };

  // ── Submit handlers ──────────────────────────────────────────────────────────
  const handleSendRequest = async (values: RequestFormValues) => {
    setSubmitting("send");
    try {
      const reqId = await saveToFirestore(values, "website");
      setLastRequestId(reqId);
      toast({
        title: "✅ Request submitted!",
        description: `Your request (${reqId}) has been saved. We'll contact you on ${values.mobileNumber} shortly.`,
      });
      finishSubmission();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[RequestMedicine] Send request failed:", err);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: import.meta.env.DEV
          ? errMsg
          : "Could not save your request. Please try WhatsApp or Email.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleWhatsApp = async (values: RequestFormValues) => {
    setSubmitting("whatsapp");
    try {
      await saveToFirestore(values, "whatsapp");
    } catch (err) {
      console.error("[RequestMedicine] WhatsApp save failed:", err);
      // Non-fatal: open WhatsApp even if Firestore save fails
    }
    const message = encodeURIComponent(buildWAMessage(values));
    window.setTimeout(() => {
      window.open(`https://wa.me/${WA_NUMBER}?text=${message}`, "_blank");
      toast({
        title: "WhatsApp opened!",
        description: prescriptionFile
          ? "Please attach your prescription photo before sending."
          : "Your request is pre-filled. Just hit send.",
      });
      finishSubmission();
      setSubmitting(null);
    }, 600);
  };

  const handleEmail = async (values: RequestFormValues) => {
    setSubmitting("email");
    try {
      await saveToFirestore(values, "email");
    } catch (err) {
      console.error("[RequestMedicine] Email save failed:", err);
      // Non-fatal: open email even if Firestore save fails
    }
    const subject = encodeURIComponent(`Medicine Request - Ayush Medico`);
    const body = encodeURIComponent(buildEmailBody(values));
    window.setTimeout(() => {
      window.location.href = `mailto:${REQUEST_EMAIL}?subject=${subject}&body=${body}`;
      toast({
        title: "Email app opened!",
        description: prescriptionFile
          ? "Please attach your prescription file before sending."
          : "Your request is pre-filled. Just hit send.",
      });
      finishSubmission();
      setSubmitting(null);
    }, 600);
  };

  const finishSubmission = () => {
    setSubmitted(true);
    window.setTimeout(() => {
      setSubmitted(false);
      setLastRequestId("");
      form.reset();
      setPrescriptionFile(null);
    }, 4000);
  };

  const onInvalid = () => {
    toast({
      variant: "destructive",
      title: "Please check the form",
      description: "Some required fields are missing or invalid.",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please choose a prescription image or PDF under 8MB.",
        });
        return;
      }
      setPrescriptionFile(file);
    }
  };

  return (
    <section id="request-medicine" ref={ref} className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            <PackageSearch size={14} />
            Request Any Medicine
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Can't Find Your{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Medicine?
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            If the medicine you're looking for isn't currently available, send us a request and we'll contact you as soon as possible.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative rounded-3xl border border-border bg-card/70 backdrop-blur-xl shadow-xl shadow-primary/5 p-6 sm:p-10 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-gradient-to-bl from-primary/10 to-transparent blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-gradient-to-tr from-secondary/10 to-transparent blur-2xl pointer-events-none" />

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative flex flex-col items-center justify-center py-12 text-center"
                data-testid="request-success-state"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center mb-4"
                >
                  <CheckCircle2 size={36} className="text-secondary" />
                </motion.div>
                <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Request Submitted!
                </h3>
                {lastRequestId && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    <Hash size={11} />
                    {lastRequestId}
                  </div>
                )}
                <p className="text-muted-foreground text-sm max-w-sm">
                  We've received your request and will get back to you shortly on your mobile number.
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
                <Form {...form}>
                  <form className="space-y-5" noValidate>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-name">Customer Name</FormLabel>
                            <FormControl>
                              <Input id="request-name" placeholder="e.g. Ramesh Patil" data-testid="input-customer-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="mobileNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-mobile">Mobile Number</FormLabel>
                            <FormControl>
                              <Input id="request-mobile" type="tel" placeholder="e.g. 98332 73838" data-testid="input-mobile-number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid sm:grid-cols-[2fr_1fr] gap-5">
                      <FormField
                        control={form.control}
                        name="medicineName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-medicine-name">Medicine Name</FormLabel>
                            <FormControl>
                              <Input id="request-medicine-name" placeholder="e.g. Metformin 500mg" data-testid="input-medicine-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-quantity">Quantity</FormLabel>
                            <FormControl>
                              <Input id="request-quantity" placeholder="e.g. 2 strips" data-testid="input-quantity" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <label htmlFor="request-prescription" className="block text-sm font-medium text-foreground mb-2">
                        Upload Prescription <span className="text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      {prescriptionFile ? (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-muted/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip size={16} className="text-primary flex-shrink-0" />
                            <span className="text-sm text-foreground truncate">{prescriptionFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPrescriptionFile(null)}
                            aria-label="Remove prescription file"
                            data-testid="button-remove-file"
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="request-prescription"
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all duration-200 text-sm text-muted-foreground"
                        >
                          <Paperclip size={16} />
                          Choose a photo or PDF of your prescription
                        </label>
                      )}
                      <input
                        id="request-prescription"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        data-testid="input-prescription-file"
                        className="sr-only"
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="request-notes">Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              id="request-notes"
                              placeholder="Any additional details we should know..."
                              rows={3}
                              data-testid="input-notes"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3 pt-2">
                      {/* Primary: Send Request */}
                      <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={form.handleSubmit(handleSendRequest, onInvalid)}
                        data-testid="button-send-request"
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
                      >
                        {submitting === "send" ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                        Send Request
                      </button>

                      {/* Secondary: WhatsApp + Email */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          disabled={submitting !== null}
                          onClick={form.handleSubmit(handleWhatsApp, onInvalid)}
                          data-testid="button-request-whatsapp"
                          className="relative overflow-hidden flex items-center justify-center gap-2 flex-1 px-6 py-3 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 font-semibold rounded-xl hover:bg-[#25D366] hover:text-white active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          {submitting === "whatsapp" ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <MessageCircle size={17} />
                          )}
                          Request via WhatsApp
                        </button>
                        <button
                          type="button"
                          disabled={submitting !== null}
                          onClick={form.handleSubmit(handleEmail, onInvalid)}
                          data-testid="button-request-email"
                          className="relative overflow-hidden flex items-center justify-center gap-2 flex-1 px-6 py-3 bg-primary/10 text-primary border border-primary/30 font-semibold rounded-xl hover:bg-primary hover:text-white active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          {submitting === "email" ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <Mail size={17} />
                          )}
                          Request via Email
                        </button>
                      </div>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
