/**
 * Razorpay Checkout utility — TEST MODE
 *
 * Loads the Razorpay checkout.js script on demand (not at startup) and
 * exposes a typed wrapper around the `Razorpay` global constructor.
 *
 * Usage:
 *   await loadRazorpayScript();
 *   const rzp = new window.Razorpay({ ... });
 *   rzp.open();
 *
 * Security: the Key ID is safe to expose in the browser (it is like Stripe's
 * publishable key). The Key Secret NEVER leaves the backend.
 */

export type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
    escape?: boolean;
  };
};

export type RazorpayInstance = {
  open(): void;
  on(event: string, callback: () => void): void;
};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

let _scriptPromise: Promise<void> | null = null;

/** Loads Razorpay checkout.js once and reuses the same promise on subsequent calls. */
export function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve(); // already loaded
  if (_scriptPromise) return _scriptPromise;

  _scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay checkout.js failed to load. Check network."));
    document.head.appendChild(script);
  });

  return _scriptPromise;
}

/** Opens a Razorpay checkout modal. Loads the script first if needed. */
export async function openRazorpayCheckout(options: RazorpayOptions): Promise<RazorpayInstance> {
  await loadRazorpayScript();
  const rzp = new window.Razorpay(options);
  rzp.open();
  return rzp;
}
