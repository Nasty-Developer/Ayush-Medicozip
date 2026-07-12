// CheckoutPage — Multi-step checkout flow.
// Steps: 1. Address  →  2. Payment  →  3. Review & Confirm
//
// Payment is exclusively via Razorpay Secure Checkout.
// No COD, no manual UPI, no wallet — one click opens the Razorpay modal.

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, CreditCard, ClipboardCheck, Check, AlertCircle,
  Loader2, ShoppingCart, ArrowLeft, FileText, Lock, Shield,
  Smartphone, Building2, Wallet, ChevronRight,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useAddresses } from "@/hooks/useAddresses";
import AddressList from "@/components/customer/AddressList";
import AddressForm from "@/components/customer/AddressForm";
import PrescriptionUpload from "@/components/customer/PrescriptionUpload";
import { createOrder, generateNewOrderId, type OrderAddress } from "@/lib/orderService";
import { queueNotification } from "@/lib/notificationService";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  reportRazorpayFailure,
} from "@/lib/paymentService";
import { loadRazorpayScript, normalizePhone, type RazorpaySuccessResponse } from "@/lib/razorpayCheckout";
import type { CustomerAddress } from "@/lib/addressService";
import SignInModal from "@/components/customer/SignInModal";

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = "address" | "payment" | "review";

const STEPS: { id: Step; label: string; icon: typeof MapPin }[] = [
  { id: "address", label: "Address", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review",  label: "Review",  icon: ClipboardCheck },
];

// Supported payment modes shown inside the info card
const PAYMENT_MODES = [
  { icon: Smartphone,  label: "UPI",          detail: "GPay, PhonePe, Paytm, BHIM & more" },
  { icon: CreditCard,  label: "Cards",         detail: "Credit & Debit (Visa, Mastercard, RuPay)" },
  { icon: Building2,   label: "Net Banking",   detail: "All major Indian banks" },
  { icon: Wallet,      label: "Wallets & EMI", detail: "Paytm, Mobikwik, No-cost EMI options" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, summary, clearCart } = useCart();
  const { user } = useCustomerAuth();
  const { addresses, loading: loadingAddresses } = useAddresses();
  const [, navigate] = useLocation();

  const [step, setStep]                   = useState<Step>("address");
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
  const [placing, setPlacing]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [showSignIn, setShowSignIn]       = useState(false);

  const [tempOrderId] = useState(
    () => `temp-${user?.uid?.slice(-6) ?? "guest"}-${Date.now()}`
  );

  if (items.length === 0 && !placing) {
    navigate("/cart");
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-20 flex flex-col items-center justify-center gap-5 px-4">
        <AlertCircle size={40} className="text-amber-500" />
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Sign in to continue</p>
          <p className="text-muted-foreground mt-1">You need to be signed in to place an order.</p>
        </div>
        <button
          onClick={() => setShowSignIn(true)}
          className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
        >
          Sign In
        </button>
        {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      </div>
    );
  }

  const currentStepIndex   = STEPS.findIndex((s) => s.id === step);
  const prescriptionRequired = summary.requiresPrescription;
  const prescriptionReady  = !prescriptionRequired || !!prescriptionUrl;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddressContinue = () => {
    if (!selectedAddress) { setError("Please select or add a delivery address."); return; }
    setError(null);
    setStep("payment");
  };

  const handlePaymentContinue = () => {
    if (prescriptionRequired && !prescriptionUrl) {
      setError("Please upload your prescription before continuing."); return;
    }
    setError(null);
    setStep("review");
  };

  const handlePlaceOrder = async () => {
    if (!user || !selectedAddress) return;
    if (prescriptionRequired && !prescriptionUrl) {
      setError("Please upload your prescription before placing the order."); return;
    }
    setPlacing(true);
    setError(null);

    try {
      const orderId = await generateNewOrderId();
      const addr: OrderAddress = {
        fullName: selectedAddress.fullName,
        mobileNumber: selectedAddress.mobileNumber,
        alternateNumber: selectedAddress.alternateNumber,
        houseNumber: selectedAddress.houseNumber,
        buildingName: selectedAddress.buildingName,
        street: selectedAddress.street,
        area: selectedAddress.area,
        landmark: selectedAddress.landmark,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        addressType: selectedAddress.addressType,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
      };

      // Create order in DB first — payment-pending so the customer can retry
      // if they close the Razorpay modal before completing payment.
      const docId = await createOrder({
        orderId,
        customerId: user.uid,
        customerName: user.displayName ?? user.email ?? "Customer",
        customerEmail: user.email,
        customerPhone: selectedAddress.mobileNumber,
        address: addr,
        items: items.map((i) => ({
          medicineId: i.medicineId,
          medicineName: i.medicineName,
          categoryName: i.categoryName,
          brandName: i.brandName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.unitPrice * i.quantity,
          prescriptionRequired: i.prescriptionRequired,
        })),
        pricing: {
          subtotal: summary.subtotal,
          deliveryCharge: summary.deliveryCharge,
          gst: summary.gst,
          discount: summary.discount,
          grandTotal: summary.grandTotal,
          couponCode: summary.couponCode,
        },
        payment: {
          method: "razorpay",
          status: "pending",
          upiTransactionId: null,
        },
        prescription: {
          required: prescriptionRequired,
          url: prescriptionUrl,
          verified: false,
        },
        delivery: { status: "not-assigned" },
        status: "payment-pending",
        source: "website",
      });

      // ── Open Razorpay Checkout ────────────────────────────────────────────
      let rzpData: Awaited<ReturnType<typeof createRazorpayOrder>>;
      try {
        rzpData = await createRazorpayOrder({ orderDbId: docId });
      } catch {
        setError("Could not reach the payment gateway. Your order is saved — you can pay from My Orders.");
        setPlacing(false);
        return;
      }

      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: rzpData.keyId,
        amount: rzpData.amount,
        currency: rzpData.currency,
        order_id: rzpData.razorpayOrderId,
        name: "Ayush Medico",
        description: `Order ${orderId}`,
        prefill: {
          name: user.displayName ?? undefined,
          email: user.email ?? undefined,
          // Normalise to 10-digit Indian mobile — Razorpay uses this to detect
          // which UPI apps are installed on the customer's device.
          contact: normalizePhone(selectedAddress.mobileNumber),
        },
        theme: { color: "#2F8F6D" },

        // Keep all payment methods open — no `method` or `config.display.hide` set.
        // Cards, Net Banking, UPI Collect, UPI Intent, Wallets, EMI all visible.

        // Retry within modal: if a payment fails the customer stays inside the
        // Razorpay modal and can try a different method instead of being sent back
        // to the order page with a failed status.
        retry: { enabled: true, max_count: 4 },

        // Android: allow Razorpay to read the bank SMS OTP automatically.
        send_sms_hash: true,

        // Pharmacy app — don't save payment method for future checkouts.
        remember_customer: false,

        handler: async (response: RazorpaySuccessResponse) => {
          try {
            await verifyRazorpayPayment({
              orderDbId: docId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await queueNotification({
              orderId,
              orderDocId: docId,
              customerId: user.uid,
              customerName: user.displayName ?? "Customer",
              customerPhone: selectedAddress.mobileNumber,
              customerEmail: user.email,
              event: "order_placed",
              channels: ["whatsapp", "email"],
              metadata: { orderId, grandTotal: summary.grandTotal },
            });
            clearCart();
            navigate(`/order-confirmation/${docId}`);
          } catch {
            setError(
              "Payment received, but verification failed. Please contact us at +91 98332 73838 with your order ID."
            );
            setPlacing(false);
          }
        },

        modal: {
          ondismiss: async () => {
            // Customer closed the modal — mark as failed and let them retry
            // from the Order Detail page ("Pay Now" button).
            try { await reportRazorpayFailure(docId); } catch { /* non-critical */ }
            navigate(`/order/${docId}`);
            setPlacing(false);
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error("Place order error:", err);
      setError("Failed to place order. Please try again.");
      setPlacing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back */}
        <button
          onClick={() => navigate("/cart")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Cart
        </button>

        {/* Step progress */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done   = i < currentStepIndex;
            const active = s.id === step;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                                ${done ? "bg-primary border-primary" : active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {done ? <Check size={16} className="text-white" /> : <Icon size={16} />}
                  </div>
                  <p className={`text-[11px] font-semibold mt-1 ${active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-5 mx-1 transition-colors ${i < currentStepIndex ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Main content ── */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">

              {/* ── Step 1: Address ── */}
              {step === "address" && (
                <motion.div key="address" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-5">
                  <div className="p-5 rounded-2xl border border-border bg-card">
                    <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                      <MapPin size={16} className="text-primary" /> Delivery Address
                    </h2>
                    {loadingAddresses ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-primary" />
                      </div>
                    ) : showAddressForm ? (
                      <AddressForm onSuccess={() => setShowAddressForm(false)} onCancel={() => setShowAddressForm(false)} />
                    ) : (
                      <AddressList
                        addresses={addresses}
                        selectedId={selectedAddress?.id}
                        onSelect={setSelectedAddress}
                        showControls={false}
                      />
                    )}
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button
                    onClick={handleAddressContinue}
                    disabled={!selectedAddress}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm
                               hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Continue <ChevronRight size={15} />
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Payment ── */}
              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-5">

                  {/* Razorpay info card */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 border-b border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Lock size={15} className="text-primary" />
                            Secure Online Payment
                          </h2>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Powered by Razorpay Secure Checkout
                          </p>
                        </div>
                        {/* Razorpay wordmark badge */}
                        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#072654]/5 border border-[#072654]/10">
                          <Shield size={11} className="text-[#3395FF]" />
                          <span className="text-[11px] font-bold text-[#072654] dark:text-[#3395FF] tracking-tight">razorpay</span>
                        </div>
                      </div>
                    </div>

                    {/* Supported payment modes */}
                    <div className="px-5 py-4">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        All payment modes supported
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {PAYMENT_MODES.map(({ icon: Icon, label, detail }) => (
                          <div
                            key={label}
                            className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60"
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Icon size={13} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-[12px] font-semibold text-foreground">{label}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Security notice */}
                    <div className="mx-5 mb-5 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-2">
                        <Shield size={13} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-green-700 dark:text-green-400 leading-relaxed">
                          Your payment information is encrypted with 256-bit SSL. We never store your card details.
                          Razorpay is PCI-DSS Level 1 certified.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prescription upload (if required) */}
                  {prescriptionRequired && (
                    <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
                      <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                        <FileText size={14} className="text-amber-600" />
                        Prescription Required
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                          MANDATORY
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        One or more items require a valid prescription. Please upload it to proceed.
                      </p>
                      <PrescriptionUpload
                        userId={user.uid}
                        orderId={tempOrderId}
                        onUploadComplete={(url) => setPrescriptionUrl(url)}
                        onClear={() => setPrescriptionUrl(null)}
                        uploadedUrl={prescriptionUrl}
                      />
                    </div>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStep("address"); setError(null); }}
                      className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePaymentContinue}
                      disabled={prescriptionRequired && !prescriptionUrl}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm
                                 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {prescriptionRequired && !prescriptionUrl
                        ? "Upload Prescription to Continue"
                        : <>Review Order <ChevronRight size={15} /></>}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Review ── */}
              {step === "review" && (
                <motion.div key="review" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">

                  {/* Delivery address summary */}
                  <div className="p-4 rounded-2xl border border-border bg-card">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Delivering To</p>
                    {selectedAddress && (
                      <>
                        <p className="text-sm font-semibold text-foreground">{selectedAddress.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[selectedAddress.houseNumber, selectedAddress.buildingName, selectedAddress.street,
                            selectedAddress.area, selectedAddress.city, selectedAddress.pincode].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{selectedAddress.mobileNumber}</p>
                      </>
                    )}
                  </div>

                  {/* Payment summary */}
                  <div className="p-4 rounded-2xl border border-border bg-card">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Payment</p>
                    <div className="flex items-center gap-2">
                      <Lock size={12} className="text-green-600 dark:text-green-400" />
                      <p className="text-sm font-semibold text-foreground">Razorpay Secure Checkout</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      UPI · Cards · Net Banking · Wallets · EMI
                    </p>
                  </div>

                  {/* Prescription status */}
                  {prescriptionRequired && prescriptionUrl && (
                    <div className="p-4 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Prescription</p>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                        <Check size={14} /> Uploaded — pending pharmacist review
                      </p>
                    </div>
                  )}

                  {/* Items list */}
                  <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Items ({items.length})
                    </p>
                    {items.map((item) => (
                      <div key={item.medicineId} className="flex justify-between items-center text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground line-clamp-1">
                            {item.medicineName} <span className="text-muted-foreground">×{item.quantity}</span>
                          </span>
                          {item.prescriptionRequired && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Rx Required</span>
                          )}
                        </div>
                        <span className="font-semibold text-foreground ml-2">
                          ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStep("payment"); setError(null); }}
                      className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={placing || !prescriptionReady}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl
                                 bg-primary text-white font-bold text-sm hover:bg-primary/90
                                 disabled:opacity-60 transition-colors shadow-lg shadow-primary/20"
                    >
                      {placing
                        ? <><Loader2 size={15} className="animate-spin" /> Opening Razorpay…</>
                        : <><Lock size={14} /> Proceed to Pay ₹{summary.grandTotal.toLocaleString("en-IN")}</>}
                    </button>
                  </div>

                  {/* Trust footer */}
                  {!placing && (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Shield size={11} className="text-muted-foreground/60" />
                      <p className="text-[10px] text-muted-foreground/60">
                        Secured by Razorpay · 256-bit SSL · PCI-DSS Compliant
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Order summary sidebar ── */}
          <div className="lg:col-span-1">
            <div className="p-4 rounded-2xl border border-border bg-card sticky top-28">
              <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <ShoppingCart size={14} className="text-primary" /> Order Summary
              </p>
              <div className="space-y-2 text-sm mb-3">
                {items.slice(0, 3).map((item) => (
                  <div key={item.medicineId} className="flex justify-between">
                    <span className="text-muted-foreground line-clamp-1 flex-1">
                      {item.medicineName} ×{item.quantity}
                    </span>
                    <span className="text-foreground ml-2 font-medium">
                      ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{items.length - 3} more items</p>
                )}
              </div>
              <div className="border-t border-border pt-3 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{summary.subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className={summary.deliveryCharge === 0 ? "text-green-600 dark:text-green-400" : ""}>
                    {summary.deliveryCharge === 0 ? "FREE" : `₹${summary.deliveryCharge}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST</span>
                  <span>₹{summary.gst}</span>
                </div>
                {summary.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span><span>−₹{summary.discount}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-bold text-foreground text-base mt-3 pt-3 border-t border-border">
                <span>Total</span>
                <span>₹{summary.grandTotal.toLocaleString("en-IN")}</span>
              </div>
              {prescriptionRequired && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <FileText size={11} /> Prescription required for some items
                  </p>
                </div>
              )}
              {/* Razorpay trust badge */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-1.5">
                <Shield size={10} className="text-[#3395FF]" />
                <span className="text-[10px] text-muted-foreground">Secured by </span>
                <span className="text-[10px] font-bold text-[#072654] dark:text-[#3395FF]">razorpay</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
