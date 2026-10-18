/**
 * score.mjs — rank candidates by the weights the user set.
 *
 * Two rules keep this honest:
 *   1. Only measurable criteria contribute to the score. `climate`, `legality`
 *      and `scenery` are declared unverified, so their weight is reported as
 *      *excluded*) rather than silently diluted or, worse, scored by vibes.
 *   2. The score is a ranking device, never a verdict. Admissibility comes from
 *      the gates; a high score cannot rescue a failed critical gate.
 */

const SCENERY_WORDS = ['vyhlad', 'výhľad', 'les', 'potok', 'rybnik', 'rybník', 'jazero', 'kopec', 'hora', 'priroda', 'príroda', 'ticho', 'klud', 'kľud', 'luka', 'lúka', 'vinohrad'];

/** 0..1 — cheaper is better, linear to the budget. */
export function priceFit(priceEur, budgetEur) {
  if (!Number.isFinite(priceEur) || priceEur <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - priceEur / budgetEur));
}

/** 0..1 — bigger is better up to 3x the floor, then flat. */
export function areaFit(areaM2, minAreaM2) {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return 0;
  return Math.max(0, Math.min(1, areaM2 / (minAreaM2 * 3)));
}

/** 0..1 — how many access words the page mentions (capped at 4). */
export function accessFit(signalWords) {
  return Math.min(1, (signalWords?.access?.length ?? 0) / 4);
}

/** 0..1 — scenery words, used only when the user gives scenery weight. */
export function sceneryFit(signalWords) {
  return Math.min(1, (signalWords?.scenery?.length ?? 0) / 5);
}

export const MEASURABLE = ['price', 'area', 'access'];
export const UNVERIFIED_KEYS = ['scenery', 'climate', 'legality'];

/**
 * @param {object} candidate  parsed row + gate results
 * @param {object} weights    user weights, e.g. {price:30, area:15, access:15, scenery:20, climate:20}
 * @param {object} request    for budget / minArea
 */
export function scoreCandidate(candidate, weights, request) {
  const components = {
    price: priceFit(candidate.priceEur, request.budgetEur),
    area: areaFit(candidate.areaM2, request.minAreaM2),
    access: accessFit(candidate.signals),
    scenery: sceneryFit(candidate.signals),
  };

  const parts = [];
  let weighted = 0;
  let supportedWeight = 0;
  let declaredWeight = 0;

  for (const [key, weight] of Object.entries(weights || {})) {
    const w = Number(weight) || 0;
    declaredWeight += w;
    if (UNVERIFIED_KEYS.includes(key)) {
      parts.push({ key, weight: w, value: null, contribution: 0, counted: false, why: 'unverified — weight excluded' });
      continue;
    }
    const value = components[key] ?? 0;
    supportedWeight += w;
    weighted += w * value;
    parts.push({ key, weight: w, value: Math.round(value * 100) / 100, contribution: Math.round(w * value * 10) / 10, counted: true });
  }

  const score = supportedWeight > 0 ? Math.round((100 * weighted) / supportedWeight) : 0;
  return {
    score,
    parts,
    coverage: {
      supportedWeight,
      declaredWeight,
      percent: declaredWeight > 0 ? Math.round((100 * supportedWeight) / declaredWeight) : 0,
    },
  };
}

/** Descending score, then cheaper, then larger. Deterministic. */
export function rank(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if ((a.priceEur ?? Infinity) !== (b.priceEur ?? Infinity)) return (a.priceEur ?? Infinity) - (b.priceEur ?? Infinity);
  return (b.areaM2 ?? 0) - (a.areaM2 ?? 0);
}

export { SCENERY_WORDS };
