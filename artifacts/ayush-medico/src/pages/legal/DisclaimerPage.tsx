import { AlertTriangle } from "lucide-react";
import { useLegalContent } from "@/hooks/useLegalContent";
import DynamicLegalPage from "@/components/DynamicLegalPage";

export default function DisclaimerPage() {
  const { content, loading } = useLegalContent("disclaimer");
  return (
    <DynamicLegalPage
      title="Disclaimer"
      icon={AlertTriangle}
      iconBg="bg-amber-500/10"
      iconCls="text-amber-500"
      content={content}
      loading={loading}
    />
  );
}
