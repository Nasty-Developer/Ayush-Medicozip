/**
 * SDF File Reader
 *
 * Reads a browser File object, decodes it as latin-1 (Windows-1252),
 * strips Windows CRLF line endings, and returns clean lines.
 * MediVision Gold exports fixed-width flat files in this encoding.
 */

/** Read a File and return its bytes as a Uint8Array */
async function readFileBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

/** Decode a byte array as latin-1 (code points 0-255 map 1:1) */
function decodeLatin1(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/**
 * Read an SDF file and return its content as an array of lines.
 * Empty lines and lines with only whitespace are excluded.
 */
export async function readSdfLines(file: File): Promise<string[]> {
  const bytes = await readFileBytes(file);
  const text = decodeLatin1(bytes);
  // Split on LF; strip any trailing CR from each line
  return text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim().length > 0);
}

/** Extract a fixed-width field, trimming whitespace */
export function field(line: string, start: number, end: number): string {
  return line.slice(start, end).trim();
}

/** Extract and parse a right-justified float field; returns 0 on failure */
export function fieldFloat(line: string, start: number, end: number): number {
  const raw = line.slice(start, end).trim();
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
}

/** Extract and parse a right-justified integer field; returns 0 on failure */
export function fieldInt(line: string, start: number, end: number): number {
  const raw = line.slice(start, end).trim();
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Extract the trailing integer ID from an SDF line.
 * MediVision stores the record ID right-justified in the last ~10 chars.
 */
export function trailingId(line: string, fromCol: number): number {
  const raw = line.slice(fromCol).trim();
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}
