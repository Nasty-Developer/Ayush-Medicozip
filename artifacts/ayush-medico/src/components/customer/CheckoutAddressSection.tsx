import { useState } from "react";
import { Loader2 } from "lucide-react";
import AddressList from "@/components/customer/AddressList";
import SignInModal from "@/components/customer/SignInModal";
import { ApiResponseError } from "@/lib/apiAuth";
import type { CustomerAddress } from "@/lib/addressService";

type Props = {
  addresses: CustomerAddress[];
  selectedId?: string;
  onSelect: (address: CustomerAddress) => void;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
};

/**
 * True only for a transport-level failure: the browser never received an HTTP
 * response (offline, DNS, blocked request, CORS). Any ApiResponseError means the
 * API answered with a status, so the address service was reachable and must not
 * be described as unreachable.
 */
function isTransportError(error: Error): boolean {
  if (error instanceof ApiResponseError) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed")
  );
}

export function getAddressLoadMessage(error: Error): string {
  const message = error.message.toLowerCase();
  const status = error instanceof ApiResponseError ? error.status : undefined;
  const code = error instanceof ApiResponseError ? error.code : undefined;

  // ── The API answered: report what it said, not a connectivity problem ──
  if (code === "firebase_admin_not_configured" || message.includes("firebase is not configured")) {
    return "Secure sign-in is not available in this environment yet. You can still add an address, but contact support if saving it fails.";
  }
  if (
    status === 401 ||
    message.includes("not authenticated") ||
    message.includes("please sign in again") ||
    message.includes("token")
  ) {
    return "Your sign-in needs to be refreshed. Sign in again, then retry loading your addresses.";
  }
  if (status === 503 || code === "database_unavailable") {
    return "The address service is temporarily unavailable, so your saved addresses could not be loaded. Please retry in a moment, or add an address below.";
  }
  if (status === 403) {
    return "Your account could not access its saved addresses. You can retry or add an address; contact support if the problem continues.";
  }
  if (status === 409) {
    return "This email is already linked to a different account. Sign in with the original account, or contact support.";
  }
  if (typeof status === "number" && status >= 500) {
    // The request reached the server; the server could not fulfil it.
    return "The address service is temporarily unavailable, so your saved addresses could not be loaded. Please retry in a moment, or add an address below.";
  }
  if (typeof status === "number" && status !== 200) {
    return "Your saved addresses could not be loaded right now. Retry, or add a new address below.";
  }

  // ── No response at all ──
  if (message.includes("took too long") || message.includes("timed out")) {
    return "Loading your saved addresses is taking longer than usual. Retry, or add a new address below.";
  }
  if (isTransportError(error)) {
    return "We could not reach the address service. Check your connection and retry, or add an address below.";
  }
  return "Saved addresses could not be loaded. Retry, or add a new address below.";
}

function shouldOfferSignInAgain(error: Error): boolean {
  const message = error.message.toLowerCase();
  const status = error instanceof ApiResponseError ? error.status : undefined;
  const code = error instanceof ApiResponseError ? error.code : undefined;

  if (status === 503 || code === "firebase_admin_not_configured" || message.includes("firebase is not configured")) {
    return false;
  }

  return status === 401 ||
    message.includes("not authenticated") ||
    message.includes("please sign in again") ||
    message.includes("token");
}

export default function CheckoutAddressSection({
  addresses,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
}: Props) {
  const [showSignIn, setShowSignIn] = useState(false);
  const needsSignIn = error ? shouldOfferSignInAgain(error) : false;

  return (
    <section aria-label="Delivery address">
      {loading && (
        <div
          className="mb-4 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 size={18} className="animate-spin text-primary" />
          Loading saved addresses…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <p>{getAddressLoadMessage(error)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 transition-colors"
            >
              Try again
            </button>
            {needsSignIn && (
              <button
                type="button"
                onClick={() => setShowSignIn(true)}
                className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 transition-colors"
              >
                Sign in again
              </button>
            )}
          </div>
        </div>
      )}
      <AddressList
        addresses={addresses}
        selectedId={selectedId}
        onSelect={onSelect}
        showControls
        allowDelete={false}
      />
      {showSignIn && (
        <SignInModal
          onClose={() => {
            setShowSignIn(false);
            onRetry();
          }}
        />
      )}
    </section>
  );
}
