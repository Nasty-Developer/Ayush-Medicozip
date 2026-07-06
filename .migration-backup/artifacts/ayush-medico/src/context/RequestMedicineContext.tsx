import { createContext, useContext, useState, useCallback } from "react";

type RequestMedicineContextValue = {
  prefillMedicine: string;
  requestToken: number;
  triggerRequest: (medicineName?: string) => void;
};

const RequestMedicineContext = createContext<RequestMedicineContextValue | undefined>(undefined);

export function RequestMedicineProvider({ children }: { children: React.ReactNode }) {
  const [prefillMedicine, setPrefillMedicine] = useState("");
  const [requestToken, setRequestToken] = useState(0);

  const triggerRequest = useCallback((medicineName = "") => {
    setPrefillMedicine(medicineName);
    setRequestToken((t) => t + 1);
    requestAnimationFrame(() => {
      const el = document.querySelector("#request-medicine");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <RequestMedicineContext.Provider value={{ prefillMedicine, requestToken, triggerRequest }}>
      {children}
    </RequestMedicineContext.Provider>
  );
}

export function useRequestMedicine() {
  const ctx = useContext(RequestMedicineContext);
  if (!ctx) throw new Error("useRequestMedicine must be used within a RequestMedicineProvider");
  return ctx;
}
