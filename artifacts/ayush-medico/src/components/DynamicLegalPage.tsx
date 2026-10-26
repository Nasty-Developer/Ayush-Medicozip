/**
 * Shared renderer for all DB-driven legal pages.
 * Fetches page content from /api/settings/legal_{key},
 * interpolates {{template}} variables from store settings,
 * and renders sections as structured rich text.
 */

import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { interpolate, type LegalContent } from "@/hooks/useLegalContent";

/* ── Inline renderer: **bold**, regular text ────────────────────────────────── */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>
      : part
  );
}

/* ── Body renderer ──────────────────────────────────────────────────────────── */
function renderBody(raw: string): React.ReactNode {
  // Split on double newline = paragraph / list boundary
  const blocks = raw.split(/\n\n+/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n");
    const nonEmpty = lines.filter(l => l.trim());
    const allBullets = nonEmpty.length > 0 && nonEmpty.every(l => l.trim().startsWith("- "));

    if (allBullets) {
      return (
        <ul key={bi} className="list-disc pl-5 space-y-1">
          {nonEmpty.map((l, li) => (
            <li key={li}>{renderInline(l.trim().slice(2))}</li>
          ))}
        </ul>
      );
    }

    // Paragraph — preserve single newlines as <br />
    const inlineNodes: React.ReactNode[] = [];
    lines.forEach((line, li) => {
      if (li > 0) inlineNodes.push(<br key={`br-${bi}-${li}`} />);
      const rendered = renderInline(line);
      inlineNodes.push(<span key={`l-${bi}-${li}`}>{rendered}</span>);
    });

    return <p key={bi}>{inlineNodes}</p>;
  });
}

/* ── Skeleton loader ─────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="border-b border-border pb-8">
          <div className="h-5 w-48 rounded bg-muted mb-4" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
            <div className="h-3 w-4/6 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────────────────────── */
type Props = {
  title:    string;
  icon:     React.ElementType;
  iconBg?:  string;          // e.g. "bg-primary/10"
  iconCls?: string;          // e.g. "text-primary"
  content:  LegalContent;
  loading:  boolean;
};

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function DynamicLegalPage({
  title, icon: Icon,
  iconBg  = "bg-primary/10",
  iconCls = "text-primary",
  content, loading,
}: Props) {
  const { settings } = useStoreSettings();

  // Determine if the FIRST section is a "rules/notice" box (Prescription Policy pattern)
  const firstIsNotice =
    content.sections.length > 0 &&
    content.sections[0].heading.toLowerCase().includes("important");

  const noticeSection = firstIsNotice ? content.sections[0] : null;
  const mainSections  = firstIsNotice ? content.sections.slice(1) : content.sections;

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }}>

          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
              <Icon size={20} className={iconCls} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal</p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Last updated: July 2025 · {settings.storeName}
          </p>

          {loading ? <Skeleton /> : (
            <div className="space-y-8">
              {/* Notice box (Prescription Policy style) */}
              {noticeSection && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 mb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    {noticeSection.heading}
                  </p>
                  <div className="space-y-1.5 text-sm text-foreground">
                    {renderBody(interpolate(noticeSection.body, settings))}
                  </div>
                </div>
              )}

              {/* Main policy sections */}
              {mainSections.map((section, i) => (
                <div key={i} className="border-b border-border pb-8">
                  <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {interpolate(section.heading, settings)}
                  </h2>
                  <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
                    {renderBody(interpolate(section.body, settings))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </motion.div>
      </div>
    </section>
  );
}
