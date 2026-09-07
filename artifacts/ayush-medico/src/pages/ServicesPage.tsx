import { lazy, Suspense } from "react";
import PageShell from "@/components/PageShell";

const Services = lazy(() => import("@/components/Services"));

export default function ServicesPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Services />
      </Suspense>
    </PageShell>
  );
}
