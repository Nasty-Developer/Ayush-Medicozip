import { lazy, Suspense } from "react";
import PageShell from "@/components/PageShell";

const RequestMedicine = lazy(() => import("@/components/RequestMedicine"));

export default function RequestMedicinePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <RequestMedicine />
      </Suspense>
    </PageShell>
  );
}
