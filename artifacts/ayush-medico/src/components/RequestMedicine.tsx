import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PackageSearch, MessageCircle, Mail, Loader2, CheckCircle2, Paperclip, X } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRequestMedicine } from "@/context/RequestMedicineContext";

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

const REQUEST_EMAIL = import.meta.env.VITE_REQUEST_EMAIL || "orders@ayushmedico.com";

export default function RequestMedicine() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { toast } = useToast();
  const { prefillMedicine, requestToken } = useRequestMedicine();
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<"whatsapp" | "email" | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  const buildMessage = (values: RequestFormValues) => {
    const lines = [
      "New Medicine Request - Ayush Medico",
      "",
      `Name: ${values.customerName}`,
      `Mobile: ${values.mobileNumber}`,
      `Medicine: ${values.medicineName}`,
      `Quantity: ${values.quantity}`,
    ];
    if (values.notes) lines.push(`Notes: ${values.notes}`);
    if (prescriptionFile) lines.push(`Prescription: ${prescriptionFile.name} (please attach in chat)`);
    return lines.join("\n");
  };

  const submitViaWhatsApp = (values: RequestFormValues) => {
    setSubmitting("whatsapp");
    const message = encodeURIComponent(buildMessage(values));
    window.setTimeout(() => {
      window.open(`https://wa.me/919833273838?text=${message}`, "_blank");
      finishSubmission("whatsapp", !!prescriptionFile);
    }, 700);
  };

  const submitViaEmail = (values: RequestFormValues) => {
    setSubmitting("email");
    const subject = encodeURIComponent(`Medicine Request: ${values.medicineName}`);
    const body = encodeURIComponent(buildMessage(values));
    window.setTimeout(() => {
      window.location.href = `mailto:${REQUEST_EMAIL}?subject=${subject}&body=${body}`;
      finishSubmission("email", !!prescriptionFile);
    }, 700);
  };

  const finishSubmission = (channel: "whatsapp" | "email", hasFile: boolean) => {
    setSubmitting(null);
    setSubmitted(true);
    toast({
      title: "Request ready to send!",
      description:
        channel === "whatsapp"
          ? hasFile
            ? "WhatsApp has opened with your request. Please attach the prescription photo before sending."
            : "WhatsApp has opened with your request pre-filled. Just hit send."
          : hasFile
          ? "Your email app has opened with the request. Please attach the prescription file before sending."
          : "Your email app has opened with the request pre-filled. Just hit send.",
    });
    window.setTimeout(() => {
      setSubmitted(false);
      form.reset();
      setPrescriptionFile(null);
    }, 3500);
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
                  Request Ready!
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  We've prepared your message. Complete sending it in the app that just opened and we'll get back to you shortly.
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

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={form.handleSubmit(submitViaWhatsApp, onInvalid)}
                        data-testid="button-request-whatsapp"
                        className="relative overflow-hidden flex items-center justify-center gap-2 flex-1 px-6 py-3.5 bg-[#25D366] text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:bg-[#22c35e] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {submitting === "whatsapp" ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <MessageCircle size={18} />
                        )}
                        Request via WhatsApp
                      </button>
                      <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={form.handleSubmit(submitViaEmail, onInvalid)}
                        data-testid="button-request-email"
                        className="relative overflow-hidden flex items-center justify-center gap-2 flex-1 px-6 py-3.5 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {submitting === "email" ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Mail size={18} />
                        )}
                        Request via Email
                      </button>
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
