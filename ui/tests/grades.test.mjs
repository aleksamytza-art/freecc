/**
 * Tests for the capabilities ported from free-research-llm:
 *   - the provider roster and role routing
 *   - the mechanical grading rubric (verified / supported / weak / unsupported)
 *
 * The grading tests are the important ones: they pin the rubric's shape so a
 * silent "just make everything verified" change fails here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const UI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(UI_ROOT, ...p), 'utf8');

/* The three ported scripts are classic browser scripts sharing one global scope,
   so they have to be evaluated in that same order inside one context. */
const EXPORTS = [
  'EVIDENCE', 'GATES', 'INDEXES',
  'ENGINE_NODES', 'ENGINE_EDGES',
  'PROVIDERS', 'ROUTE_ORDER', 'SEARCH', 'NON_CHAT_MODEL',
  'GRADES', 'GRADE_STYLE', 'CHECK_DOC', 'domainOf', 'checksForNode',
  'gradeNode', 'gradeAll', 'gradeCounts', 'rollupVerdict',
];
const sandbox = vm.createContext({ URL, console });
vm.runInContext(
  [
    read('assets', 'data.js'),
    read('assets', 'providers.js'),
    read('assets', 'grades.js'),
    `;globalThis.__PORTED__={${EXPORTS.join(',')}};`,
  ].join('\n'),
  sandbox,
  { filename: 'ported-capabilities.js' },
);
const P = sandbox.__PORTED__;
const REGISTERS = { EVIDENCE: P.EVIDENCE, GATES: P.GATES, INDEXES: P.INDEXES };

/* ---------------------------------------------------------------- providers */

test('provider roster is internally consistent', () => {
  assert.ok(P.PROVIDERS.length >= 10, 'expected the full roster');
  const ids = P.PROVIDERS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate provider id');

  for (const p of P.PROVIDERS) {
    assert.ok(p.label && p.label.length > 2, `${p.id} needs a label`);
    assert.ok(['free', 'paid', 'local'].includes(p.tier), `${p.id} has tier ${p.tier}`);
    assert.ok(Array.isArray(p.roles) && p.roles.length > 0, `${p.id} needs a role`);
    for (const r of p.roles) assert.ok(['deep', 'fast', 'reviewer'].includes(r), `${p.id} has role ${r}`);
    assert.ok(typeof p.baseURL === 'string', `${p.id} needs a baseURL string`);
    assert.ok(Array.isArray(p.preferFast) && p.preferFast.length > 0, `${p.id} needs fast model preferences`);
    assert.ok(Array.isArray(p.preferDeep) && p.preferDeep.length > 0, `${p.id} needs deep model preferences`);
    assert.ok(p.note && p.note.length > 10, `${p.id} needs an honest note`);
    // keyEnv is either a variable name or explicitly null (keyless providers)
    assert.ok(p.keyEnv === null || /^[A-Z][A-Z0-9_]+$/.test(p.keyEnv), `${p.id} bad keyEnv ${p.keyEnv}`);
  }
});

test('role routing only references known providers', () => {
  const ids = new Set(P.PROVIDERS.map((p) => p.id));
  for (const role of ['deep', 'fast', 'reviewer']) {
    assert.ok(Array.isArray(P.ROUTE_ORDER[role]), `missing route order for ${role}`);
    assert.ok(P.ROUTE_ORDER[role].length >= 3, `${role} needs several options`);
    for (const id of P.ROUTE_ORDER[role]) assert.ok(ids.has(id), `${role} references unknown provider ${id}`);
    assert.equal(new Set(P.ROUTE_ORDER[role]).size, P.ROUTE_ORDER[role].length, `${role} has duplicates`);
  }
  // the reviewer must be able to differ from the producer, else the check is a no-op
  assert.notDeepEqual(P.ROUTE_ORDER.reviewer.slice(0, 1), P.ROUTE_ORDER.deep.slice(0, 1));
});

test('at least one provider is marked as verified on this machine', () => {
  const verified = P.PROVIDERS.filter((p) => p.verified).map((p) => p.id);
  assert.ok(verified.length >= 1, 'no provider was verified — the claim would be unsupported');
  for (const id of verified) assert.ok(['gemini', 'groq', 'openrouter'].includes(id), `unexpected verified provider ${id}`);
});

test('search backends are well formed and unique', () => {
  assert.ok(P.SEARCH.length >= 8);
  const envs = P.SEARCH.map((s) => s.env);
  assert.equal(new Set(envs).size, envs.length, 'duplicate search env var');
  for (const s of P.SEARCH) {
    assert.match(s.env, /^[A-Z][A-Z0-9_]+$/, `bad env ${s.env}`);
    assert.ok(s.label && s.note, `${s.env} needs a label and a note`);
  }
});

test('the non-chat model filter rejects non-chat models and keeps chat models', () => {
  const re = new RegExp(P.NON_CHAT_MODEL, 'i');
  for (const bad of ['text-embedding-3-large', 'whisper-large-v3', 'gemini-2.5-flash-image', 'llama-prompt-guard-2-22m', 'rerank-v3', 'tts-1']) {
    assert.ok(re.test(bad), `should filter out ${bad}`);
  }
  for (const good of ['gpt-oss-120b', 'openai/gpt-oss-20b', 'gemini-3.8-flash', 'qwen/qwen3.8-27b', 'mistral-large-latest', 'cohere/north-mini-code:free']) {
    assert.ok(!re.test(good), `should keep ${good}`);
  }
});

/* ------------------------------------------------------------------- grades */

test('domainOf extracts hosts and tolerates junk', () => {
  assert.equal(P.domainOf('https://www.npmjs.com/package/mikoshi-construct'), 'npmjs.com');
  assert.equal(P.domainOf('https://arxiv.org/abs/2305.05176'), 'arxiv.org');
  assert.equal(P.domainOf(''), '');
  assert.equal(P.domainOf(null), '');
  assert.equal(P.domainOf('not a url'), '');
});

test('the documented rubric cannot drift from the implemented one', () => {
  const ids = P.checksForNode({ ev: [], g: [], ix: [], oq: null }, REGISTERS).map((c) => c.id);
  const documented = P.CHECK_DOC.map((c) => c.id);
  assert.deepEqual(ids.slice().sort(), documented.slice().sort(),
    'CHECK_DOC and checksForNode must describe exactly the same checks');
  for (const doc of P.CHECK_DOC) {
    assert.ok(doc.label && doc.why, `${doc.id} needs a label and a reason`);
  }
});

test('every engine node gets exactly one grade from the allowed set', () => {
  const grades = P.gradeAll(P.ENGINE_NODES, REGISTERS);
  assert.equal(Object.keys(grades).length, P.ENGINE_NODES.length);
  for (const [id, g] of Object.entries(grades)) {
    assert.ok(P.GRADES.includes(g.grade), `${id} produced grade ${g.grade}`);
    assert.ok(g.score >= 0 && g.score <= 100, `${id} score out of range`);
    assert.equal(g.escalate, g.grade === 'weak' || g.grade === 'unsupported', `${id} escalate flag inconsistent`);
    assert.equal(g.checks.length, P.CHECK_DOC.length, `${id} check count`);
  }
});

test('unsupported is exactly "a critical check failed"', () => {
  const grades = P.gradeAll(P.ENGINE_NODES, REGISTERS);
  for (const [id, g] of Object.entries(grades)) {
    const criticalFail = g.checks.some((c) => c.critical && !c.passed);
    assert.equal(g.grade === 'unsupported', criticalFail, `${id} grade/critical-failure mismatch`);
  }
});

test('verified requires both corroboration and a gate', () => {
  const grades = P.gradeAll(P.ENGINE_NODES, REGISTERS);
  for (const [id, g] of Object.entries(grades)) {
    if (g.grade !== 'verified') continue;
    const domains = g.checks.find((c) => c.id === 'independent-domains');
    const gate = g.checks.find((c) => c.id === 'gate-coverage');
    assert.ok(domains.passed && gate.passed, `${id} is verified without 2 domains or a gate`);
  }
});

test('grading is deterministic', () => {
  const a = P.gradeNode(P.ENGINE_NODES[0], REGISTERS);
  const b = P.gradeNode(P.ENGINE_NODES[0], REGISTERS);
  assert.equal(a.grade, b.grade);
  assert.equal(a.score, b.score);
});

test('a fabricated citation makes a node unsupported, and gaps cannot be verified', () => {
  const fabricated = {
    id: 'X1', t: 'fabricated', d: 'made up', ev: ['E999'], g: ['G01'], ix: [], p: 'P0', w: 5, st: 'resolved', oq: null,
  };
  const g = P.gradeNode(fabricated, REGISTERS);
  assert.equal(g.grade, 'unsupported', 'a citation to a non-existent ledger entry must not pass');

  const gap = { id: 'X2', t: 'gap', d: 'no evidence', ev: [], g: [], ix: [], p: 'P0', w: 5, st: 'open', oq: null };
  assert.equal(P.gradeNode(gap, REGISTERS).grade, 'unsupported', 'an evidence gap cannot be verified or supported');

  // status is a claim, not a measurement: "resolved" does not lift the grade
  const resolvedGap = { ...gap, st: 'resolved' };
  assert.equal(P.gradeNode(resolvedGap, REGISTERS).grade, 'unsupported');
});

test('grade counts add up', () => {
  const grades = P.gradeAll(P.ENGINE_NODES, REGISTERS);
  const counts = P.gradeCounts(grades);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(total, P.ENGINE_NODES.length);
  for (const key of Object.keys(counts)) assert.ok(P.GRADES.includes(key), `unexpected grade bucket ${key}`);
});

test('rollup verdict follows the worst grade on the path', () => {
  const mk = (grade) => ({ grade, score: 50, checks: [], failures: [], escalate: grade === 'weak' || grade === 'unsupported' });
  const path = ['A', 'B'];

  assert.equal(P.rollupVerdict(path, { A: mk('verified'), B: mk('supported') }).verdict, 'GO');
  assert.equal(P.rollupVerdict(path, { A: mk('verified'), B: mk('weak') }).verdict, 'GO-IF');
  assert.equal(P.rollupVerdict(path, { A: mk('weak'), B: mk('unsupported') }).verdict, 'NO-GO');
  assert.equal(P.rollupVerdict([], {}).verdict, 'GO', 'an empty path has nothing against it');
});
