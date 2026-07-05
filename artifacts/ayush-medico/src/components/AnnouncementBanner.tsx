import { motion } from "framer-motion";
import { Megaphone, HeartPulse, Syringe, Activity, CalendarCheck, Sparkles } from "lucide-react";
import { announcementConfig, type AnnouncementColorScheme } from "@/config/announcement";

const iconMap = {
  megaphone: Megaphone,
  "heart-pulse": HeartPulse,
  syringe: Syringe,
  activity: Activity,
  "calendar-check": CalendarCheck,
  sparkles: Sparkles,
};

const colorSchemeMap: Record<AnnouncementColorScheme, { bg: string; text: string; iconBg: string; btn: string }> = {
  primary: {
    bg: "bg-primary/10 border-primary/20",
    text: "text-primary",
    iconBg: "bg-primary/15",
    btn: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  secondary: {
    bg: "bg-secondary/10 border-secondary/20",
    text: "text-secondary",
    iconBg: "bg-secondary/15",
    btn: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  },
  accent: {
    bg: "bg-accent/10 border-accent/20",
    text: "text-accent-foreground",
    iconBg: "bg-accent/15",
    btn: "bg-accent text-accent-foreground hover:bg-accent/90",
  },
  amber: {
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/15",
    btn: "bg-amber-500 text-white hover:bg-amber-500/90",
  },
};

export default function AnnouncementBanner() {
  if (!announcementConfig.enabled) return null;

  const Icon = iconMap[announcementConfig.icon] ?? Megaphone;
  const colors = colorSchemeMap[announcementConfig.colorScheme] ?? colorSchemeMap.secondary;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      data-testid="announcement-banner"
      className={`w-full border-b ${colors.bg} backdrop-blur-sm`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 py-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center w-6 h-6 rounded-full ${colors.iconBg} flex-shrink-0`}>
              <Icon size={13} className={colors.text} aria-hidden="true" />
            </span>
            <p className={`text-xs sm:text-sm font-semibold ${colors.text}`}>
              {announcementConfig.title}
            </p>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {announcementConfig.description}
          </p>
          <a
            href={announcementConfig.buttonLink}
            data-testid="announcement-banner-btn"
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors duration-200 ${colors.btn}`}
          >
            {announcementConfig.buttonText}
          </a>
        </div>
      </div>
    </motion.div>
  );
}
