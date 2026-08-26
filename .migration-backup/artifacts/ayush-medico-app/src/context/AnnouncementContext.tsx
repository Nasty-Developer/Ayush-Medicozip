import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { announcementConfig, type AnnouncementConfig } from "@/config/announcement";

const AnnouncementContext = createContext<AnnouncementConfig>(announcementConfig);

// Poll interval: 60 seconds is plenty for an announcement banner
const POLL_INTERVAL_MS = 60_000;

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AnnouncementConfig>(announcementConfig);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch("/api/settings/announcement")
        .then((r) => r.ok ? r.json() : null)
        .then((doc: Record<string, unknown> | null) => {
          if (cancelled || !doc || Object.keys(doc).length === 0) return;
          setData({
            enabled: Boolean(doc.enabled),
            title: String(doc.title ?? announcementConfig.title),
            description: String(doc.description ?? announcementConfig.description),
            buttonText: String(doc.buttonText ?? announcementConfig.buttonText),
            buttonLink: String(doc.buttonLink ?? announcementConfig.buttonLink),
            icon: (doc.icon ?? announcementConfig.icon) as AnnouncementConfig["icon"],
            colorScheme: (doc.colorScheme ?? announcementConfig.colorScheme) as AnnouncementConfig["colorScheme"],
          });
        })
        .catch(() => {/* keep current state on error */});
    };

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <AnnouncementContext.Provider value={data}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncement() {
  return useContext(AnnouncementContext);
}
