/**
 * Data invariants for the FREECC UI.
 *
 * These encode the app's own truth rules as machine checks, so the numbers on
 * screen can never silently disagree with the ledger:
 *   - no claim without an E#            (rule 2)
 *   - every gate/index/prompt id exists  (rule 1/6)
 *   - one prompt body per prompt entry
 *   - the dependency graph is a real DAG
 *
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const UI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(UI_ROOT, ...p), 'utf8');

/* data.js is a classic browser script (top-level consts). Load it in a VM and
   export the bindings explicitly, since lexical declarations stay script-local. */
const EXPORTS = [
  'EVIDENCE', 'GATES', 'INDEXES', 'PROMPTS', 'TRUTH_RULES',
  'ENGINE_NODES', 'ENGINE_EDGES', 'LEX', 'GENERIC_SUBS',
];
const sandbox = vm.createContext({});
vm.runInContext(
  `${read('assets', 'data.js')}
;globalThis.__DATA__={${EXPORTS.join(',')}};`,
  sandbox,
  { filename: 'assets/data.js' },
);
const D = sandbox.__DATA__;
const html = read('index.html');

const ids = (rows) => rows.map((r) => r.id);
const PAD = { E: 1, P: 1, I: 1, G: 2 };
const isSequential = (rows, prefix, count, start = 1) => {
  const expected = Array.from(
    { length: count },
    (_, i) => `${prefix}${String(start + i).padStart(PAD[prefix], '0')}`,
  );
  return JSON.stringify(ids(rows)) === JSON.stringify(expected);
};

test('evidence ledger E1–E19 is complete and unique', () => {
  assert.equal(D.EVIDENCE.length, 19);
  assert.ok(isSequential(D.EVIDENCE, 'E', 19), `unexpected ids: ${ids(D.EVIDENCE).join(',')}`);
  for (const e of D.EVIDENCE) {
    assert.ok(['P', 'S', 'E', 'P+E', 'P+S'].includes(e.t), `E${e.id}: odd type ${e.t}`);
    assert.ok(e.c && e.c.length > 20, `${e.id} needs a claim description`);
  }
});

test('every evidence row of type E or P carries a source or an empirical note', () => {
  for (const e of D.EVIDENCE) {
    const empirical = e.t === 'E';
    assert.ok(empirical ? e.c.length > 0 : /^https?:\/\//.test(e.u), `${e.id} needs a URL`);
  }
});

test('gate report G01–G18 exists and every gate passed', () => {
  assert.equal(D.GATES.length, 18);
  assert.ok(isSequential(D.GATES, 'G', 18), `unexpected ids: ${ids(D.GATES).join(',')}`);
  const failing = D.GATES.filter((g) => g.s !== 'PASS');
  assert.equal(failing.length, 0, `gates not PASS: ${failing.map((g) => `${g.id}=${g.s}`).join(', ')}`);
});

test('spectral indexes I1–I9 each have an instrument', () => {
  assert.equal(D.INDEXES.length, 9);
  assert.ok(isSequential(D.INDEXES, 'I', 9));
  for (const x of D.INDEXES) assert.ok(x.i && x.i.length > 3, `${x.id} needs an instrument`);
});

test('prompt library P0–P8 is complete and has a body in the HTML', () => {
  assert.equal(D.PROMPTS.length, 9);
  assert.ok(isSequential(D.PROMPTS, 'P', 9, 0), `unexpected ids: ${ids(D.PROMPTS).join(',')}`);
  for (const p of D.PROMPTS) {
    assert.ok(html.includes(`id="tpl-${p.id}"`), `${p.id} has no <script type="text/template" id="tpl-${p.id}">`);
  }
  const bodies = [...html.matchAll(/<script type="text\/template" id="tpl-P\d">([\s\S]*?)<\/script>/g)];
  assert.equal(bodies.length, 9, 'expected 9 prompt templates');
  for (const [, body] of bodies) assert.ok(body.trim().length > 300, 'prompt body looks truncated');
});

test('the seven truth rules are present', () => {
  assert.equal(D.TRUTH_RULES.length, 7);
  D.TRUTH_RULES.forEach((r, i) => assert.match(r, new RegExp(`^${i + 1} · `)));
});

test('engine tree ids are unique and complete', () => {
  const nodeIds = ids(D.ENGINE_NODES);
  assert.equal(new Set(nodeIds).size, nodeIds.length, 'duplicate node id');
  for (const required of ['L1', 'C1', 'C2', 'C3', 'C4', 'C5']) {
    assert.ok(nodeIds.includes(required), `missing engine node ${required}`);
  }
  for (const n of D.ENGINE_NODES) {
    assert.ok(n.t && n.t.length > 3, `${n.id} needs a title`);
    assert.ok(n.d && n.d.length > 10, `${n.id} needs a description`);
    assert.ok(n.w >= 1 && n.w <= 10, `${n.id} weight out of range`);
    assert.ok(['open', 'resolved', 'working'].includes(n.st), `${n.id} bad status ${n.st}`);
  }
});

test('no claim without an E# — every engine node cites evidence or is an open question', () => {
  const evidenceIds = new Set(ids(D.EVIDENCE));
  const gateIds = new Set(ids(D.GATES));
  const indexIds = new Set(ids(D.INDEXES));
  const promptIds = new Set(ids(D.PROMPTS));

  for (const n of D.ENGINE_NODES) {
    for (const e of n.ev) assert.ok(evidenceIds.has(e), `${n.id} cites unknown evidence ${e}`);
    for (const g of n.g) assert.ok(gateIds.has(g), `${n.id} cites unknown gate ${g}`);
    for (const i of n.ix) assert.ok(indexIds.has(i), `${n.id} cites unknown index ${i}`);
    assert.ok(promptIds.has(n.p), `${n.id} cites unknown prompt ${n.p}`);
    if (n.ev.length === 0) {
      assert.ok(n.oq, `${n.id} has neither evidence nor an open question (truth rule 2)`);
    }
  }
});

test('dependency edges reference known nodes, are not self-loops, and form a DAG', () => {
  const nodeIds = new Set(ids(D.ENGINE_NODES));
  for (const [from, to] of D.ENGINE_EDGES) {
    assert.ok(nodeIds.has(from), `edge from unknown node ${from}`);
    assert.ok(nodeIds.has(to), `edge to unknown node ${to}`);
    assert.notEqual(from, to, `self-loop at ${from}`);
  }

  const adj = new Map();
  for (const [from, to] of D.ENGINE_EDGES) {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from).push(to);
  }
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map([...nodeIds].map((id) => [id, WHITE]));
  const stack = [];
  const visit = (id) => {
    colour.set(id, GREY);
    stack.push(id);
    for (const next of adj.get(id) || []) {
      if (colour.get(next) === GREY) {
        throw new Error(`cycle: ${[...stack.slice(stack.indexOf(next)), next].join(' -> ')}`);
      }
      if (colour.get(next) === WHITE) visit(next);
    }
    stack.pop();
    colour.set(id, BLACK);
  };
  for (const id of nodeIds) if (colour.get(id) === WHITE) visit(id);
});

test('generator lexicon is well formed', () => {
  assert.ok(D.LEX.length >= 4, 'expected several outcome domains');
  const seen = new Set();
  for (const entry of D.LEX) {
    assert.ok(entry.k && /^[a-z]+$/.test(entry.k), `bad domain key ${entry.k}`);
    assert.ok(!seen.has(entry.k), `duplicate domain ${entry.k}`);
    seen.add(entry.k);
    assert.ok(Array.isArray(entry.kw) && entry.kw.length > 0, `${entry.k} needs keywords`);
    assert.ok(entry.title && entry.title.length > 3, `${entry.k} needs a title`);
    assert.ok(entry.l0 && entry.l0.length > 3, `${entry.k} needs an L0 outcome line`);
    assert.ok(Array.isArray(entry.subs) && entry.subs.length > 0, `${entry.k} needs sub-issues`);
  }
  assert.ok(D.GENERIC_SUBS.length > 0, 'a generic fallback pipeline must exist');
});

test('generated sub-issues cite real evidence and gates', () => {
  const evidenceIds = new Set(ids(D.EVIDENCE));
  const promptIds = new Set(ids(D.PROMPTS));
  const allSubs = [...D.LEX.flatMap((e) => e.subs), ...D.GENERIC_SUBS];

  const subIds = allSubs.map((s) => s.id);
  assert.equal(new Set(subIds).size, subIds.length, 'duplicate sub-issue id');

  for (const s of allSubs) {
    assert.match(s.id, /^[A-Z]{2}\.\d+$/, `odd sub-issue id ${s.id}`);
    assert.ok(s.t && s.d, `${s.id} needs a title and description`);
    assert.ok(s.w >= 1 && s.w <= 10, `${s.id} weight out of range`);
    assert.ok(promptIds.has(s.p), `${s.id} cites unknown prompt ${s.p}`);
    for (const e of s.ev) assert.ok(evidenceIds.has(e), `${s.id} cites unknown evidence ${e}`);
    if (s.ev.length === 0) {
      assert.ok(s.oq, `${s.id} has neither evidence nor an open question (truth rule 2)`);
    }
  }
});

test('index.html loads the app assets, in order, and nothing external', () => {
  const order = ['assets/data.js', 'assets/app.js'].map((f) => html.indexOf(f));
  assert.ok(order.every((i) => i >= 0), 'both scripts must be referenced');
  assert.ok(order[0] < order[1], 'data.js must load before app.js (it defines the ledgers)');
  assert.ok(html.includes('assets/styles.css'), 'stylesheet must be linked');

  for (const file of ['assets/data.js', 'assets/app.js', 'assets/styles.css']) {
    assert.ok(existsSync(join(UI_ROOT, file)), `${file} is missing`);
  }

  const external = [...html.matchAll(/(?:src|href)\s*=\s*"((?:https?:)?\/\/[^"]+)"/gi)].map((m) => m[1]);
  assert.deepEqual(external, [], 'the app must not load anything over the network');
  assert.doesNotMatch(read('assets', 'styles.css'), /url\(\s*['"]?https?:/i, 'no remote CSS assets');
});

test('the app is genuinely dependency-free', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies, undefined, 'runtime dependencies break the offline claim');
  assert.equal(pkg.devDependencies, undefined, 'dev dependencies are unnecessary here');
  assert.equal(pkg.private, true, 'this package is not meant to be published to npm');
});

test('reference original is preserved for the equivalence proof', () => {
  const original = join(UI_ROOT, 'reference', 'freecc-ui.original.html');
  assert.ok(existsSync(original), 'reference/freecc-ui.original.html missing');
  const src = readFileSync(original, 'utf8');
  assert.ok(src.includes('id="app"'), 'original should still be the single-file version');
  assert.ok(src.length > 70000, 'original looks truncated');
});
