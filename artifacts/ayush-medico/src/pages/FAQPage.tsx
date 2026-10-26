import { lazy, Suspense } from "react";
import PageShell from "@/components/PageShell";

const FAQ = lazy(() => import("@/components/FAQ"));

export default function FAQPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <FAQ />
      </Suspense>
    </PageShell>
  );
}
