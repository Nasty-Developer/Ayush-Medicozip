// useOrders — subscribes to the customer's order list from the `orders` collection.
// Separate from the existing useInquiries hook (prescription-based requests).

import { useState, useEffect } from "react";
import { subscribeToCustomerOrders, type Order } from "@/lib/orderService";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

type UseOrdersResult = {
  orders: Order[];
  loading: boolean;
  error: Error | null;
};

export function useOrders(): UseOrdersResult {
  const { user } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToCustomerOrders(
      user.uid,
      (data) => {
        setOrders(data);
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

  return { orders, loading, error };
}
