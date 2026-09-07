// Delivery eligibility check — Ayush Medico delivers within ~4km of
// Kurla West, Mumbai. Since no maps/geocoding API key is configured,
// eligibility is determined by a curated allowlist of pincodes that fall
// within (or very near) the delivery radius. This is a pragmatic
// approximation; if a precise radius is ever required, swap this for a
// geocoding + haversine-distance check against the store's lat/lng.

export const STORE_LOCATION_LABEL = "Kurla West, Mumbai";

// Pincodes within ~4km of Kurla West (400070): Kurla, Chunabhatti, Sion,
// Ghatkopar West, Vidyavihar, Kalina, Chembur (western edge), Nehru Nagar.
const DELIVERABLE_PINCODES = new Set([
  "400070", // Kurla West
  "400024", // Chunabhatti / Sion
  "400037", // Chembur (edge)
  "400086", // Vidyavihar / Ghatkopar West edge
  "400077", // Ghatkopar East/West
  "400019", // Sion
  "400098", // Kalina / Santacruz East
  "400071", // Kurla East
  "400072", // Saki Naka
]);

export type DeliveryEligibility =
  | { status: "unchecked" }
  | { status: "eligible" }
  | { status: "ineligible" }
  | { status: "invalid" };

export function checkDeliveryEligibility(pincode: string): DeliveryEligibility {
  const trimmed = pincode.trim();
  if (!trimmed) return { status: "unchecked" };
  if (!/^\d{6}$/.test(trimmed)) return { status: "invalid" };
  return DELIVERABLE_PINCODES.has(trimmed)
    ? { status: "eligible" }
    : { status: "ineligible" };
}
