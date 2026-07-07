import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  PackageSearch,
  MessageCircle,
  Mail,
  Loader2,
  CheckCircle2,
  Paperclip,
  X,
  Send,
  Hash,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { Link } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useRequestMedicine } from "@/context/RequestMedicineContext";
import { addDocument, updateDocument } from "@/lib/firestoreHelpers";
import { uploadPrescription, uploadRequestMedicinePhoto } from "@/lib/storageHelpers";
import { isFirebaseConfigured } from "@/lib/firebase";
import { checkDeliveryEligibility, STORE_LOCATION_LABEL } from "@/lib/deliveryZone";
import { generateOrderId } from "@/lib/orderId";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const requestSchema = z.object({
  customerName: z.string().min(2, "Please enter your full name"),
  mobileNumber: z
    .string()
    .min(10, "Enter a valid 10-digit mobile number")
    .regex(/^[0-9+\s-]+$/, "Enter a valid mobile number"),
  whatsappSameAsMobile: z.boolean().default(true),
  whatsappNumber: z.string().optional(),
  houseNumber: z.string().min(1, "Please enter your house/flat number"),
  street: z.string().min(2, "Please enter your street/area"),
  landmark: z.string().optional(),
  pincode: z
    .string()
    .min(6, "Enter a valid 6-digit pincode")
    .max(6, "Enter a valid 6-digit pincode")
    .regex(/^\d{6}$/, "Pincode must be 6 digits"),
  deliveryInstructions: z.string().optional(),
  medicineName: z.string().min(2, "Please enter the medicine name"),
  medicineStrength: z.string().optional(),
  medicineBrand: z.string().optional(),
  quantity: z.string().min(1, "Please enter a quantity"),
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;
type Source = "website" | "whatsapp" | "email";

const REQUEST_EMAIL =
  import.meta.env.VITE_REQUEST_EMAIL || "orders@ayushmedico.com";
const WA_NUMBER = "919833273838";

export default function RequestMedicine() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { toast } = useToast();
  const { prefillMedicine, requestToken } = useRequestMedicine();
  const { user: customerUser } = useCustomerAuth();
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [medicinePhotoFile, setMedicinePhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<
    "send" | "whatsapp" | "email" | null
  >(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastRequestId, setLastRequestId] = useState("");
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      customerName: "",
      mobileNumber: "",
      whatsappSameAsMobile: true,
      whatsappNumber: "",
      houseNumber: "",
      street: "",
      landmark: "",
      pincode: "",
      deliveryInstructions: "",
      medicineName: "",
      medicineStrength: "",
      medicineBrand: "",
      quantity: "1",
      notes: "",
    },
  });

  const pincode = form.watch("pincode");
  const whatsappSame = form.watch("whatsappSameAsMobile");
  const eligibility = checkDeliveryEligibility(pincode || "");

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
    source: Source,
  ): Promise<string> => {
    if (!isFirebaseConfigured) {
      throw new Error(
        "Firebase is not configured. Set VITE_FIREBASE_* environment variables.",
      );
    }
    const requestId = await generateOrderId();
    const fileToUpload = prescriptionFile; // capture before state clears
    const photoToUpload = medicinePhotoFile;
    const fullAddress = [
      values.houseNumber,
      values.street,
      values.landmark,
      `Kurla West, Mumbai - ${values.pincode}`,
    ]
      .filter(Boolean)
      .join(", ");
    const eligibleAtSubmit = checkDeliveryEligibility(values.pincode).status === "eligible";

    const docId = await addDocument("inquiries", {
      type: "medicine-request", // differentiates from general inquiries
      requestId,
      customerName: values.customerName,
      mobileNumber: values.mobileNumber,
      whatsappNumber: values.whatsappSameAsMobile
        ? values.mobileNumber
        : values.whatsappNumber || values.mobileNumber,
      houseNumber: values.houseNumber,
      street: values.street,
      landmark: values.landmark || "",
      pincode: values.pincode,
      fullAddress,
      deliveryInstructions: values.deliveryInstructions || "",
      deliveryEligible: eligibleAtSubmit,
      medicineName: values.medicineName,
      medicineStrength: values.medicineStrength || "",
      medicineBrand: values.medicineBrand || "",
      quantity: values.quantity,
      notes: values.notes || "",
      hasPrescription: !!fileToUpload,
      prescriptionUrl: null,
      prescriptionUploadStatus: fileToUpload ? "pending" : null,
      medicinePhotoUrl: null,
      medicinePhotoUploadStatus: photoToUpload ? "pending" : null,
      medicinePrice: null,
      deliveryCharge: null,
      discount: null,
      grandTotal: null,
      paymentStatus: "not-applicable",
      source,
      status: "new",
      // Optional customer-account link — only set when the customer is
      // signed in at submit time. Anonymous submission still works exactly
      // as before; these fields are simply omitted for guests. This is what
      // lets "My Orders" find this request later via customerUid.
      ...(customerUser
        ? { customerUid: customerUser.uid, customerEmail: customerUser.email || null }
        : {}),
    });

    // Fire-and-forget uploads — never blocks channel launch
    if (fileToUpload) {
      void (async () => {
        try {
          const url = await uploadPrescription(fileToUpload, docId);
          await updateDocument("inquiries", docId, {
            prescriptionUrl: url,
            prescriptionUploadStatus: "uploaded",
          });
        } catch (uploadErr) {
          console.error(
            "[RequestMedicine] Prescription upload failed:",
            uploadErr,
          );
          void updateDocument("inquiries", docId, {
            prescriptionUploadStatus: "failed",
          }).catch(() => {});
        }
      })();
    }
    if (photoToUpload) {
      void (async () => {
        try {
          const url = await uploadRequestMedicinePhoto(photoToUpload, docId);
          await updateDocument("inquiries", docId, {
            medicinePhotoUrl: url,
            medicinePhotoUploadStatus: "uploaded",
          });
        } catch (uploadErr) {
          console.error("[RequestMedicine] Medicine photo upload failed:", uploadErr);
          void updateDocument("inquiries", docId, {
            medicinePhotoUploadStatus: "failed",
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
      `Delivery Address: ${values.houseNumber}, ${values.street}${values.landmark ? `, ${values.landmark}` : ""}, Kurla West, Mumbai - ${values.pincode}`,
      `Medicine Name: ${values.medicineName}`,
    ];
    if (values.medicineStrength) lines.push(`Strength: ${values.medicineStrength}`);
    if (values.medicineBrand) lines.push(`Brand Preference: ${values.medicineBrand}`);
    lines.push(`Quantity: ${values.quantity}`);
    if (values.notes) lines.push(`Additional Notes: ${values.notes}`);
    if (prescriptionFile)
      lines.push(
        `Prescription: ${prescriptionFile.name} (please ask me to share)`,
      );
    lines.push("", "Please let me know whether this medicine is available.");
    lines.push(
      "If it is currently unavailable, kindly arrange it and inform me when it arrives.",
    );
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
      `Delivery Address: ${values.houseNumber}, ${values.street}${values.landmark ? `, ${values.landmark}` : ""}, Kurla West, Mumbai - ${values.pincode}`,
      `Medicine Name: ${values.medicineName}`,
    ];
    if (values.medicineStrength) lines.push(`Strength: ${values.medicineStrength}`);
    if (values.medicineBrand) lines.push(`Brand Preference: ${values.medicineBrand}`);
    lines.push(`Quantity: ${values.quantity}`);
    if (values.notes) lines.push(`Additional Notes: ${values.notes}`);
    lines.push("", "Please let me know whether this medicine is available.");
    lines.push(
      "If it is currently unavailable, kindly arrange it and inform me once it is available.",
    );
    lines.push("", "Thank you.");
    return lines.join("\n");
  };

  // ── Submit handlers ──────────────────────────────────────────────────────────
  const requirePrescription = (): boolean => {
    if (!prescriptionFile) {
      setPrescriptionError(
        "A prescription is required to submit a medicine delivery request.",
      );
      toast({
        variant: "destructive",
        title: "Prescription required",
        description: "Please upload a photo or PDF of your prescription before submitting.",
      });
      return false;
    }
    setPrescriptionError(null);
    return true;
  };

  const handleSendRequest = async (values: RequestFormValues) => {
    if (!requirePrescription()) return;
    if (eligibility.status !== "eligible") {
      toast({
        variant: "destructive",
        title: "Outside delivery zone",
        description: `We currently deliver only within ~4km of ${STORE_LOCATION_LABEL}. Please double-check your pincode.`,
      });
      return;
    }
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
      alert(errMsg);

      toast({
        variant: "destructive",
        title: "Submission failed",
        description: errMsg,
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleWhatsApp = async (values: RequestFormValues) => {
    if (!requirePrescription()) return;
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
        description: "Please attach your prescription photo before sending.",
      });
      finishSubmission();
      setSubmitting(null);
    }, 600);
  };

  const handleEmail = async (values: RequestFormValues) => {
    if (!requirePrescription()) return;
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
        description: "Please attach your prescription file before sending.",
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
      setMedicinePhotoFile(null);
      setPrescriptionError(null);
    }, 5000);
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
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please choose a prescription image or PDF under 10MB.",
        });
        return;
      }
      setPrescriptionFile(file);
      setPrescriptionError(null);
    }
  };

  const handleMedicinePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please choose a medicine photo under 5MB.",
        });
        return;
      }
      setMedicinePhotoFile(file);
    }
  };

  return (
    <section
      id="request-medicine"
      ref={ref}
      className="py-20 lg:py-28 bg-muted/30"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            <PackageSearch size={14} />
            Request Medicine Delivery
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Can't Find Your{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Medicine?
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            We deliver within ~4km of {STORE_LOCATION_LABEL}. Share your
            prescription and delivery address, and we'll verify, price, and
            deliver your order.
          </p>
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary hover:underline"
          >
            <LinkIcon size={13} /> Already requested? Track your order
          </Link>
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
                <h3
                  className="text-xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  ✅ Request Submitted Successfully
                </h3>
                {lastRequestId && (
                  <>
                    <p className="text-xs text-muted-foreground mb-1">Your Order ID</p>
                    <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold font-mono">
                      <Hash size={12} />
                      {lastRequestId}
                    </div>
                  </>
                )}
                <p className="text-muted-foreground text-sm max-w-sm mb-1">
                  Please save this Order ID. You can use it along with your
                  mobile number to track your medicine request anytime.
                </p>
                <p className="text-muted-foreground text-sm max-w-sm mb-4">
                  Our pharmacist will verify your prescription and contact you
                  with pricing before delivery.
                </p>
                {lastRequestId && (
                  <Link
                    href={`/track?orderId=${encodeURIComponent(lastRequestId)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-all"
                  >
                    Track Your Order
                  </Link>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <Form {...form}>
                  <form className="space-y-5" noValidate onSubmit={(e) => e.preventDefault()}>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-name">
                              Customer Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="request-name"
                                placeholder="e.g. Ramesh Patil"
                                data-testid="input-customer-name"
                                {...field}
                              />
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
                            <FormLabel htmlFor="request-mobile">
                              Mobile Number
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="request-mobile"
                                type="tel"
                                placeholder="e.g. 98332 73838"
                                data-testid="input-mobile-number"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="whatsappSameAsMobile"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              id="whatsapp-same"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-whatsapp-same"
                            />
                          </FormControl>
                          <FormLabel htmlFor="whatsapp-same" className="!mt-0 cursor-pointer font-normal text-sm">
                            My WhatsApp number is the same as my mobile number
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    {!whatsappSame && (
                      <FormField
                        control={form.control}
                        name="whatsappNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-whatsapp">WhatsApp Number</FormLabel>
                            <FormControl>
                              <Input
                                id="request-whatsapp"
                                type="tel"
                                placeholder="e.g. 98332 73838"
                                data-testid="input-whatsapp-number"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* ── Delivery Address ───────────────────────────────── */}
                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={14} className="text-primary" />
                        <p className="text-sm font-semibold text-foreground">Delivery Address</p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <FormField
                          control={form.control}
                          name="houseNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="request-house">House / Flat No.</FormLabel>
                              <FormControl>
                                <Input id="request-house" placeholder="e.g. Flat 302, B Wing" data-testid="input-house-number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="request-street">Street / Area</FormLabel>
                              <FormControl>
                                <Input id="request-street" placeholder="e.g. Nehru Nagar Road" data-testid="input-street" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-5 mt-5">
                        <FormField
                          control={form.control}
                          name="landmark"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="request-landmark">
                                Landmark <span className="text-muted-foreground font-normal">(Optional)</span>
                              </FormLabel>
                              <FormControl>
                                <Input id="request-landmark" placeholder="e.g. Near Kurla Station" data-testid="input-landmark" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pincode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel htmlFor="request-pincode">Pincode</FormLabel>
                              <FormControl>
                                <Input
                                  id="request-pincode"
                                  inputMode="numeric"
                                  maxLength={6}
                                  placeholder="e.g. 400070"
                                  data-testid="input-pincode"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {pincode && pincode.length === 6 && (
                        <div
                          data-testid="delivery-eligibility-banner"
                          className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                            eligibility.status === "eligible"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : eligibility.status === "invalid"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {eligibility.status === "eligible" ? (
                            <>
                              <CheckCircle size={13} /> Great! We deliver to your area.
                            </>
                          ) : eligibility.status === "invalid" ? (
                            <>
                              <AlertTriangle size={13} /> Please enter a valid 6-digit pincode.
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={13} />
                              Sorry, we currently deliver only within ~4km of {STORE_LOCATION_LABEL}.
                            </>
                          )}
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="deliveryInstructions"
                        render={({ field }) => (
                          <FormItem className="mt-5">
                            <FormLabel htmlFor="request-instructions">
                              Delivery Instructions <span className="text-muted-foreground font-normal">(Optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input id="request-instructions" placeholder="e.g. Ring bell twice, leave at door" data-testid="input-delivery-instructions" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* ── Medicine Details ───────────────────────────────── */}
                    <div className="grid sm:grid-cols-[2fr_1fr] gap-5">
                      <FormField
                        control={form.control}
                        name="medicineName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-medicine-name">
                              Medicine Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="request-medicine-name"
                                placeholder="e.g. Metformin 500mg"
                                data-testid="input-medicine-name"
                                {...field}
                              />
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
                            <FormLabel htmlFor="request-quantity">
                              Quantity
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="request-quantity"
                                placeholder="e.g. 2 strips"
                                data-testid="input-quantity"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="medicineStrength"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-strength">
                              Strength <span className="text-muted-foreground font-normal">(Optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input id="request-strength" placeholder="e.g. 500mg" data-testid="input-medicine-strength" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicineBrand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="request-brand">
                              Brand Preference <span className="text-muted-foreground font-normal">(Optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input id="request-brand" placeholder="e.g. Cipla" data-testid="input-medicine-brand" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="request-prescription"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Upload Prescription{" "}
                        <span className="text-destructive font-normal">(Required)</span>
                      </label>
                      {prescriptionFile ? (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-muted/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip
                              size={16}
                              className="text-primary flex-shrink-0"
                            />
                            <span className="text-sm text-foreground truncate">
                              {prescriptionFile.name}
                            </span>
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
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed cursor-pointer transition-all duration-200 text-sm ${
                            prescriptionError
                              ? "border-destructive/50 bg-destructive/5 text-destructive"
                              : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground"
                          }`}
                        >
                          <Paperclip size={16} />
                          Choose a photo or PDF of your prescription (max 10MB)
                        </label>
                      )}

                      {/* Input intentionally moved outside <form> — see below */}
                      {prescriptionError && (
                        <p className="text-xs text-destructive mt-1.5">{prescriptionError}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="request-medicine-photo"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Photo of Medicine{" "}
                        <span className="text-muted-foreground font-normal">(Optional — helps us find the exact brand)</span>
                      </label>
                      {medicinePhotoFile ? (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-muted/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <ImageIcon size={16} className="text-primary flex-shrink-0" />
                            <span className="text-sm text-foreground truncate">{medicinePhotoFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMedicinePhotoFile(null)}
                            aria-label="Remove medicine photo"
                            data-testid="button-remove-medicine-photo"
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="request-medicine-photo"
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all duration-200 text-sm text-muted-foreground"
                        >
                          <ImageIcon size={16} />
                          Choose a photo of the medicine strip/box
                        </label>
                      )}
                      <input
                        id="request-medicine-photo"
                        name="medicinePhoto"
                        type="file"
                        accept="image/*"
                        onChange={handleMedicinePhotoChange}
                        data-testid="input-medicine-photo"
                        className="sr-only"
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="request-notes">
                            Additional Notes
                          </FormLabel>
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
                        onClick={form.handleSubmit(
                          handleSendRequest,
                          onInvalid,
                        )}
                        data-testid="button-send-request"
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
                      >
                        {submitting === "send" ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                        Request Medicine Delivery
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
