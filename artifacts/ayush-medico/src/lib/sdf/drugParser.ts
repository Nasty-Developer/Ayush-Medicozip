/**
 * DRUG.SDF Parser
 *
 * Fixed-width layout (124 chars per line):
 *
 * Cols  0-59  name      (60 chars, left-justified)
 * Cols 60-62  flags     (3 chars, e.g. "NNN")
 * Cols 63-119 padding
 * Cols120+    drugId    (right-justified int, trailing)
 *
 * ~5 064 records of generic/drug composition names.
 */

import { field, trailingId } from "./sdfReader";
import type { SdfDrug } from "./types";

const MIN_LINE_LENGTH = 40;

export function parseDrugLine(line: string): SdfDrug | null {
  if (line.length < MIN_LINE_LENGTH) return null;

  try {
    const name = field(line, 0, 60);
    if (!name) return null;
    const rawFlags = field(line, 60, 63);
    const drugId = trailingId(line, 120);
    return { drugId, name, rawFlags };
  } catch {
    return null;
  }
}

export function parseDrugFile(lines: string[]): SdfDrug[] {
  const drugs: SdfDrug[] = [];
  for (const line of lines) {
    const d = parseDrugLine(line);
    if (d) drugs.push(d);
  }
  return drugs;
}
