import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { subscribeToDoc } from "@/lib/firestoreHelpers";
import { announcementConfig, type AnnouncementConfig } from "@/config/announcement";

const AnnouncementContext = createContext<AnnouncementConfig>(announcementConfig);

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AnnouncementConfig>(announcementConfig);

  useEffect(() => {
    const unsub = subscribeToDoc("settings", "announcement", (doc) => {
      if (doc) {
        setData({
          enabled: Boolean(doc.enabled),
          title: String(doc.title ?? announcementConfig.title),
          description: String(doc.description ?? announcementConfig.description),
          buttonText: String(doc.buttonText ?? announcementConfig.buttonText),
          buttonLink: String(doc.buttonLink ?? announcementConfig.buttonLink),
          icon: (doc.icon ?? announcementConfig.icon) as AnnouncementConfig["icon"],
          colorScheme: (doc.colorScheme ?? announcementConfig.colorScheme) as AnnouncementConfig["colorScheme"],
        });
      }
      // If doc is null (document not yet created in Firestore), keep static defaults
      // which have enabled: false — so banner stays hidden until admin creates it.
    });
    return unsub;
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
