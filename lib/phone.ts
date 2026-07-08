// Client-safe: normalizes a customer phone number to include a country code
// so wa.me links always work, even if typed without one (assumes India/+91
// for numbers entered without a leading +, per this business's customer base).
export function normalizePhone(raw: string): string {
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  const withoutLeadingZero = cleaned.replace(/^0+/, "");
  return `+91${withoutLeadingZero}`;
}
