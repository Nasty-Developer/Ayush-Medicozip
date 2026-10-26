import { lazy, Suspense } from "react";
import PageShell from "@/components/PageShell";

const DeliveryFeatures = lazy(() => import("@/components/DeliveryFeatures"));
const HowItWorks       = lazy(() => import("@/components/HowItWorks"));

export default function DeliveryPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <DeliveryFeatures />
        <HowItWorks />
      </Suspense>
    </PageShell>
  );
}
