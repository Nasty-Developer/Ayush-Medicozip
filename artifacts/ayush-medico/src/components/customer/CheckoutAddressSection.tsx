import { Loader2 } from "lucide-react";
import AddressList from "@/components/customer/AddressList";
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

function getAddressLoadMessage(error: Error): string {
  const message = error.message.toLowerCase();
  const status = error instanceof ApiResponseError ? error.status : undefined;
  const code = error instanceof ApiResponseError ? error.code : undefined;

  if (status === 503 || code === "firebase_admin_not_configured" || message.includes("firebase is not configured")) {
    return "Secure sign-in is not available in this environment yet. You can still add an address, but contact support if saving it fails.";
  }
  if (status === 401 || message.includes("not authenticated") || message.includes("token")) {
    return "Your sign-in needs to be refreshed. Sign in again, then retry loading your addresses.";
  }
  if (status === 403 || message.includes("permission")) {
    return "Your account could not access its saved addresses. You can retry or add an address; contact support if the problem continues.";
  }
  if (message.includes("timed out") || message.includes("failed to fetch") || message.includes("network")) {
    return "We could not reach the address service. Check your connection and retry, or add an address below.";
  }
  return "Saved addresses could not be loaded. Retry, or add a new address below.";
}

export default function CheckoutAddressSection({
  addresses,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
}: Props) {
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
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
      <AddressList
        addresses={addresses}
        selectedId={selectedId}
        onSelect={onSelect}
        showControls
        allowDelete={false}
      />
    </section>
  );
}
