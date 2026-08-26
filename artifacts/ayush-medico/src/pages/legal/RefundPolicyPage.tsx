import { RefreshCw } from "lucide-react";
import { useLegalContent } from "@/hooks/useLegalContent";
import DynamicLegalPage from "@/components/DynamicLegalPage";

export default function RefundPolicyPage() {
  const { content, loading } = useLegalContent("refund");
  return (
    <DynamicLegalPage
      title="Refund & Cancellation Policy"
      icon={RefreshCw}
      content={content}
      loading={loading}
    />
  );
}
