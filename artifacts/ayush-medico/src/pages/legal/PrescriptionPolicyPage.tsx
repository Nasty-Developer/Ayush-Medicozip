import { FileCheck } from "lucide-react";
import { useLegalContent } from "@/hooks/useLegalContent";
import DynamicLegalPage from "@/components/DynamicLegalPage";

export default function PrescriptionPolicyPage() {
  const { content, loading } = useLegalContent("prescription");
  return (
    <DynamicLegalPage
      title="Prescription Policy"
      icon={FileCheck}
      content={content}
      loading={loading}
    />
  );
}
