import { lazy, Suspense } from "react";
import PageShell from "@/components/PageShell";

const Contact = lazy(() => import("@/components/Contact"));

export default function ContactPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Contact />
      </Suspense>
    </PageShell>
  );
}
