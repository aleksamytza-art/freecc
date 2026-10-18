#!/usr/bin/env node
/**
 * run.mjs — the research runner.
 *
 *   node research/run.mjs                                  # uses research/request.json
 *   node research/run.mjs --count 10 --budget 20000        # adjust the target
 *   node research/run.mjs --dry                            # decomposition only, no network
 *
 * What it does, in order:
 *   1. decompose the request into an adjustable tree            (decompose.mjs)
 *   2. query the real source and parse the listing rows         (sources/bazos.mjs)
 *   3. shortlist by the user's hard budget, then fetch each plot's own page
 *   4. run the mechanical gates against that page               (gates.mjs)
 *   5. score and rank by the user's weights                     (score.mjs)
 *   6. write ui/data/research-latest.js  (the UI reads this) and a markdown report
 *
 * Politeness: one request per query, one per shortlisted plot, at least 700 ms
 * apart, with a hard cap on detail pages. It is a demonstrator, not a crawler.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decompose, criteriaReport } from './decompose.mjs';
import { buildSearchUrl, isLand, parseRows, pricePlausible, SOURCE } from './sources/bazos.mjs';
import { htmlToText } from './text.mjs';
import { runGates, signals } from './gates.mjs';
import { rank, scoreCandidate } from './score.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(HERE, '..');

/* ------------------------------------------------------------------ args */
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const DRY = argv.includes('--dry');
const REQUEST_PATH = arg('request', join(HERE, 'request.json'));
const MAX_DETAIL_PAGES = Number(arg('maxDetails', '16'));
const DELAY_MS = Number(arg('delay', '750'));

const request = JSON.parse(readFileSync(REQUEST_PATH, 'utf8'));
request.count = Number(arg('count', request.count));
request.budgetEur = Number(arg('budget', request.budgetEur));
request.minAreaM2 = Number(arg('minArea', request.minAreaM2));

const tree = decompose(request);
const criteria = criteriaReport(tree);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'sk,cs,en;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, ms: Date.now() - t0, url: res.url };
  } catch (error) {
    return { ok: false, status: 0, text: '', ms: Date.now() - t0, url, error: String(error.message || error) };
  }
}

/* ------------------------------------------------------- 1. show the tree */
console.log('\nRESEARCH —— ' + request.goal);
console.log('='.repeat(78));
console.log(`budget €${request.budgetEur} · want ${request.count} plots · min ${request.minAreaM2} m²`);
console.log(`mechanical criteria : ${criteria.mechanical.join(' · ')}`);
console.log(`unverified criteria : ${criteria.unverified.map((u) => u.label).join(' · ')}`);
for (const node of tree.nodes) {
  const mark = node.kind === 'mechanical' ? '✓ gate' : '? unverified';
  console.log(`  ${node.id}  ${node.label.padEnd(34)} ${mark.padEnd(13)} weight ${node.adjustable.value}`);
}
if (DRY) {
  console.log('\n--dry: decomposition only, no requests made.');
  process.exit(0);
}

/* ---------------------------------------------------- 2. search + parse */
const stats = { queries: 0, searchPages: 0, rowsSeen: 0, rejectedType: 0, rejectedImplausible: 0, filteredByBudget: 0, duplicates: 0, detailPages: 0, fetchFailures: 0, admissible: 0 };
const seen = new Set();
const rows = [];
const sourceLog = [];
const rejections = { type: 0, implausible: 0, budget: 0, duplicate: 0 };

/* Queries that collapse to the same URL are fetched once. */
const searchUrls = [];
for (const q of request.queries ?? ['']) {
  const u = buildSearchUrl(request.source?.searchUrl, { q, max: request.budgetEur });
  if (!searchUrls.includes(u)) searchUrls.push(u);
}

for (const url of searchUrls) {
  stats.queries += 1;
  const page = await get(url);
  const parsed = parseRows(page.text);
  /* bazos answers 404 while serving a valid body, so rows decide usability,
     not the status code. The status is still recorded, honestly, below. */
  sourceLog.push({ kind: 'search', url, status: page.status, bytes: page.text.length, rows: parsed.length });
  if (!parsed.length) {
    console.log(`  ! search unusable (status ${page.status}, ${page.text.length} bytes)`);
    continue;
  }
  stats.searchPages += 1;
  stats.rowsSeen += parsed.length;
  console.log(`  search ${url.replace(/^https:\/\//, '')} -> ${parsed.length} rows (status ${page.status})`);
  for (const row of parsed) {
    if (seen.has(row.url)) { stats.duplicates += 1; rejections.duplicate += 1; continue; }
    seen.add(row.url);
    row.searchUrl = url;
    if (!isLand(row)) { stats.rejectedType += 1; rejections.type += 1; continue; }
    if (row.priceEur === null || row.pricePlaceholder || row.priceEur > request.budgetEur) { stats.filteredByBudget += 1; rejections.budget += 1; continue; }
    const plaus = pricePlausible(row, request.plausibility);
    if (!plaus.ok) { stats.rejectedImplausible += 1; rejections.implausible += 1; continue; }
    rows.push(row);
  }
  await sleep(DELAY_MS);
}

console.log(`\nshortlist pool: ${rows.length} land plots at or under €${request.budgetEur}`);
console.log(`  rejected: ${rejections.type} not land · ${rejections.implausible} implausible price · ${rejections.budget} over budget/unpriced · ${rejections.duplicate} duplicates`);

/* ------------------------------------------- 3. fetch pages + run gates */
/* Prefer plots whose size is already known to clear the floor; the cheapest plot
   in the category is usually a 200 m² garden, which is not a candidate at all. */
const bigEnough = rows.filter((r) => r.areaM2 && r.areaM2 >= request.minAreaM2).sort((a, b) => a.priceEur - b.priceEur);
const rest = rows.filter((r) => !(r.areaM2 && r.areaM2 >= request.minAreaM2)).sort((a, b) => a.priceEur - b.priceEur);
const shortlist = [...bigEnough, ...rest].slice(0, MAX_DETAIL_PAGES);
console.log(`shortlisted ${shortlist.length} for page-level gates (${bigEnough.length} already show ≥ ${request.minAreaM2} m²)`);

const candidates = [];

for (const [i, row] of shortlist.entries()) {
  if (i > 0) await sleep(DELAY_MS);
  const page = await get(row.url);
  stats.detailPages += 1;
  sourceLog.push({ kind: 'detail', url: row.url, status: page.status, bytes: page.text.length, ok: page.ok });
  if (!page.ok) {
    stats.fetchFailures += 1;
    console.log(`  ! detail failed (${page.status}) ${row.url}`);
    candidates.push({ ...row, fetchFailed: true, gates: null, score: 0, parts: [], coverage: { supportedWeight: 0, declaredWeight: 0, percent: 0 } });
    continue;
  }
  const text = htmlToText(page.text);
  const gates = runGates(row, text, request);
  const sig = signals(row, text);
  const scored = scoreCandidate({ ...row, signals: sig }, request.weights, request);
  if (gates.admissible) stats.admissible += 1;
  candidates.push({
    ...row,
    signals: sig,
    gates,
    score: scored.score,
    parts: scored.parts,
    coverage: scored.coverage,
    pageBytes: page.text.length,
    fetchedAt: new Date().toISOString(),
    excerpt: text.slice(0, 320),
  });
  const badge = gates.admissible ? 'ADMISSIBLE' : 'blocked';
  console.log(`  ${String(i + 1).padStart(2)}. €${String(row.priceEur).padStart(6)}  ${badge.padEnd(10)} score ${String(scored.score).padStart(3)}  ${row.title.slice(0, 46)}`);
}

/* ------------------------------------------------------------ 4. rank */
const ranked = candidates.slice().sort(rank).slice(0, request.count);
const result = {
  request,
  tree,
  criteria,
  source: { id: SOURCE.id, label: SOURCE.label, home: SOURCE.home },
  generatedAt: new Date().toISOString(),
  stats: { ...stats, shortlisted: shortlist.length, returned: ranked.length },
  sourceLog,
  candidates: ranked,
  notes: [
    'Prices, sizes and locations are taken from the listing page and re-checked against that same page.',
    'Climate, legality and scenery have no mechanical source in this run: they are listed as gaps, not scored as true.',
    'One request per query and per shortlisted plot, at least 750 ms apart. This is a demonstrator, not a crawler.',
  ],
};

/* --------------------------------------------------------- 5. write out */
mkdirSync(join(UI_ROOT, 'data'), { recursive: true });
mkdirSync(join(HERE, 'reports'), { recursive: true });
writeFileSync(join(UI_ROOT, 'data', 'research-latest.js'), `window.RESEARCH = ${JSON.stringify(result, null, 2)};\n`, 'utf8');

const stamp = result.generatedAt.replace(/[:.]/g, '-');
const md = [];
md.push(`# Research — ${request.goal}`, '');
md.push(`Generated ${result.generatedAt} · source: ${SOURCE.label} · ${ranked.length} of ${shortlist.length} shortlisted · ${stats.admissible} admissible`, '');
md.push('| # | price | m² | location | score | gates | listing |', '|---|---|---|---|---|---|---|');
ranked.forEach((c, i) => {
  const g = c.gates ? `${c.gates.passed}✓ ${c.gates.failed}✗ ${c.gates.unverified}?` : 'fetch failed';
  md.push(`| ${i + 1} | ${c.priceEur ? '€' + c.priceEur : '?'} | ${c.areaM2 ?? '?'} | ${c.location || '?'} | ${c.score} | ${g} | [${c.title.slice(0, 40)}](${c.url}) |`);
});
md.push('', '## Gates per candidate', '');
for (const c of ranked) {
  md.push(`### ${c.title}`, '', `- listing: ${c.url}`, `- score ${c.score} · weight coverage ${c.coverage.percent}%`);
  for (const check of c.gates?.checks ?? []) {
    const mark = check.ok === true ? 'PASS' : check.ok === false ? 'FAIL' : 'UNVERIFIED';
    md.push(`  - **${mark}** ${check.label} — ${check.detail}`);
  }
  md.push('');
}
writeFileSync(join(HERE, 'reports', `research-${stamp}.md`), md.join('\n'), 'utf8');

console.log('\n' + '='.repeat(78));
console.log(`admissible: ${stats.admissible}/${stats.detailPages} · returned ${ranked.length}`);
console.log(`wrote ui/data/research-latest.js and research/reports/research-${stamp}.md`);
for (const c of ranked.slice(0, 5)) {
  console.log(`  €${c.priceEur}  score ${c.score}  ${c.location}  ${c.url.slice(0, 60)}`);
}
