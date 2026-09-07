/**
 * COMPANY.SDF Parser
 *
 * Fixed-width layout (126 chars per line):
 *
 * Cols  0-29  name       (30 chars, left-justified)
 * Cols 30-32  code       (3 chars, company short code)
 * Cols 33-119 padding
 * Cols120+    companyId  (right-justified int, trailing)
 *
 * ~2 322 records.
 */

import { field, trailingId } from "./sdfReader";
import type { SdfCompany } from "./types";

const MIN_LINE_LENGTH = 40;

export function parseCompanyLine(line: string): SdfCompany | null {
  if (line.length < MIN_LINE_LENGTH) return null;

  try {
    const name = field(line, 0, 30);
    if (!name) return null;
    const code = field(line, 30, 33);
    const companyId = trailingId(line, 120);
    return { companyId, name, code };
  } catch {
    return null;
  }
}

export function parseCompanyFile(lines: string[]): SdfCompany[] {
  const companies: SdfCompany[] = [];
  for (const line of lines) {
    const c = parseCompanyLine(line);
    if (c) companies.push(c);
  }
  return companies;
}
