/**
 * Razorpay Standard Checkout — typed wrapper + script loader.
 *
 * Security: the Key ID is safe in the browser (like Stripe's publishable key).
 * The Key Secret NEVER leaves the backend.
 *
 * Payment method availability:
 *   • Desktop:  Cards, Net Banking, Wallets, UPI Collect (VPA entry)
 *   • Android:  All of the above + UPI Intent (GPay, PhonePe, Paytm, etc.)
 *   • iOS:      Cards, Net Banking, Wallets, UPI Collect (no UPI Intent on iOS)
 *
 * Test Mode behaviour:
 *   • UPI Collect: use "success@razorpay" or "failure@razorpay" as VPA
 *   • UPI Intent:  shows a single "Test UPI App" — real apps only appear with live keys
 *   • Cards:       use Razorpay test card numbers (4111 1111 1111 1111, CVV 123)
 */

// ─── Response type ─────────────────────────────────────────────────────────────

export type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

// ─── Full options type ─────────────────────────────────────────────────────────
// Based on Razorpay Standard Checkout API reference.
// Omitting undocumented / deprecated options intentionally.

export type RazorpayOptions = {
  /** Test key: rzp_test_... | Live key: rzp_live_... */
  key: string;
  /** Amount in the smallest currency unit (paise for INR). */
  amount: number;
  currency: string;
  /** Razorpay order ID (from /api/payment/create-razorpay-order). */
  order_id: string;
  /** Business/merchant name shown in the checkout header. */
  name: string;
  description?: string;
  /** URL to your logo shown in the checkout header. */
  image?: string;

  /** Pre-fill customer details so they don't have to type them. */
  prefill?: {
    /** Customer name */
    name?: string;
    /** Customer email */
    email?: string;
    /**
     * Customer mobile number — 10 digits (Indian) or E.164 (+91XXXXXXXXXX).
     * Used by Razorpay to detect which UPI apps are linked to this number.
     * Use normalizePhone() before passing here.
     */
    contact?: string;
    /** Pre-select UPI method and prefill VPA */
    vpa?: string;
    /** Pre-select payment method: 'card' | 'netbanking' | 'wallet' | 'upi' | 'emi' */
    method?: "card" | "netbanking" | "wallet" | "upi" | "emi";
  };

  /**
   * Explicitly enable or disable payment methods.
   * Omit entirely (or set all to true) to allow all methods — which is what we want.
   * Only set to false if you need to restrict a specific method.
   */
  method?: {
    netbanking?: boolean;
    card?: boolean;
    upi?: boolean;
    wallet?: boolean;
    emi?: boolean;
    paylater?: boolean;
  };

  /**
   * Display configuration — controls which payment method blocks appear and in what order.
   * Omit entirely to show all blocks in Razorpay's default order.
   */
  config?: {
    display?: {
      /**
       * Hide specific payment methods from the checkout.
       * Example: [{ method: 'emi' }] hides the EMI block.
       * We deliberately do NOT use this so all methods remain visible.
       */
      hide?: Array<{ method: string }>;
      /** Custom block ordering. Omit to use Razorpay defaults. */
      blocks?: Record<string, unknown>;
      preferences?: {
        /** Set to true to show all default payment method blocks. */
        show_default_blocks?: boolean;
      };
    };
  };

  notes?: Record<string, string>;
  theme?: {
    /** Primary colour of the checkout modal (hex). */
    color?: string;
    /** Background colour of the checkout modal (hex). */
    backdrop_color?: string;
    /** Hide Razorpay branding. Requires Business plan. */
    hide_topbar?: boolean;
  };

  /**
   * Called when payment succeeds.
   * Verify the signature on your backend before marking the order as paid.
   */
  handler: (response: RazorpaySuccessResponse) => void;

  modal?: {
    /** Called when the customer closes the modal WITHOUT completing payment. */
    ondismiss?: () => void;
    /** Show a confirmation dialog before closing. Default: false. */
    confirm_close?: boolean;
    /** Allow ESC key to close the modal. Default: true. */
    escape?: boolean;
    /**
     * Keep the modal animation smooth on slower devices by preventing backdrop blur.
     * Default: false.
     */
    animation?: boolean;
  };

  /**
   * Allow the customer to retry a failed payment inside the modal
   * instead of the modal closing on failure.
   *
   * IMPORTANT: with retry enabled, ondismiss is only called when the customer
   * explicitly closes the modal — NOT on payment failure. This is the
   * correct production behaviour.
   *
   * Default: enabled: false (Razorpay default closes modal on failure).
   */
  retry?: {
    enabled: boolean;
    /** Maximum number of retry attempts. Default: 4. */
    max_count?: number;
  };

  /**
   * Android only: allow Razorpay to read the bank SMS OTP and autofill it.
   * Requires the app to declare SMS_READ permission (web checkout handles this
   * automatically via the Razorpay Android SDK bridge).
   * Default: false.
   */
  send_sms_hash?: boolean;

  /**
   * Save and restore customer payment method for future checkouts.
   * Set false for privacy-sensitive apps (pharmacy, medical, etc.).
   */
  remember_customer?: boolean;

  /** Lock prefilled fields so the customer cannot edit them. */
  readonly?: {
    contact?: boolean;
    email?: boolean;
    name?: boolean;
  };
};

export type RazorpayInstance = {
  open(): void;
  on(event: string, callback: (data?: unknown) => void): void;
};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

// ─── Script loader ─────────────────────────────────────────────────────────────

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
let _scriptPromise: Promise<void> | null = null;

/**
 * Lazily loads Razorpay checkout.js from CDN.
 * Safe to call multiple times — always returns the same promise after the first call.
 */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window.Razorpay === "function") return Promise.resolve();
  if (_scriptPromise) return _scriptPromise;

  _scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      // Script tag exists but might still be loading
      if (typeof window.Razorpay === "function") { resolve(); return; }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error("Razorpay checkout.js failed to load. Check network connectivity."));
    document.head.appendChild(script);
  });

  return _scriptPromise;
}

// ─── Phone normalisation ───────────────────────────────────────────────────────

/**
 * Normalises an Indian mobile number to 10 digits.
 *
 * Razorpay uses the `contact` field for UPI Intent detection — it reads which
 * UPI apps are registered on the device for that number. A malformed number
 * silently breaks UPI prefill.
 *
 * Accepts: "9876543210" | "+919876543210" | "919876543210" | "09876543210"
 * Returns: "9876543210" (always 10 digits) or the original value if it can't be parsed.
 */
export function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0"))  return digits.slice(1);
  if (digits.length === 10) return digits;
  return phone; // unrecognised — return as-is, don't corrupt it
}

// ─── Convenience wrapper ───────────────────────────────────────────────────────

/** Opens a Razorpay checkout modal. Loads the script if not already loaded. */
export async function openRazorpayCheckout(options: RazorpayOptions): Promise<RazorpayInstance> {
  await loadRazorpayScript();
  const rzp = new window.Razorpay(options);
  rzp.open();
  return rzp;
}
