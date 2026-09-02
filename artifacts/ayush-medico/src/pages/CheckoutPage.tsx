// CheckoutPage — address, prescription, then order review.
// Payment is requested only after the pharmacy reviews the order.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, ClipboardCheck, Check, AlertCircle,
  Loader2, ShoppingCart, ArrowLeft, FileText, Lock, Shield,
  ChevronRight,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useAddresses } from "@/hooks/useAddresses";
import AddressList from "@/components/customer/AddressList";
import PrescriptionUpload from "@/components/customer/PrescriptionUpload";
import { createOrder, generateNewOrderId, getOrderById, type OrderAddress } from "@/lib/orderService";
import { queueNotification } from "@/lib/notificationService";
import type { CustomerAddress } from "@/lib/addressService";
import SignInModal from "@/components/customer/SignInModal";

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = "address" | "payment" | "review";

const STEPS: { id: Step; label: string; icon: typeof MapPin }[] = [
  { id: "address", label: "Address", icon: MapPin },
  { id: "payment", label: "Prescription", icon: FileText },
  { id: "review",  label: "Review",  icon: ClipboardCheck },
];

function cartFingerprint(items: { medicineId: string; quantity: number; unitPrice: number }[]) {
  return [...items]
    .sort((a, b) => a.medicineId.localeCompare(b.medicineId))
    .map((item) => `${item.medicineId}:${item.quantity}:${item.unitPrice.toFixed(2)}`)
    .join("|");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, summary, clearCart } = useCart();
  const { user, loading: loadingAuth } = useCustomerAuth();
  const {
    addresses,
    loading: loadingAddresses,
    error: addressesError,
    retry: retryAddresses,
  } = useAddresses();
  const [, navigate] = useLocation();

  const [step, setStep]                   = useState<Step>("address");
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
  const [placing, setPlacing]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [showSignIn, setShowSignIn]       = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // A saved default address should be ready to use as soon as checkout opens.
  // Without this, customers with an address could see a permanently disabled
  // Continue button until they happened to click the card manually.
  useEffect(() => {
    if (!user || loadingAddresses) return;
    setSelectedAddress((current) => {
      if (current && addresses.some((address) => address.id === current.id)) {
        return current;
      }
      return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
    });
  }, [user?.uid, addresses, loadingAddresses]);

  const [tempOrderId] = useState(
    () => `temp-${user?.uid?.slice(-6) ?? "guest"}-${Date.now()}`
  );

  if (items.length === 0 && !placing) {
    return (
      <div className="min-h-screen pt-28 pb-20 flex flex-col items-center justify-center gap-5 px-4">
        <ShoppingCart size={40} className="text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Your cart is empty</p>
          <p className="text-muted-foreground mt-1">
            Add a medicine before starting checkout.
          </p>
        </div>
        <button
          onClick={() => navigate("/cart")}
          className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
        >
          Back to Cart
        </button>
      </div>
    );
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen pt-28 pb-20 flex flex-col items-center justify-center gap-3 px-4">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking your sign-in…</p>
      </div>
    );
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
      const draftKey = `ayush-medico-order-draft:${user.uid}`;
      let orderId = "";
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) ?? "null") as
          { orderId?: string; cartFingerprint?: string } | null;
        if (draft?.orderId && draft.cartFingerprint === cartFingerprint(items)) {
          orderId = draft.orderId;
        }
      } catch {
        localStorage.removeItem(draftKey);
      }
      if (!orderId) {
        orderId = await generateNewOrderId();
        localStorage.setItem(
          draftKey,
          JSON.stringify({ orderId, cartFingerprint: cartFingerprint(items) }),
        );
      }
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

      // Create a pending order for pharmacy review. Delivery and final payable
      // total are server-owned and intentionally unset at this stage.
      let orderInput = {
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
          deliveryCharge: null,
          gst: summary.gst,
          discount: summary.discount,
          grandTotal: null,
          couponCode: summary.couponCode,
        },
        payment: {
          method: "upi" as const,
          status: "pending" as const,
          upiTransactionId: null,
        },
        prescription: {
          required: prescriptionRequired,
          url: prescriptionUrl,
          verified: false,
          status: prescriptionRequired ? "pending" as const : "not-required" as const,
        },
        delivery: { status: "not-assigned" as const },
        status: "pending" as const,
        source: "website" as const,
      };
      let docId: string;
      try {
        docId = await createOrder(orderInput);
      } catch (err) {
        if (!(err instanceof Error) || !err.message.toLowerCase().includes("already exists")) throw err;
        // A lost response can make a successfully-created order look like a
        // failed request. Reuse the same order ID and recover the existing
        // order instead of consuming stock a second time.
        const existing = await getOrderById(orderId);
        if (existing?.customerId === user.uid) {
          docId = existing.id;
        } else {
          orderId = await generateNewOrderId();
          orderInput = { ...orderInput, orderId };
          localStorage.setItem(
            draftKey,
            JSON.stringify({ orderId, cartFingerprint: cartFingerprint(items) }),
          );
          docId = await createOrder(orderInput);
        }
      }

      localStorage.removeItem(draftKey);
      try {
        await queueNotification({
          orderId,
          orderDocId: docId,
          customerId: user.uid,
          customerName: user.displayName ?? "Customer",
          customerPhone: selectedAddress.mobileNumber,
          customerEmail: user.email,
          event: "order_placed",
          channels: ["whatsapp", "email"],
          metadata: { orderId, grandTotal: null },
        });
      } catch (notificationError) {
        // Notification delivery is secondary to placing the order. Never tell
        // a customer to retry a successful order just because a message queue
        // is temporarily unavailable.
        console.warn("Order notification could not be queued:", notificationError);
      }
      clearCart();
      navigate(`/order/${docId}`);
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
                    ) : addressesError ? (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                        <p>Could not load saved addresses.</p>
                        <button
                          type="button"
                          onClick={retryAddresses}
                          className="mt-3 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 transition-colors"
                        >
                          Try again
                        </button>
                      </div>
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

              {/* ── Step 2: Prescription ── */}
              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-5">
                  <div className="p-5 rounded-2xl border border-border bg-card">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary/10 p-2.5">
                        <FileText size={18} className="text-primary" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-foreground">Prescription review</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload a prescription when required. Our pharmacist will review it after you submit the order.
                        </p>
                      </div>
                    </div>
                  </div>
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

                  {!prescriptionRequired && (
                    <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                      No prescription is needed for the items in this order.
                    </div>
                  )}

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
                       <Lock size={12} className="text-primary" />
                        <p className="text-sm font-semibold text-foreground">UPI payment after review</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                         The pharmacy will review your order, approve any prescription, add delivery charges, and then send the UPI payment request.
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

                  {/* Legal consent checkbox — mandatory before placing order */}
                  <div className={`p-4 rounded-2xl border transition-colors ${termsAccepted ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-primary flex-shrink-0"
                      />
                      <span className="text-xs text-foreground leading-relaxed">
                        I have read and agree to the{" "}
                        <a href="/privacy-policy" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">Privacy Policy</a>,{" "}
                        <a href="/terms-conditions" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">Terms &amp; Conditions</a>,{" "}
                        <a href="/shipping-policy" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">Shipping Policy</a>,{" "}
                        <a href="/refund-policy" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">Refund Policy</a> and{" "}
                        <a href="/prescription-policy" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">Prescription Policy</a>.
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStep("payment"); setError(null); }}
                      className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={placing || !prescriptionReady || !termsAccepted}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl
                                 bg-primary text-white font-bold text-sm hover:bg-primary/90
                                 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
                    >
                         {placing
                         ? <><Loader2 size={15} className="animate-spin" /> Creating your order…</>
                         : <><Lock size={14} /> Submit for pharmacy review</>}
                    </button>
                  </div>

                  {/* Trust footer */}
                  {!placing && (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Shield size={11} className="text-muted-foreground/60" />
                      <p className="text-[10px] text-muted-foreground/60">
                          Your order is saved securely before payment is requested
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
                  <span className="text-amber-600 dark:text-amber-400">Added after review</span>
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
                <span className="text-amber-600 dark:text-amber-400">Pending review</span>
              </div>
              {prescriptionRequired && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <FileText size={11} /> Prescription required for some items
                  </p>
                </div>
              )}
               {/* Payment trust badge */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-1.5">
                 <Shield size={10} className="text-primary" />
                 <span className="text-[10px] text-muted-foreground">Secure manual UPI verification</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
