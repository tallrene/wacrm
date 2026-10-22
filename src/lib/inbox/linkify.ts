/**
 * Split a chat message into text and link segments so the inbox can render
 * URLs as real anchors. Deliberately conservative: only http(s):// and www.
 * are linked (never javascript:, data:, ftp:, …), trailing punctuation is
 * left as text, and parentheses are only kept while they are balanced.
 */
export type LinkSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING_PUNCT = /[.,;:!?'"»”’)\]}]+$/;

function trimUrl(raw: string): string {
  let url = raw;
  // Peel trailing punctuation, but keep a ")" that closes a "(" inside the URL.
  for (;;) {
    const m = url.match(TRAILING_PUNCT);
    if (!m) break;
    const tail = m[0];
    const last = tail[tail.length - 1];
    if (last === ")") {
      const opens = (url.match(/\(/g) ?? []).length;
      const closes = (url.match(/\)/g) ?? []).length;
      if (closes <= opens) break;
    }
    url = url.slice(0, -1);
  }
  return url;
}

export function splitLinks(text: string | null | undefined): LinkSegment[] {
  if (!text) return [];
  const out: LinkSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    const value = trimUrl(m[0]);
    if (!value || value.toLowerCase() === "www." || /^https?:\/\/$/i.test(value)) continue;
    if (start > last) out.push({ type: "text", value: text.slice(last, start) });
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    out.push({ type: "link", value, href });
    last = start + value.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}
