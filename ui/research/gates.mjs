/**
 * gates.mjs — the mechanical gates, each one anchored to the source page.
 *
 * The rule this enforces: a candidate attribute is only admissible if the *cited
 * page itself* contains it. Every gate returns the excerpt it matched, so a reader
 * can check the gate without trusting this code or any model.
 *
 * Criteria that no page can settle (climate, legality, scenery) return
 * `status: 'unverified'` and `ok: null`. They are never counted as passed, and the
 * scorer excludes their weight from the supported total.
 */
import { findNumber, fold, titleAppears } from './text.mjs';
import { pricePlausible } from './sources/bazos.mjs';

const ACCESS_WORDS = ['pristup', 'prístup', 'cesta', 'cesty', 'asfalt', 'elektr', 'voda', 'studna', 'studňa', 'inzenyr', 'inženýr', 'siet', 'sieť', 'plyn', 'internet'];
const SCENERY_WORDS = ['vyhlad', 'výhľad', 'les', 'lesa', 'potok', 'rybnik', 'rybník', 'jazero', 'kopec', 'hora', 'priroda', 'príroda', 'ticho', 'klud', 'kľud', 'luka', 'lúka', 'vinohrad'];

/* The first run proved why these two gates have to exist: "Balcony door, €99"
   passed every claim-vs-page gate. A gate that only checks whether the page says
   what we read cannot catch a listing that is not the thing we asked for. */

export function gateType(candidate) {
  const hay = `${candidate.title} ${candidate.description}`.toLowerCase();
  const landWord = /pozem|parcel|záhad|zahrad|hektár|orná|lúka|trávny|les|poľnohospod/i.test(hay);
  const notLand = /byt\b|bytu|garsonk|garsónk|prenájom|prenajom|okno|okná|dvere|balkón|loggia|pneu|sťahov|nábytok|vozidlo|kotol|radiátor|kada|vaňa|vana/i.test(hay);
  /* The site files every listing under a category subdomain (reality., sluzby.,
     auto. …). That routing is a stronger mechanical signal than wording, and it
     is what caught a bathtub being admitted as a plot of land. */
  const host = (() => { try { return new URL(candidate.url).hostname; } catch { return ''; } })();
  const realityHost = /reality\.bazos\./.test(host);
  const ok = realityHost && landWord && !notLand;
  return {
    id: 'type',
    label: 'Listing is a plot of land, not an object',
    critical: true,
    ok,
    detail: !realityHost
      ? `host ${host || '(unknown)'} is not the real-estate section`
      : notLand
        ? 'wording points at an object or a rental'
        : landWord
          ? 'real-estate section + land wording'
          : 'no land wording found',
    evidence: `${candidate.title.slice(0, 120)} · ${host}`,
  };
}

export function gatePlausible(candidate, request) {
  const r = pricePlausible(candidate, request.plausibility);
  return {
    id: 'plausible',
    label: 'Price is plausible for land (not a placeholder or unit price)',
    critical: true,
    ok: r.ok,
    detail: r.reason,
    evidence: candidate.priceRaw ? `list view says "${candidate.priceRaw}"` : '',
  };
}

export function gateTitle(candidate, pageText) {
  const r = titleAppears(candidate.title, pageText);
  return {
    id: 'title',
    label: 'Title wording appears on the page',
    critical: true,
    ok: r.ok,
    detail: `${Math.round(r.ratio * 100)}% of the title's words found on the page`,
    evidence: r.evidence,
  };
}

export function gatePrice(candidate, pageText, budgetEur) {
  if (candidate.priceEur === null) {
    return { id: 'price', label: 'Asking price is stated on the page', critical: true, ok: false, detail: 'no numeric price on the listing (e.g. "by agreement")', evidence: '' };
  }
  if (candidate.pricePlaceholder) {
    return { id: 'price', label: 'Asking price is stated on the page', critical: true, ok: false, detail: `price reads "${candidate.priceRaw}", i.e. a placeholder, not an offer`, evidence: '' };
  }
  const found = findNumber(pageText, candidate.priceEur);
  const withinBudget = candidate.priceEur <= budgetEur;
  return {
    id: 'price',
    label: 'Asking price is stated on the page',
    critical: true,
    ok: found.ok && withinBudget,
    detail: found.ok
      ? `€${candidate.priceEur} found on the page; ${withinBudget ? 'within' : 'OVER'} the €${budgetEur} budget`
      : `€${candidate.priceEur} from the list view does not appear on the detail page`,
    evidence: found.evidence,
  };
}

export function gateArea(candidate, pageText, minAreaM2) {
  if (!candidate.areaM2) {
    return { id: 'area', label: 'Plot size is stated on the page', critical: false, ok: false, detail: 'no m² figure found for this listing', evidence: '' };
  }
  const found = findNumber(pageText, candidate.areaM2);
  const bigEnough = candidate.areaM2 >= minAreaM2;
  return {
    id: 'area',
    label: 'Plot size is stated on the page',
    critical: false,
    ok: found.ok && bigEnough,
    detail: `${candidate.areaM2} m² ${bigEnough ? 'meets' : 'is below'} the ${minAreaM2} m² floor`,
    evidence: found.evidence,
  };
}

export function gateLocation(candidate, pageText) {
  const town = String(candidate.location || '').split(',')[0].trim();
  if (!town) return { id: 'location', label: 'Location appears on the page', critical: false, ok: false, detail: 'listing shows no location', evidence: '' };
  const hay = fold(pageText);
  const ok = hay.includes(fold(town));
  const at = hay.indexOf(fold(town));
  return {
    id: 'location',
    label: 'Location appears on the page',
    critical: false,
    ok,
    detail: ok ? `"${town}" found on the page` : `"${town}" from the list view is missing from the page`,
    evidence: ok ? String(pageText).slice(Math.max(0, at - 60), at + 120).trim() : '',
  };
}

/** Keyword signals used for *ranking*, explicitly not for passing a gate. */
export function signals(candidate, pageText) {
  const hay = fold(`${candidate.description} ${pageText.slice(0, 4000)}`);
  const access = ACCESS_WORDS.filter((w) => hay.includes(fold(w)));
  const scenery = SCENERY_WORDS.filter((w) => hay.includes(fold(w)));
  return { access, scenery };
}

/**
 * Run every gate for one candidate.
 * @returns {{checks: object[], passed: number, failed: number, unverified: number, admissible: boolean}}
 */
export function runGates(candidate, pageText, request) {
  const checks = [
    gateType(candidate),
    gatePlausible(candidate, request),
    gateTitle(candidate, pageText),
    gatePrice(candidate, pageText, request.budgetEur),
    gateArea(candidate, pageText, request.minAreaM2),
    gateLocation(candidate, pageText),
  ];

  // Criteria the request declares as unverifiable stay unverifiable.
  for (const key of request.gates?.unverified ?? []) {
    checks.push({
      id: key,
      label: `${key[0].toUpperCase()}${key.slice(1)} — no mechanical source`,
      critical: false,
      ok: null,
      status: 'unverified',
      detail:
        key === 'legality'
          ? 'needs the municipal zoning plan or an authority statement'
          : key === 'climate'
            ? 'needs a cited climate dataset for this locality'
            : 'judged from listing prose only; not a gate',
      evidence: '',
    });
  }

  const passed = checks.filter((c) => c.ok === true).length;
  const failed = checks.filter((c) => c.ok === false).length;
  const unverified = checks.filter((c) => c.ok === null).length;
  // Admissible = every critical gate passed. Non-critical failures downgrade, not discard.
  const admissible = checks.filter((c) => c.critical).every((c) => c.ok === true);
  return { checks, passed, failed, unverified, admissible };
}
