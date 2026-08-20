import { lazy, Suspense } from "react";
import PageShell from "@/components/PageShell";

const About = lazy(() => import("@/components/About"));

export default function AboutPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <About />
      </Suspense>
    </PageShell>
  );
}
