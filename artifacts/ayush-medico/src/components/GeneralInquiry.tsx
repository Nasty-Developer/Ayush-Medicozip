import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MessageSquare, Send, MessageCircle, Mail, Loader2, CheckCircle2,
  Phone, User, Hash,
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addDocument } from "@/lib/firestoreHelpers";
import { isFirebaseConfigured } from "@/lib/firebase";

const inquirySchema = z.object({
  customerName: z.string().min(2, "Please enter your name"),
  mobileNumber: z
    .string()
    .min(10, "Enter a valid 10-digit mobile number")
    .regex(/^[0-9+\s-]+$/, "Enter a valid mobile number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  subject: z.string().min(3, "Please enter a subject"),
  message: z.string().min(10, "Please describe your inquiry in a few words"),
  preferredContact: z.enum(["phone", "whatsapp", "email"]),
});

type InquiryFormValues = z.infer<typeof inquirySchema>;
type SubmitSource = "website" | "whatsapp" | "email";

const INQUIRY_EMAIL = import.meta.env.VITE_REQUEST_EMAIL || "orders@ayushmedico.com";
const WA_NUMBER = "919833273838";

function generateInquiryId(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INQ-${datePart}-${rand}`;
}

const CONTACT_OPTIONS = [
  { value: "phone" as const, label: "Phone Call", icon: Phone },
  { value: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
  { value: "email" as const, label: "Email", icon: Mail },
];

export default function GeneralInquiry() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState<"send" | "whatsapp" | "email" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastInquiryId, setLastInquiryId] = useState("");

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      customerName: "",
      mobileNumber: "",
      email: "",
      subject: "",
      message: "",
      preferredContact: "whatsapp",
    },
  });

  const saveToFirestore = async (values: InquiryFormValues, source: SubmitSource): Promise<string> => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured. Set VITE_FIREBASE_* environment variables.");
    }
    const inquiryId = generateInquiryId();
    await addDocument("inquiries", {
      type: "inquiry",                          // differentiates from medicine-request type
      inquiryId,
      customerName: values.customerName,
      mobileNumber: values.mobileNumber,
      email: values.email || "",
      subject: values.subject,
      message: values.message,
      preferredContact: values.preferredContact,
      source,
      status: "pending",
      channel: source === "website" ? "normal" : source, // backward-compat
    });
    return inquiryId;
  };

  const buildWAMessage = (v: InquiryFormValues) =>
    [
      "Hello Ayush Medico,",
      "",
      `Subject: ${v.subject}`,
      "",
      `Customer Name: ${v.customerName}`,
      `Mobile Number: ${v.mobileNumber}`,
      v.email ? `Email: ${v.email}` : null,
      `Preferred Contact: ${v.preferredContact}`,
      "",
      v.message,
      "",
      "Thank you.",
    ]
      .filter((l) => l !== null)
      .join("\n");

  const buildEmailBody = (v: InquiryFormValues) =>
    [
      "Hello Ayush Medico Team,",
      "",
      `Subject: ${v.subject}`,
      "",
      `Customer Name: ${v.customerName}`,
      `Mobile Number: ${v.mobileNumber}`,
      v.email ? `Email: ${v.email}` : null,
      `Preferred Contact: ${v.preferredContact}`,
      "",
      v.message,
      "",
      "Thank you.",
    ]
      .filter((l) => l !== null)
      .join("\n");

  const finishSubmission = (id: string) => {
    setLastInquiryId(id);
    setSubmitted(true);
    window.setTimeout(() => {
      setSubmitted(false);
      setLastInquiryId("");
      form.reset();
    }, 5000);
  };

  const handleSubmit = async (values: InquiryFormValues) => {
    setSubmitting("send");
    try {
      const id = await saveToFirestore(values, "website");
      toast({
        title: "✅ Inquiry submitted!",
        description: `Your inquiry (${id}) has been received. We'll contact you via ${values.preferredContact}.`,
      });
      finishSubmission(id);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[GeneralInquiry] Submit failed:", err);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: import.meta.env.DEV
          ? errMsg
          : "Could not save your inquiry. Please try WhatsApp or Email.",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleWhatsApp = async (values: InquiryFormValues) => {
    setSubmitting("whatsapp");
    let id = "";
    try {
      id = await saveToFirestore(values, "whatsapp");
    } catch (err) {
      console.error("[GeneralInquiry] WhatsApp save failed:", err);
      // Non-fatal: open WhatsApp even if Firestore save fails
    }
    const msg = encodeURIComponent(buildWAMessage(values));
    window.setTimeout(() => {
      window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank");
      toast({ title: "WhatsApp opened!", description: "Your inquiry is pre-filled." });
      finishSubmission(id);
      setSubmitting(null);
    }, 600);
  };

  const handleEmail = async (values: InquiryFormValues) => {
    setSubmitting("email");
    let id = "";
    try {
      id = await saveToFirestore(values, "email");
    } catch (err) {
      console.error("[GeneralInquiry] Email save failed:", err);
      // Non-fatal: open email even if Firestore save fails
    }
    const subject = encodeURIComponent(`Inquiry - ${values.subject} | Ayush Medico`);
    const body = encodeURIComponent(buildEmailBody(values));
    window.setTimeout(() => {
      window.location.href = `mailto:${INQUIRY_EMAIL}?subject=${subject}&body=${body}`;
      toast({ title: "Email app opened!", description: "Your inquiry is pre-filled." });
      finishSubmission(id);
      setSubmitting(null);
    }, 600);
  };

  const onInvalid = () => {
    toast({
      variant: "destructive",
      title: "Please check the form",
      description: "Some required fields are missing or invalid.",
    });
  };

  return (
    <section id="general-inquiry" ref={ref} className="py-20 lg:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold border border-secondary/20 mb-4">
            <MessageSquare size={14} />
            General Inquiry
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Have a{" "}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              Question?
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Whether it's about availability, pricing, or anything else — we're here to help. Send us your inquiry and we'll get back to you promptly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative rounded-3xl border border-border bg-card/70 backdrop-blur-xl shadow-xl shadow-secondary/5 p-6 sm:p-10 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-gradient-to-bl from-secondary/10 to-transparent blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-gradient-to-tr from-primary/10 to-transparent blur-2xl pointer-events-none" />

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative flex flex-col items-center justify-center py-12 text-center"
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
                  Inquiry Received!
                </h3>
                {lastInquiryId && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
                    <Hash size={11} />
                    {lastInquiryId}
                  </div>
                )}
                <p className="text-muted-foreground text-sm max-w-sm">
                  We've received your inquiry and will respond via your preferred contact method.
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
                <Form {...form}>
                  <form className="space-y-5" noValidate onSubmit={(e) => e.preventDefault()}>
                    {/* Name + Mobile */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input className="pl-9" placeholder="e.g. Ramesh Patil" {...field} />
                              </div>
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
                            <FormLabel>Mobile Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input className="pl-9" type="tel" placeholder="e.g. 98332 73838" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Email (optional) + Subject */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Email <span className="text-muted-foreground font-normal">(Optional)</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input className="pl-9" type="email" placeholder="you@example.com" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Medicine availability" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Message */}
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your inquiry in detail..."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Preferred Contact */}
                    <FormField
                      control={form.control}
                      name="preferredContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Contact Method</FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-2">
                              {CONTACT_OPTIONS.map(({ value, label, icon: Icon }) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => field.onChange(value)}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                                    field.value === value
                                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                      : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                                  }`}
                                >
                                  <Icon size={14} />
                                  {label}
                                </button>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={form.handleSubmit(handleSubmit, onInvalid)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-secondary to-primary text-white font-semibold rounded-xl shadow-lg shadow-secondary/30 hover:shadow-secondary/50 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200"
                      >
                        {submitting === "send" ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        Submit Inquiry
                      </button>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          disabled={submitting !== null}
                          onClick={form.handleSubmit(handleWhatsApp, onInvalid)}
                          className="flex items-center justify-center gap-2 flex-1 px-6 py-3 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 font-semibold rounded-xl hover:bg-[#25D366] hover:text-white active:scale-[0.98] disabled:opacity-70 transition-all duration-200"
                        >
                          {submitting === "whatsapp" ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                          Send via WhatsApp
                        </button>
                        <button
                          type="button"
                          disabled={submitting !== null}
                          onClick={form.handleSubmit(handleEmail, onInvalid)}
                          className="flex items-center justify-center gap-2 flex-1 px-6 py-3 bg-primary/10 text-primary border border-primary/30 font-semibold rounded-xl hover:bg-primary hover:text-white active:scale-[0.98] disabled:opacity-70 transition-all duration-200"
                        >
                          {submitting === "email" ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                          Send via Email
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
