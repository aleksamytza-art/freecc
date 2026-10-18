/**
 * sources/bazos.mjs — a real source adapter (Slovak classifieds).
 *
 * Deliberately dumb and deterministic: the listing page is parsed with anchored
 * regexes, not with a model. A model is good at reading prose; it is bad at being
 * the thing that decides whether a price is on the page. The gates do that.
 *
 * parseRows() is a pure function so it can be tested against a saved fixture
 * without touching the network.
 */

export const SOURCE = {
  id: 'bazos',
  label: 'Bazos.sk (classifieds)',
  home: 'https://www.bazos.sk/',
  defaultSearch: 'https://www.bazos.sk/search.php?hledat={q}&cenado={max}',
};

export function buildSearchUrl(template, { q, max }) {
  return String(template || SOURCE.defaultSearch)
    .replace('{q}', encodeURIComponent(q))
    .replace('{max}', String(max));
}

/** "12 500 €" -> 12500 · "Dohodou" -> null · "1 €" -> 1 (flagged as a placeholder). */
export function parsePrice(text) {
  const raw = String(text ?? '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw) return { value: null, raw, placeholder: false };
  const m = raw.match(/(\d[\d\s.,]*)\s*(€|eur|EUR)?/);
  if (!m) return { value: null, raw, placeholder: false };
  const n = Number(m[1].replace(/[\s.,]/g, ''));
  if (!Number.isFinite(n)) return { value: null, raw, placeholder: false };
  // A symbolic "1 €" is how sellers write "make me an offer". Treat it as unknown.
  return { value: n, raw, placeholder: n <= 1 };
}

/** First area expression in a text: "8 325 m²" -> 8325. */
export function parseArea(text) {
  const m = String(text ?? '').match(/(\d[\d\s]{1,9})\s*m\s*(?:2|²|2\.)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a listing/search page into candidate rows.
 * @returns {Array<{url,title,priceRaw,priceEur,pricePlaceholder,location,description,areaM2}>}
 */
export function parseRows(html) {
  const chunks = String(html ?? '').split('<div class="inzeraty inzeratyflex">').slice(1);
  const rows = [];
  for (const chunk of chunks) {
    const titleM = chunk.match(/<h2 class=["']?nadpis["']?>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleM) continue;
    const priceM = chunk.match(/<div class="inzeratycena">[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
    const locM = chunk.match(/<div class="inzeratylok">([\s\S]*?)<\/div>/i);
    const descM = chunk.match(/<div class=popis>([\s\S]*?)<\/div>/i);
    const title = titleM[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const price = parsePrice(priceM ? priceM[1] : '');
    const location = (locM ? locM[1] : '').replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();
    const description = (descM ? descM[1] : '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    rows.push({
      url: titleM[1].startsWith('http') ? titleM[1] : new URL(titleM[1], SOURCE.home).href,
      title,
      priceRaw: price.raw,
      priceEur: price.value,
      pricePlaceholder: price.placeholder,
      location,
      description,
      areaM2: parseArea(`${title} ${description}`),
    });
  }
  return rows;
}

/* ---------------------------------------------------------------- land only
   First run taught this the hard way: "m²" alone is NOT evidence of land — a
   74 m² apartment matches it. Land needs a land word, and any object/rental word
   disqualifies the row outright. */
const LAND_WORDS = ['pozem', 'parcel', 'zahrad', 'záhrad', 'hektár', 'hektar', 'orná', 'orna', 'lúka', 'luka', 'trávny', 'travny', 'les', 'poľnohospod', 'polnohospod'];
const NOT_LAND_WORDS = ['byt', 'bytu', 'garsonk', 'garsónk', 'prenájom', 'prenajom', 'okno', 'okná', 'dvere', 'balkón', 'balkon', 'loggia', 'pneu', 'sťahov', 'stahov', 'nábytok', 'nabytok', 'vozidlo', 'kotol', 'radiátor', 'radiator'];

/** Is this row plausibly a plot of land rather than a window or a van? */
export function isLand(row) {
  const hay = `${row.title} ${row.description}`.toLowerCase();
  if (NOT_LAND_WORDS.some((w) => hay.includes(w))) return false;
  return LAND_WORDS.some((w) => hay.includes(w));
}

/**
 * Plausibility of the price as a *land price*, not a placeholder or a unit price.
 * Returns {ok, reason}.
 */
export function pricePlausible(row, { minPriceEur = 300, maxPricePerM2 = 400 } = {}) {
  if (row.priceEur === null) return { ok: false, reason: 'no numeric price' };
  if (row.pricePlaceholder) return { ok: false, reason: `"${row.priceRaw}" is a placeholder` };
  if (row.priceEur < minPriceEur) return { ok: false, reason: `€${row.priceEur} is below any plausible land price` };
  if (row.areaM2 && row.priceEur / row.areaM2 > maxPricePerM2) {
    return { ok: false, reason: `€${Math.round(row.priceEur / row.areaM2)}/m² exceeds the plausible ceiling` };
  }
  return { ok: true, reason: 'price looks like a land price' };
}