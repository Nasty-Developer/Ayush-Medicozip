import { createContext, useContext, useState, useCallback } from "react";
import { useLocation } from "wouter";

type RequestMedicineContextValue = {
  prefillMedicine: string;
  prefillBrand: string;
  prefillCategory: string;
  prescriptionRequired: boolean;
  requestToken: number;
  /** Opens the Request Medicine form (navigating home if needed) and prefills it. */
  triggerRequest: (medicineName?: string, brand?: string, category?: string, prescriptionRequired?: boolean) => void;
};

const RequestMedicineContext = createContext<RequestMedicineContextValue | undefined>(undefined);

export function RequestMedicineProvider({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const [prefillMedicine, setPrefillMedicine] = useState("");
  const [prefillBrand, setPrefillBrand] = useState("");
  const [prefillCategory, setPrefillCategory] = useState("");
  const [prescriptionRequired, setPrescriptionRequired] = useState(false);
  const [requestToken, setRequestToken] = useState(0);

  const triggerRequest = useCallback(
    (medicineName = "", brand = "", category = "", requiresPrescription = false) => {
      setPrefillMedicine(medicineName);
      setPrefillBrand(brand);
      setPrefillCategory(category);
      setPrescriptionRequired(requiresPrescription);
      setRequestToken((t) => t + 1);
      navigate("/request-medicine");

    },
    [navigate]
  );

  return (
    <RequestMedicineContext.Provider
      value={{ prefillMedicine, prefillBrand, prefillCategory, prescriptionRequired, requestToken, triggerRequest }}
    >
      {children}
    </RequestMedicineContext.Provider>
  );
}

export function useRequestMedicine() {
  const ctx = useContext(RequestMedicineContext);
  if (!ctx) throw new Error("useRequestMedicine must be used within a RequestMedicineProvider");
  return ctx;
}
