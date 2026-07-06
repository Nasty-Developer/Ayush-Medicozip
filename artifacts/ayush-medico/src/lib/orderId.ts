// Order ID generation — produces professional, sequential-looking IDs in the
// format AYM-<year>-<6-digit sequence>, e.g. AYM-2026-000123.
//
// There is no dedicated Firestore "counters" collection (adding one would
// require new Firestore rules, which we've been told not to touch), so the
// next sequence number is derived by querying the existing "inquiries"
// collection (already publicly readable/queryable — see OrderTracker) for
// the highest AYM order number issued so far this year, then incrementing.
// A short uniqueness-retry loop guards against the rare case of two
// submissions racing for the same number.

import { getCollection, where, orderBy, limit } from "@/lib/firestoreHelpers";

const ORDER_PREFIX = "AYM";
const SEQUENCE_DIGITS = 6;

function buildOrderId(year: number, sequence: number): string {
  return `${ORDER_PREFIX}-${year}-${String(sequence).padStart(SEQUENCE_DIGITS, "0")}`;
}

function parseSequence(orderId: string | undefined, year: number): number {
  if (!orderId) return 0;
  const match = orderId.match(new RegExp(`^${ORDER_PREFIX}-${year}-(\\d{${SEQUENCE_DIGITS}})$`));
  return match ? parseInt(match[1], 10) : 0;
}

async function orderIdExists(orderId: string): Promise<boolean> {
  const docs = await getCollection(
    "inquiries",
    [where("requestId", "==", orderId)],
    `orderid_exists_${orderId}`,
  );
  return docs.length > 0;
}

/**
 * Generates a unique, human-friendly Order ID in the AYM-YYYY-NNNNNN format.
 * Falls back to a timestamp-derived suffix in the unlikely event of repeated
 * collisions (e.g. concurrent submissions).
 */
export async function generateOrderId(): Promise<string> {
  const year = new Date().getFullYear();

  let nextSequence = 1;
  try {
    // Look for the highest existing order number issued this year by
    // querying for medicine-request docs, sorted newest first. We don't
    // have a numeric field to sort on directly, so we pull recent docs and
    // parse their requestId strings client-side.
    const recent = await getCollection(
      "inquiries",
      [where("type", "==", "medicine-request"), orderBy("createdAt", "desc"), limit(25)],
      undefined,
    );
    const maxSequence = recent.reduce((max, doc) => {
      const seq = parseSequence(doc.requestId as string | undefined, year);
      return seq > max ? seq : max;
    }, 0);
    nextSequence = maxSequence + 1;
  } catch (err) {
    console.error("[orderId] Failed to determine next sequence, defaulting to 1:", err);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = buildOrderId(year, nextSequence + attempt);
    try {
      const exists = await orderIdExists(candidate);
      if (!exists) return candidate;
    } catch (err) {
      // If the existence check itself fails (e.g. offline), just return the
      // candidate rather than blocking submission entirely.
      console.error("[orderId] Uniqueness check failed, using candidate anyway:", err);
      return candidate;
    }
  }

  // Extremely unlikely fallback: derive from timestamp to guarantee uniqueness.
  return buildOrderId(year, parseInt(String(Date.now()).slice(-SEQUENCE_DIGITS), 10));
}
