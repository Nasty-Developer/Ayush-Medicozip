// useAddresses — subscribes to UID-scoped client-only saved addresses.

import { useState, useEffect } from "react";
import { subscribeToAddresses, type CustomerAddress } from "@/lib/addressService";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { ApiResponseError } from "@/lib/apiAuth";

type UseAddressesResult = {
  addresses: CustomerAddress[];
  loading: boolean;
  error: Error | null;
  defaultAddress: CustomerAddress | null;
  retry: () => void;
};

export function useAddresses(): UseAddressesResult {
  const { user } = useCustomerAuth();
  const [state, setState] = useState<{
    uid: string | null;
    addresses: CustomerAddress[];
    loading: boolean;
    error: Error | null;
  }>({ uid: null, addresses: [], loading: true, error: null });
  const [retryToken, setRetryToken] = useState(0);
  const activeUid = user?.uid ?? null;

  useEffect(() => {
    if (!user) {
      setState({ uid: null, addresses: [], loading: false, error: null });
      return;
    }

    setState((current) => ({
      uid: user.uid,
      addresses: current.uid === user.uid ? current.addresses : [],
      loading: true,
      error: null,
    }));
    const unsub = subscribeToAddresses(
      user.uid,
      (data) => {
        setState({ uid: user.uid, addresses: data, loading: false, error: null });
      },
      (err) => {
        const loadError = err instanceof Error ? err : new Error("Could not fetch saved addresses.");
        console.error("[Addresses] Failed to load saved addresses", {
          status: loadError instanceof ApiResponseError ? loadError.status : undefined,
          code: loadError instanceof ApiResponseError ? loadError.code : undefined,
          message: loadError.message,
        });
        setState((current) => ({
          uid: user.uid,
          addresses: current.uid === user.uid ? current.addresses : [],
          loading: false,
          error: loadError,
        }));
      }
    );

    return () => unsub();
  }, [user?.uid, retryToken]);

  // Never expose a previous account's addresses during the render before the
  // auth-change effect runs.
  const currentState = state.uid === activeUid
    ? state
    : { uid: activeUid, addresses: [], loading: Boolean(user), error: null };
  const addresses = currentState.addresses;
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  return {
    addresses,
    loading: currentState.loading,
    error: currentState.error,
    defaultAddress,
    retry: () => setRetryToken((value) => value + 1),
  };
}
