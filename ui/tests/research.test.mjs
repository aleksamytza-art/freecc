/**
 * Tests for the research core: parsing, the mechanical gates, scoring and the
 * browser/Node parity of the re-scoring maths.
 *
 * These are pure-function tests over fixtures — no network, no browser — so they
 * run in CI on every push. The live crawl is exercised by `node research/run.mjs`,
 * which is a deliberate, rate-limited action rather than something CI should do.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { parseArea, parsePrice, parseRows, isLand, pricePlausible } from '../research/sources/bazos.mjs';
import { gateType, runGates } from '../research/gates.mjs';
import { decompose, criteriaReport } from '../research/decompose.mjs';
import { scoreCandidate, rank } from '../research/score.mjs';

const UI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(UI_ROOT, ...p), 'utf8');

/* Two rows copied from a real result page, trimmed to the relevant markup. */
const FIXTURE = `
<div class="inzeraty inzeratyflex">
<div class="inzeratynadpis"><a href="https://reality.bazos.sk/inzerat/1/pozemok-zahrada.php"><img src="x.jpg" alt=""></a>
<h2 class=nadpis><a href="https://reality.bazos.sk/inzerat/1/pozemok-zahrada.php">Pozemok záhrada</a></h2>
<div class=popis>Predám pozemok 1 200 m2 v obci Lúky, prístup z cesty, elektrina na hranici.</div>
</div>
<div class="inzeratycena"><b><span translate="no"> 5 000 €</span></b></div>
<div class="inzeratylok">Považská Bystrica<br>018 12</div>
<div class="inzeratyview">12 x</div>
</div>
<div class="inzeraty inzeratyflex">
<div class="inzeratynadpis"><h2 class=nadpis><a href="https://sluzby.bazos.sk/inzerat/2/kupacia-kada.php">Kupacia kada</a></h2></div>
<div class="inzeratycena"><b><span translate="no"> 2 599 €</span></b></div>
<div class="inzeratylok">Dolný Kubín<br>026 01</div>
</div>
`;

test('price text is parsed into a number, and placeholders are flagged', () => {
  assert.equal(parsePrice('12 500 €').value, 12500);
  assert.equal(parsePrice('690 €').value, 690);
  assert.equal(parsePrice('1 €').value, 1);
  assert.equal(parsePrice('1 €').placeholder, true, '"1 €" is how sellers write "make an offer"');
  assert.equal(parsePrice('Cena dohodou').value, null);
  assert.equal(parsePrice('').value, null);
});

test('area is parsed from several spacings', () => {
  assert.equal(parseArea('8 325 m²'), 8325);
  assert.equal(parseArea('3000m2'), 3000);
  assert.equal(parseArea('1 674 m2'), 1674);
  assert.equal(parseArea('no size here'), null);
});

test('listing rows parse into candidates with absolute urls', () => {
  const rows = parseRows(FIXTURE);
  assert.equal(rows.length, 2);
  const [first, second] = rows;
  assert.equal(first.title, 'Pozemok záhrada');
  assert.equal(first.priceEur, 5000);
  assert.equal(first.areaM2, 1200);
  assert.equal(first.location, 'Považská Bystrica, 018 12');
  assert.match(first.url, /^https:\/\/reality\.bazos\.sk\/inzerat\/1\//);
  assert.equal(second.priceEur, 2599);
});

test('land filter rejects an apartment and an object even when they mention m2', () => {
  assert.equal(isLand({ title: '2-izbový byt 59m2', description: 'pekný byt' }), false);
  assert.equal(isLand({ title: 'Kupacia kada', description: 'sud virivka' }), false);
  assert.equal(isLand({ title: 'Pozemok 8390 m2', description: 'lúka pri lese' }), true);
});

test('price plausibility rejects placeholders and unit-price outliers', () => {
  const opts = { minPriceEur: 300, maxPricePerM2: 400 };
  assert.equal(pricePlausible({ priceEur: 1, pricePlaceholder: true, priceRaw: '1 €' }, opts).ok, false);
  assert.equal(pricePlausible({ priceEur: 100, priceRaw: '100 €' }, opts).ok, false);
  assert.equal(pricePlausible({ priceEur: 5000, priceRaw: '5 000 €', areaM2: 1200 }, opts).ok, true);
  assert.equal(pricePlausible({ priceEur: 9000, priceRaw: '9 000 €', areaM2: 10 }, opts).ok, false, '€900/m² is not a land price');
});

test('the type gate trusts the site category over the wording', () => {
  const land = { title: 'Pozemok záhrada', description: 'lúka', url: 'https://reality.bazos.sk/inzerat/1/x.php' };
  const service = { title: 'Pozemok a kade', description: 'kúpacia kada', url: 'https://sluzby.bazos.sk/inzerat/2/y.php' };
  assert.equal(gateType(land).ok, true);
  assert.equal(gateType(service).ok, false, 'a listing outside the real-estate section is not a plot');
});

test('gates pass only when the page itself contains the value, and show the excerpt', () => {
  const request = { budgetEur: 20000, minAreaM2: 800, gates: { unverified: ['legality', 'climate', 'scenery'] } };
  const candidate = {
    url: 'https://reality.bazos.sk/inzerat/1/pozemok-zahrada.php',
    title: 'Pozemok záhrada',
    priceEur: 5000,
    priceRaw: '5 000 €',
    pricePlaceholder: false,
    areaM2: 1200,
    location: 'Považská Bystrica, 018 12',
    description: 'Predám pozemok 1 200 m2 v obci Lúky, prístup z cesty, elektrina na hranici.',
  };
  const pageText = 'Pozemok záhrada. Cena 5 000 €. Výmera 1 200 m2. Obec Považská Bystrica. Prístup z cesty, elektrina.';
  const result = runGates(candidate, pageText, request);

  const byId = Object.fromEntries(result.checks.map((c) => [c.id, c]));
  assert.equal(byId.type.ok, true);
  assert.equal(byId.price.ok, true);
  assert.equal(byId.area.ok, true);
  assert.equal(byId.location.ok, true);
  assert.equal(result.admissible, true);
  // The gate is auditable: it returns the source excerpt that satisfied it.
  assert.match(byId.price.evidence, /5 ?000/);
  assert.match(byId.area.evidence, /1 ?200/);
  // Unverified criteria are never counted as passed.
  assert.equal(byId.legality.ok, null);
  assert.equal(result.unverified, 3);
});

test('a price on the list page but missing from the detail page fails the gate', () => {
  const request = { budgetEur: 20000, minAreaM2: 800, gates: { unverified: [] } };
  const candidate = {
    url: 'https://reality.bazos.sk/inzerat/1/x.php',
    title: 'Pozemok',
    priceEur: 5000,
    priceRaw: '5 000 €',
    pricePlaceholder: false,
    areaM2: null,
    location: 'Košice',
    description: 'pozemok',
  };
  const result = runGates(candidate, 'Pozemok bez ceny, dohodou.', request);
  const price = result.checks.find((c) => c.id === 'price');
  assert.equal(price.ok, false);
  assert.equal(result.admissible, false, 'a claim that the page does not support cannot be admissible');
});

test('decomposition exposes mechanically-checkable and unverified criteria separately', () => {
  const request = JSON.parse(read('research', 'request.json'));
  const tree = decompose(request);
  assert.equal(tree.nodes.length, 6);
  const { mechanical, unverified } = criteriaReport(tree);
  assert.equal(mechanical.length, 3);
  assert.equal(unverified.length, 3);
  for (const node of tree.nodes) {
    assert.ok(node.adjustable && node.adjustable.key, `${node.id} must be adjustable`);
    assert.ok(node.adjustable.value >= 0);
  }
  const legality = tree.nodes.find((n) => n.id === 'D6');
  assert.equal(legality.kind, 'unverified', 'legality can never become a mechanical gate by wishful thinking');
  assert.ok(legality.why);
});

test('scoring excludes unverified weights instead of scoring them', () => {
  const request = { budgetEur: 20000, minAreaM2: 800 };
  const candidate = { priceEur: 5000, areaM2: 1200, signals: { access: ['cesta', 'elektrina'], scenery: ['les'] } };
  const weights = { price: 30, area: 20, access: 15, scenery: 20, climate: 15 };
  const scored = scoreCandidate(candidate, weights, request);
  assert.ok(scored.score > 0 && scored.score <= 100);
  assert.equal(scored.coverage.supportedWeight, 65, 'only price+area+access are measurable');
  assert.equal(scored.coverage.declaredWeight, 100);
  assert.equal(scored.coverage.percent, 65);
  const excluded = scored.parts.filter((p) => !p.counted).map((p) => p.key).sort();
  assert.deepEqual(excluded, ['climate', 'scenery']);
});

test('ranking is deterministic and prefers score then price', () => {
  const rows = [
    { score: 80, priceEur: 5000, areaM2: 1000 },
    { score: 90, priceEur: 9000, areaM2: 1000 },
    { score: 80, priceEur: 3000, areaM2: 900 },
  ];
  const sorted = rows.slice().sort(rank);
  assert.deepEqual(sorted.map((r) => r.score), [90, 80, 80]);
  assert.equal(sorted[1].priceEur, 3000, 'ties break on price');
  assert.deepEqual(rows.slice().sort(rank), rows.slice().sort(rank), 'stable across calls');
});

test('the browser re-scoring agrees with the Node scorer (no silent drift)', () => {
  const view = read('assets', 'research-view.js');
  const sandbox = vm.createContext({
    window: { RESEARCH: { request: { budgetEur: 20000, minAreaM2: 800 }, candidates: [], tree: { nodes: [] }, criteria: { unverified: [] }, stats: {} } },
    document: { readyState: 'loading', addEventListener() {}, getElementById() { return null; } },
    console,
    Object,
    Number,
    Math,
    isFinite,
    String,
  });
  vm.runInContext(view, sandbox, { filename: 'research-view.js' });
  const browserScore = sandbox.window.__researchScore;
  assert.equal(typeof browserScore, 'function', 'research-view.js must expose its scorer for this check');

  const request = { budgetEur: 20000, minAreaM2: 800 };
  const cases = [
    { priceEur: 5000, areaM2: 1200, signals: { access: ['cesta'], scenery: ['les'] } },
    { priceEur: 19999, areaM2: 300, signals: { access: [], scenery: [] } },
    { priceEur: 1000, areaM2: 90000, signals: { access: ['cesta', 'voda', 'elektrina', 'plyn'], scenery: ['les', 'potok'] } },
  ];
  const weights = { price: 30, area: 20, access: 15, scenery: 20, climate: 15 };
  for (const candidate of cases) {
    const nodeResult = scoreCandidate(candidate, weights, request);
    const viewResult = browserScore(candidate, weights);
    assert.equal(viewResult.score, nodeResult.score, `score mismatch for €${candidate.priceEur}`);
    assert.equal(viewResult.coverage.percent, nodeResult.coverage.percent);
  }
});
