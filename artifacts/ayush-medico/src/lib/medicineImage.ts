/**
 * Shared placeholder image for medicines that don't have a real photo yet
 * (mainly the ~51,000 MediVision Gold imports, which never ship product
 * photography).
 *
 * This is a single inline SVG data URI — not a file on disk — so every
 * imported medicine "shares" the exact same asset with zero extra network
 * requests and no duplicate image files to manage.
 *
 * Any medicine that gets a real `imageUrl` (manual admin entry, or an
 * admin uploading a photo for a MediVision medicine) simply uses that URL
 * instead — this placeholder is only ever a fallback.
 */
export const DEFAULT_MEDICINE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d9488" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="pill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bg)"/>
  <g transform="translate(100 100) rotate(-40)">
    <rect x="-42" y="-18" width="84" height="36" rx="18" fill="url(#pill)"/>
    <rect x="-42" y="-18" width="42" height="36" rx="18" fill="#ffffff" fill-opacity="0.35"/>
    <line x1="0" y1="-18" x2="0" y2="18" stroke="#0f766e" stroke-width="2" stroke-opacity="0.4"/>
  </g>
</svg>
`.trim());

/** True when a medicine document has no real uploaded photo. */
export function needsPlaceholderImage(imageUrl?: string | null): boolean {
  return !imageUrl || imageUrl.trim().length === 0;
}

/** Resolve the image to show for a medicine card — real photo, else the shared placeholder. */
export function resolveMedicineImage(imageUrl?: string | null): string {
  return needsPlaceholderImage(imageUrl) ? DEFAULT_MEDICINE_IMAGE : (imageUrl as string);
}
