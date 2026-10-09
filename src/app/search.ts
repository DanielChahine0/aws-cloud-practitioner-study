/** Lowercases and keeps letters, digits and plus signs, so "Business Support+" and "EC2 Auto-Scaling" match what people type. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}
