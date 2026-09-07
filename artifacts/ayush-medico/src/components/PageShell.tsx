/**
 * PageShell — compensates for the fixed header on dedicated inner pages.
 * Wrap every page's top-level content in this so it isn't hidden behind the navbar.
 */
import { useAnnouncement } from "@/context/AnnouncementContext";

export default function PageShell({ children }: { children: React.ReactNode }) {
  const { enabled } = useAnnouncement();
  // h-16 (mobile) / md:h-20 (desktop) + optional announcement banner (~3rem)
  const pt = enabled ? "pt-28 md:pt-32" : "pt-16 md:pt-20";
  return <div className={pt}>{children}</div>;
}
