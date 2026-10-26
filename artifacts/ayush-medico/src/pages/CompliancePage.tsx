import { lazy, Suspense } from "react";
import PageShell from "@/components/PageShell";

const TrustCompliance = lazy(() => import("@/components/TrustCompliance"));

export default function CompliancePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <TrustCompliance />
      </Suspense>
    </PageShell>
  );
}
