// CheckoutPage — Multi-step checkout flow.
// Steps: 1. Address  →  2. Payment  →  3. Review & Confirm
//
// On confirmation:
//   • Writes to Firestore `orders` collection
//   • Queues notification placeholders
//   • Clears cart
//   • Navigates to /order-confirmation/:docId

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CreditCard, ClipboardCheck, Check, AlertCircle, Loader2, ShoppingCart, ArrowLeft, FileText } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useAddresses } from "@/hooks/useAddresses";
import AddressList from "@/components/customer/AddressList";
import AddressForm from "@/components/customer/AddressForm";
import PaymentSelector from "@/components/customer/PaymentSelector";
import PrescriptionUpload from "@/components/customer/PrescriptionUpload";
import { createOrder, generateNewOrderId, type OrderAddress } from "@/lib/orderService";
import { queueNotification } from "@/lib/notificationService";
import type { PaymentMethod } from "@/lib/orderService";
import type { CustomerAddress } from "@/lib/addressService";
import SignInModal from "@/components/customer/SignInModal";

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = "address" | "payment" | "review";

const STEPS: { id: Step; label: string; icon: typeof MapPin }[] = [
  { id: "address",  label: "Address",  icon: MapPin },
  { id: "payment",  label: "Payment",  icon: CreditCard },
  { id: "review",   label: "Review",   icon: ClipboardCheck },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, summary, clearCart } = useCart();
  const { user } = useCustomerAuth();
  const { addresses, loading: loadingAddresses } = useAddresses();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<Step>("address");
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [upiTxnId, setUpiTxnId] = useState("");
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  // Stable orderId placeholder for the PrescriptionUpload path (temp id before Firestore).
  // Stored in state so it stays constant across re-renders.
  const [tempOrderId] = useState(() => `temp-${user?.uid?.slice(-6) ?? "guest"}-${Date.now()}`);

  // Redirect if cart empty
  if (items.length === 0 && !placing) {
    navigate("/cart");
    return null;
  }

  // Prompt login if needed
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

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);
  const prescriptionRequired = summary.requiresPrescription;
  const prescriptionReady = !prescriptionRequired || !!prescriptionUrl;

  const handleAddressSelect = (addr: CustomerAddress) => {
    setSelectedAddress(addr);
  };

  const handleAddressAdded = (_addressId: string) => {
    setShowAddressForm(false);
  };

  const handleAddressContinue = () => {
    if (!selectedAddress) {
      setError("Please select or add a delivery address.");
      return;
    }
    setError(null);
    setStep("payment");
  };

  const handlePaymentContinue = () => {
    if (!paymentMethod) {
      setError("Please select a payment method.");
      return;
    }
    if (paymentMethod === "upi" && !upiTxnId.trim()) {
      setError("Please enter the UPI transaction ID / UTR.");
      return;
    }
    if (prescriptionRequired && !prescriptionUrl) {
      setError("Please upload your prescription to continue. It is required for one or more medicines in your cart.");
      return;
    }
    setError(null);
    setStep("review");
  };

  const handlePlaceOrder = async () => {
    if (!user || !selectedAddress || !paymentMethod) return;
    if (prescriptionRequired && !prescriptionUrl) {
      setError("Please upload your prescription before placing the order.");
      return;
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
          method: paymentMethod,
          status: "pending",
          upiTransactionId: paymentMethod === "upi" ? upiTxnId.trim() : null,
        },
        prescription: {
          required: prescriptionRequired,
          url: prescriptionUrl,
          verified: false,
        },
        delivery: {
          status: "not-assigned",
        },
        status: "pending",
        source: "website",
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
    } catch (err) {
      console.error("Place order error:", err);
      setError("Failed to place order. Please try again.");
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back link */}
        <button
          onClick={() => navigate("/cart")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Cart
        </button>

        {/* Step progress */}
        <div className="flex items-center mb-8 gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < currentStepIndex;
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

          {/* Main content */}
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
                      <AddressForm
                        onSuccess={handleAddressAdded}
                        onCancel={() => setShowAddressForm(false)}
                      />
                    ) : (
                      <AddressList
                        addresses={addresses}
                        selectedId={selectedAddress?.id}
                        onSelect={handleAddressSelect}
                        showControls={false}
                      />
                    )}
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button
                    onClick={handleAddressContinue}
                    disabled={!selectedAddress}
                    className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm
                               hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Continue to Payment
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Payment ── */}
              {step === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-5">
                  <div className="p-5 rounded-2xl border border-border bg-card">
                    <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                      <CreditCard size={16} className="text-primary" /> Payment Method
                    </h2>
                    <PaymentSelector
                      selected={paymentMethod}
                      onChange={setPaymentMethod}
                      upiTransactionId={upiTxnId}
                      onUpiTransactionIdChange={setUpiTxnId}
                      grandTotal={summary.grandTotal}
                    />
                  </div>

                  {/* Prescription upload — mandatory when any cart item requires Rx */}
                  {prescriptionRequired && (
                    <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
                      <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                        <FileText size={14} className="text-amber-600" /> Prescription Required
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                          MANDATORY
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        One or more items in your cart require a valid prescription from a licensed doctor. Please upload it to proceed.
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
                      className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold
                                 text-foreground hover:bg-muted/40 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePaymentContinue}
                      disabled={prescriptionRequired && !prescriptionUrl}
                      className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm
                                 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {prescriptionRequired && !prescriptionUrl
                        ? "Upload Prescription to Continue"
                        : "Review Order"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Review ── */}
              {step === "review" && (
                <motion.div key="review" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
                  {/* Address summary */}
                  <div className="p-4 rounded-2xl border border-border bg-card">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Delivery To</p>
                    {selectedAddress && (
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedAddress.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[selectedAddress.houseNumber, selectedAddress.buildingName, selectedAddress.street, selectedAddress.area, selectedAddress.city, selectedAddress.pincode].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{selectedAddress.mobileNumber}</p>
                      </div>
                    )}
                  </div>

                  {/* Payment summary */}
                  <div className="p-4 rounded-2xl border border-border bg-card">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Payment</p>
                    <p className="text-sm font-semibold text-foreground">
                      {paymentMethod === "upi" ? "UPI" : paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod}
                    </p>
                    {paymentMethod === "upi" && upiTxnId && (
                      <p className="text-xs text-muted-foreground mt-0.5">Transaction ID: {upiTxnId}</p>
                    )}
                  </div>

                  {/* Prescription confirmation */}
                  {prescriptionRequired && prescriptionUrl && (
                    <div className="p-4 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Prescription</p>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                        <Check size={14} /> Uploaded — pending pharmacist review
                      </p>
                    </div>
                  )}

                  {/* Items */}
                  <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Items ({items.length})</p>
                    {items.map((item) => (
                      <div key={item.medicineId} className="flex justify-between items-center text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground line-clamp-1">{item.medicineName} <span className="text-muted-foreground">×{item.quantity}</span></span>
                          {item.prescriptionRequired && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Rx Required</span>
                          )}
                        </div>
                        <span className="font-semibold text-foreground ml-2">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStep("payment"); setError(null); }}
                      className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold
                                 text-foreground hover:bg-muted/40 transition-colors"
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
                      {placing ? <Loader2 size={16} className="animate-spin" /> : null}
                      {placing ? "Placing Order…" : "Place Order"}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="p-4 rounded-2xl border border-border bg-card sticky top-28">
              <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <ShoppingCart size={14} className="text-primary" /> Order Summary
              </p>
              <div className="space-y-2 text-sm mb-3">
                {items.slice(0, 3).map((item) => (
                  <div key={item.medicineId} className="flex justify-between">
                    <span className="text-muted-foreground line-clamp-1 flex-1">{item.medicineName} ×{item.quantity}</span>
                    <span className="text-foreground ml-2 font-medium">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{items.length - 3} more items</p>
                )}
              </div>
              <div className="border-t border-border pt-3 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{summary.subtotal.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span className={summary.deliveryCharge === 0 ? "text-green-600" : ""}>{summary.deliveryCharge === 0 ? "FREE" : `₹${summary.deliveryCharge}`}</span></div>
                <div className="flex justify-between"><span>GST</span><span>₹{summary.gst}</span></div>
                {summary.discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>−₹{summary.discount}</span></div>}
              </div>
              <div className="flex justify-between font-bold text-foreground text-base mt-3 pt-3 border-t border-border">
                <span>Total</span>
                <span>₹{summary.grandTotal.toLocaleString("en-IN")}</span>
              </div>
              {prescriptionRequired && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <FileText size={11} /> Prescription required
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
