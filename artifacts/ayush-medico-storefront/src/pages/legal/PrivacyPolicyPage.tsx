import { ShieldCheck } from "lucide-react";
import { useLegalContent } from "@/hooks/useLegalContent";
import DynamicLegalPage from "@/components/DynamicLegalPage";

export default function PrivacyPolicyPage() {
  const { content, loading } = useLegalContent("privacy");
  return (
    <DynamicLegalPage
      title="Privacy Policy"
      icon={ShieldCheck}
      content={content}
      loading={loading}
    />
  );
}
