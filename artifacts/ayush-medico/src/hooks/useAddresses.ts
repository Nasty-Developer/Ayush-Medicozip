// useAddresses — subscribes to the customer's saved addresses in real-time.

import { useState, useEffect } from "react";
import { subscribeToAddresses, type CustomerAddress } from "@/lib/addressService";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

type UseAddressesResult = {
  addresses: CustomerAddress[];
  loading: boolean;
  error: Error | null;
  defaultAddress: CustomerAddress | null;
  retry: () => void;
};

export function useAddresses(): UseAddressesResult {
  const { user } = useCustomerAuth();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const unsub = subscribeToAddresses(
      user.uid,
      (data) => {
        setAddresses(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, retryToken]);

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  return {
    addresses,
    loading,
    error,
    defaultAddress,
    retry: () => setRetryToken((value) => value + 1),
  };
}
