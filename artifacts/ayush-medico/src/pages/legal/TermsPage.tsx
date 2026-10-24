import { FileText } from "lucide-react";
import { useLegalContent } from "@/hooks/useLegalContent";
import DynamicLegalPage from "@/components/DynamicLegalPage";

export default function TermsPage() {
  const { content, loading } = useLegalContent("terms");
  return (
    <DynamicLegalPage
      title="Terms & Conditions"
      icon={FileText}
      content={content}
      loading={loading}
    />
  );
}
