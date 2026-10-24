import { Truck } from "lucide-react";
import { useLegalContent } from "@/hooks/useLegalContent";
import DynamicLegalPage from "@/components/DynamicLegalPage";

export default function ShippingPolicyPage() {
  const { content, loading } = useLegalContent("shipping");
  return (
    <DynamicLegalPage
      title="Shipping & Delivery Policy"
      icon={Truck}
      content={content}
      loading={loading}
    />
  );
}
