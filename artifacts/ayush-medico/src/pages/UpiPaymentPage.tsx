import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { subscribeToOrder, type Order } from "@/lib/orderService";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import UpiPaymentPanel from "@/components/customer/UpiPaymentPanel";

export default function UpiPaymentPage() {
  const [matched, params] = useRoute("/payment/:docId");
  const [, navigate] = useLocation();
  const { user } = useCustomerAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const docId = params?.docId ?? "";

  useEffect(() => {
    if (!docId) return;
    return subscribeToOrder(docId, (next) => {
      setOrder(next);
      setLoading(false);
    }, () => setLoading(false));
  }, [docId]);

  if (!matched || !docId) return null;
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24">
        <div className="text-center">
          <AlertCircle size={34} className="mx-auto text-amber-500 mb-3" />
          <p className="font-semibold text-foreground">Sign in to view this payment</p>
        </div>
      </div>
    );
  }
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><Loader2 size={30} className="animate-spin text-primary" /></div>;
  }
  if (!order || order.customerId !== user.uid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 pt-20 text-center">
        <AlertCircle size={34} className="text-destructive/60" />
        <p className="font-semibold text-foreground">Order not found</p>
        <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">Go home</button>
      </div>
    );
  }

  const paid = ["paid", "verified", "completed"].includes(order.payment.status);
  const canPay = order.payment.method === "upi" &&
    !paid &&
    order.status === "payment-pending" &&
    order.pricing.grandTotal != null;

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <button onClick={() => navigate(`/order/${docId}`)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft size={15} /> Back to order
        </button>
        <div className="mb-6">
          <p className="text-xs text-muted-foreground">Order ID</p>
          <h1 className="text-xl font-bold font-mono text-foreground">{order.orderId}</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete payment securely using UPI</p>
        </div>
        {canPay ? (
          <UpiPaymentPanel
            orderDbId={order.id}
            orderId={order.orderId}
            amount={order.pricing.grandTotal}
            paymentStatus={order.payment.status}
            onSubmitted={() => {
              navigate(`/order-confirmation/${order.id}`);
            }}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-lg font-bold text-foreground">
              {paid
                ? "Payment verified"
                : order.status === "pending"
                ? "Order received — under review"
                : order.status === "payment-verification-pending"
                ? "Payment verification pending"
                : "Payment is not available yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {order.status === "pending"
                ? "Payment will appear here after prescription review and delivery-charge entry."
                : "You can view the latest status on your order page."}
            </p>
            <button onClick={() => navigate(`/order/${docId}`)} className="mt-5 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">View Order</button>
          </div>
        )}
      </div>
    </div>
  );
}