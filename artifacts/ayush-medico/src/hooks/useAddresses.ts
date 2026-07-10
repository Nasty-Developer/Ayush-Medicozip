// useAddresses — subscribes to the customer's saved addresses in real-time.

import { useState, useEffect } from "react";
import { subscribeToAddresses, type CustomerAddress } from "@/lib/addressService";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

type UseAddressesResult = {
  addresses: CustomerAddress[];
  loading: boolean;
  error: Error | null;
  defaultAddress: CustomerAddress | null;
};

export function useAddresses(): UseAddressesResult {
  const { user } = useCustomerAuth();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
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
  }, [user?.uid]);

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  return { addresses, loading, error, defaultAddress };
}
