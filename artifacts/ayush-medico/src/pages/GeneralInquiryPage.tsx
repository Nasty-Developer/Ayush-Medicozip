import { lazy, Suspense } from "react";
import PageShell from "@/components/PageShell";

const GeneralInquiry = lazy(() => import("@/components/GeneralInquiry"));

export default function GeneralInquiryPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <GeneralInquiry />
      </Suspense>
    </PageShell>
  );
}
