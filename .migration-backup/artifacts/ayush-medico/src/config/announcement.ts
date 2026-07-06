export type AnnouncementIcon =
  | "megaphone"
  | "heart-pulse"
  | "syringe"
  | "activity"
  | "calendar-check"
  | "sparkles";

export type AnnouncementColorScheme = "primary" | "secondary" | "accent" | "amber";

export interface AnnouncementConfig {
  enabled: boolean;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  icon: AnnouncementIcon;
  colorScheme: AnnouncementColorScheme;
}

/**
 * Single source of truth for the site-wide announcement banner.
 * Toggle `enabled` to show/hide the banner without touching any layout code.
 *
 * Example messages you can drop in here:
 * - "Free Blood Pressure Checkup" camp
 * - "Free Sugar Test Camp"
 * - "Health Awareness Camp"
 * - "Seasonal Health Tips"
 * - "Vaccination Available"
 * - "Special Discount Offers"
 */
export const announcementConfig: AnnouncementConfig = {
  enabled: false,
  title: "Free Blood Pressure & Sugar Checkup Camp",
  description: "This weekend at Ayush Medico — walk in for a free BP and blood sugar test. No appointment needed.",
  buttonText: "Call to Know More",
  buttonLink: "tel:+919833273838",
  icon: "heart-pulse",
  colorScheme: "secondary",
};
