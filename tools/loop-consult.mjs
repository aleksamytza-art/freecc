#!/usr/bin/env node
/**
 * loop-consult.mjs — the LLM stage of the improvement loop.
 *
 *   node tools/loop-consult.mjs --role audit  --provider gemini --round 1
 *   node tools/loop-consult.mjs --role review --provider groq   --round 3
 *
 * It runs the audit, sends the audit + the relevant source to a free model, and
 * stores strictly-parsed findings in loop/. Two roles, deliberately on different
 * providers, mirroring the app's own rule that the verifier is never the doer:
 *
 *   audit  — "find what is wrong and rank it"            (producer of findings)
 *   review — "these fixes were made; what did they miss" (independent verifier)
 *
 * Nothing here edits the app. The loop's implement step is a human-agent step;
 * this only produces and verifies findings, so a bad suggestion cannot silently
 * change the code.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const UI = join(REPO, 'ui');
const LOOP = join(REPO, 'loop');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const ROLE = arg('role', 'audit');
const PROVIDER = arg('provider', ROLE === 'review' ? 'groq' : 'gemini');
const ROUND = arg('round', '1');

/* ------------------------------------------------------------------ keys */
const envText = readFileSync(join(REPO, 'router', '.env'), 'utf8');
const keys = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[2].trim()) keys[m[1]] = m[2].trim();
}

const MODELS = {
  gemini: { url: (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, auth: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-3.8-flash' },
  groq: { url: () => 'https://api.groq.com/openai/v1/chat/completions', auth: 'bearer', key: 'GROQ_API_KEY', model: 'openai/gpt-oss-120b' },
  openrouter: { url: () => 'https://openrouter.ai/api/v1/chat/completions', auth: 'bearer', key: 'OPENROUTER_API_KEY', model: 'nvidia/nemotron-3-super-120b-a12b:free' },
};

/* ------------------------------------------------------------------ audit */
function auditJson() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['scripts/audit.mjs', '--json'], { cwd: UI });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', () => {
      try { resolvePromise(JSON.parse(out)); } catch (e) { reject(new Error(`audit output not JSON: ${e.message}\n${err.slice(0, 300)}`)); }
    });
  });
}

/* --------------------------------------------------------------- context */
/* Free providers cap tokens-per-minute (Groq: 8000 TPM), so the context has a
   hard character budget per provider rather than "send everything and hope". */
const CONTEXT_BUDGET = { gemini: 22000, groq: 11000, openrouter: 20000 };

function contextFor(role, provider) {
  const html = readFileSync(join(UI, 'index.html'), 'utf8');
  const css = readFileSync(join(UI, 'assets', 'styles.css'), 'utf8');
  const appJs = readFileSync(join(UI, 'assets', 'app.js'), 'utf8');
  // function-level outline rather than 38 KB of code: enough to reason about structure
  const outline = [...appJs.matchAll(/^function ([A-Za-z0-9_]+)\(([^)]*)\)/gm)].map((m) => `${m[1]}(${m[2]})`).join('\n');
  const navSection = (html.match(/<header[\s\S]*?<\/header>/) || [''])[0];
  const budget = CONTEXT_BUDGET[provider] || 11000;
  const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}\n... [clipped ${s.length - n} chars]` : s);
  const half = Math.floor(budget / 2);

  if (role === 'review') {
    return `HEADER + NAV (current):\n${clip(navSection, 2500)}\n\nSTYLES.CSS (current, clipped):\n${clip(css, half)}\n\nAPP.JS OUTLINE:\n${clip(outline, 2000)}`;
  }
  return `HEADER / NAV MARKUP:\n${clip(navSection, 3000)}\n\nSTYLES.CSS:\n${clip(css, half)}\n\nAPP.JS FUNCTION OUTLINE:\n${clip(outline, 2500)}`;
}

/* ------------------------------------------------------------------ prompt */
function promptFor(role, audit, context) {
  const rubric = `The app is a zero-dependency static single-page planning console (ES5-style classic
scripts, no build step, must run from file://). It enforces "no claim without evidence" and grades
every issue mechanically. Its scorecard is ui/QUALITY.md.`;

  if (role === 'audit') {
    return `${rubric}

You are an independent auditor. Below are measured audit numbers and the relevant source.
Find the highest-value PROBLEMS that the audit numbers reveal or imply.

Rules:
- Only propose changes that are verifiable by a script or a screenshot. No vague advice.
- Prefer accessibility, responsiveness, correctness and honesty over new features.
- Do not propose adding dependencies, a build step, or network calls: those would break the app's contract.
- Do not propose inflating the grade distribution; it is mechanical on purpose.
- Each finding must name the concrete acceptance check that proves it is fixed.

AUDIT (measured, do not re-derive):
${JSON.stringify(audit, null, 2)}

${context}

Reply with ONLY minified JSON, no prose, exactly this shape:
{"summary":"one sentence","findings":[{"id":"F1","title":"...","severity":"high|medium|low","category":"a11y|responsive|performance|correctness|honesty","evidence":"what in the audit proves it","fix":"what to change, concretely","acceptance":"the check that proves it fixed"}]}
Give at most 8 findings, ordered by severity then by (impact / effort).`;
  }

  return `${rubric}

You are an independent verifier. Someone else just improved this app; do not trust their claims.
Judge the CURRENT state against the audit numbers and the source below.

Rules:
- Report only defects you can justify from the material given.
- Explicitly confirm which scorecard targets the evidence supports and which it does not.
- If a target is not provable from this material, say so instead of assuming it passes.

AUDIT AFTER THE CHANGES (measured):
${JSON.stringify(audit, null, 2)}

${context}

Reply with ONLY minified JSON, no prose, exactly this shape:
{"verdict":"pass|pass_with_issues|fail","confirmed":["Q1 ..."],"unproven":["Q11 ..."],"findings":[{"id":"R1","title":"...","severity":"high|medium|low","evidence":"...","fix":"...","acceptance":"..."}]}`;
}

/* -------------------------------------------------------------------- call */
async function callModel(prompt) {
  const cfg = MODELS[PROVIDER];
  if (!cfg) throw new Error(`unknown provider ${PROVIDER}`);
  const key = keys[cfg.key];
  if (!key) throw new Error(`${cfg.key} missing from router/.env`);

  const headers = { 'content-type': 'application/json' };
  let url;
  let body;
  if (cfg.auth === 'gemini') {
    url = `${cfg.url(cfg.model)}?key=${key}`;
    body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    };
  } else {
    url = cfg.url();
    headers.authorization = `Bearer ${key}`;
    body = {
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 3000,
      reasoning_effort: 'low',
    };
  }

  const t0 = Date.now();
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  const ms = Date.now() - t0;
  if (!res.ok) throw new Error(`${PROVIDER} HTTP ${res.status}: ${text.slice(0, 300)}`);

  const parsed = JSON.parse(text);
  const content = cfg.auth === 'gemini'
    ? (parsed.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '')
    : (parsed.choices?.[0]?.message?.content ?? '');
  return { content, ms, model: cfg.model };
}

function extractJson(text) {
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

/* -------------------------------------------------------------------- main */
mkdirSync(LOOP, { recursive: true });
const audit = await auditJson();
const prompt = promptFor(ROLE, audit, contextFor(ROLE, PROVIDER));
console.error(`[loop] role=${ROLE} provider=${PROVIDER} prompt=${prompt.length} chars`);

const { content, ms, model } = await callModel(prompt);
const parsed = extractJson(content);

const record = {
  round: Number(ROUND),
  role: ROLE,
  provider: PROVIDER,
  model,
  latencyMs: ms,
  timestamp: new Date().toISOString(),
  auditAtConsult: {
    sizes: audit.sizes.total,
    tests: audit.tests,
    bootMs: audit.browser.bootMs,
    external: audit.browser.externalRequests?.length,
    consoleErrors: audit.browser.consoleErrors?.length,
    a11y: audit.browser.a11y && `${audit.browser.a11y.pass}/${audit.browser.a11y.checks.length}`,
    a11yFailing: (audit.browser.a11y?.checks || []).filter((c) => !c.pass).map((c) => c.id),
    responsive: audit.browser.responsive,
    grades: audit.browser.grades,
  },
  response: parsed,
};

const outFile = join(LOOP, `round-${ROUND}-${ROLE}.json`);
writeFileSync(outFile, JSON.stringify(record, null, 2), 'utf8');
console.log(JSON.stringify(parsed, null, 2));
console.error(`[loop] wrote ${outFile} (${ms} ms via ${model})`);
