import { createContext, useContext, useState, useCallback } from "react";
import { useLocation } from "wouter";

type RequestMedicineContextValue = {
  prefillMedicine: string;
  prefillBrand: string;
  prefillCategory: string;
  requestToken: number;
  /** Opens the Request Medicine form (navigating home if needed) and prefills it. */
  triggerRequest: (medicineName?: string, brand?: string, category?: string) => void;
};

const RequestMedicineContext = createContext<RequestMedicineContextValue | undefined>(undefined);

export function RequestMedicineProvider({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const [prefillMedicine, setPrefillMedicine] = useState("");
  const [prefillBrand, setPrefillBrand] = useState("");
  const [prefillCategory, setPrefillCategory] = useState("");
  const [requestToken, setRequestToken] = useState(0);

  const triggerRequest = useCallback(
    (medicineName = "", brand = "", category = "") => {
      setPrefillMedicine(medicineName);
      setPrefillBrand(brand);
      setPrefillCategory(category);
      setRequestToken((t) => t + 1);
      navigate("/");

      // The request form only exists on the homepage. If we're navigating
      // there from another route, its section won't be in the DOM yet —
      // retry the scroll for a short window until it mounts.
      let attempts = 0;
      const tryScroll = () => {
        const el = document.querySelector("#request-medicine");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attempts < 20) {
          attempts++;
          setTimeout(tryScroll, 50);
        }
      };
      requestAnimationFrame(tryScroll);
    },
    [navigate]
  );

  return (
    <RequestMedicineContext.Provider
      value={{ prefillMedicine, prefillBrand, prefillCategory, requestToken, triggerRequest }}
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
