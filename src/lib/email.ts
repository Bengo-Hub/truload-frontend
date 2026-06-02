/**
 * Normalizes email recipient input into clean, individual, de-duplicated addresses.
 *
 * Recipients may be entered comma-separated (notification workflow pools/CC), line-by-line
 * (scheduled reports), or pasted as a mixed blob. Sending a single joined string as one
 * recipient causes the mail server to reject it (SMTP 501) and drop the message. This splits
 * on commas, semicolons and newlines, trims, lowercases, drops blanks/invalid entries, and
 * de-duplicates while preserving order.
 */
const SEPARATORS = /[,;\n\r]+/;

export function normalizeEmails(input: string | string[]): string[] {
  const parts = Array.isArray(input)
    ? input.flatMap((s) => (s ?? '').split(SEPARATORS))
    : (input ?? '').split(SEPARATORS);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const email = part.trim().toLowerCase();
    if (!email || !email.includes('@')) continue;
    if (!seen.has(email)) {
      seen.add(email);
      out.push(email);
    }
  }
  return out;
}
