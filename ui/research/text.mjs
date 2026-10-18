/** text.mjs — normalisation helpers shared by the parser, the gates and the UI. */

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };

/** Strip tags/scripts/styles and return readable text with collapsed whitespace. */
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keep digits only: "18 500 €" -> "18500". */
export function digits(value) {
  return String(value ?? '').replace(/[^\d]/g, '');
}

/** All the plausible ways a number is written on a Slovak/Czech listing page. */
export function numberVariants(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return [];
  const plain = String(Math.round(n));
  const grouped = plain.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const dotted = plain.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const comma = plain.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return [...new Set([plain, grouped, dotted, comma])];
}

/**
 * Does this page text contain the number, and can we show the exact excerpt?
 * Returns {ok, evidence} — evidence is the substring from the *source page*, which
 * is what makes the gate auditable instead of a boolean someone typed.
 */
export function findNumber(text, n, window = 70) {
  const flat = String(text ?? '');
  for (const variant of numberVariants(n)) {
    const at = flat.indexOf(variant);
    if (at >= 0) {
      const from = Math.max(0, at - window);
      return { ok: true, evidence: flat.slice(from, at + variant.length + window).trim(), matched: variant };
    }
  }
  return { ok: false, evidence: '' };
}

/** Normalised text for substring tests that must survive case and accent noise. */
export function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when most of the title's significant words appear in the page text. */
export function titleAppears(title, text, threshold = 0.7) {
  const words = fold(title).split(' ').filter((w) => w.length > 3);
  if (!words.length) return { ok: false, ratio: 0, evidence: '' };
  const hay = fold(text);
  const hits = words.filter((w) => hay.includes(w));
  const ratio = hits.length / words.length;
  const evidence = text.slice(0, 160);
  return { ok: ratio >= threshold, ratio: Math.round(ratio * 100) / 100, evidence };
}
