// =============================================================================
// FREECC cascade core — quality-gated model cascade (FrugalGPT-style, E6) with
// mikoshi-style verification discipline (E2: a pass is never self-reported) and
// a budget ledger. Zero dependencies. SANDBOX mode = deterministic synthetic
// tiers (mechanism proof, fully offline). LIVE mode = OpenAI-compatible calls.
//
// PRICING MODEL (assumptions are LABELED, per EVIDENCE.md rule 4):
//   weak   $0     / $0      — free tiers (E11 Gemini, E12 Groq, E13 OpenRouter)
//   mid    $0.15 / $0.66   — DeepSeek off-peak per 1M tokens (E17, primary)
//   strong $3    / $15     — frontier-flagship class (ASSUMPTION: order of
//                            magnitude of flagship API pricing; swap in the
//                            real number for whatever your `opus` group hits)
// =============================================================================

export const TIERS = [
  { id: 'weak',   rank: 1, priceIn: 0,    priceOut: 0,    noise: 0.08, label: 'free-tier small models (E11-E13)' },
  { id: 'mid',    rank: 2, priceIn: 0.15, priceOut: 0.66, noise: 0.04, label: 'deepseek off-peak (E17)' },
  { id: 'strong', rank: 3, priceIn: 3.0,  priceOut: 15.0, noise: 0.01, label: 'flagship class (ASSUMPTION, labeled)' },
];

// synthetic task protocol: message content contains TASK:<id>:<difficulty>:<expected>
// difficulty 1..3 maps to the tier rank that can solve it (weak=1, mid=2, strong=3).
const TASK_RE = /TASK:([A-Za-z0-9_-]+):([1-3]):([^\s:]+)/;

export function parseTask(messages) {
  const text = (messages || []).map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n');
  const m = text.match(TASK_RE);
  if (!m) return null;
  return { id: m[1], difficulty: Number(m[2]), expected: m[3] };
}

function hash(str) { // deterministic FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

const TOK_IN = 800, TOK_OUT = 200; // synthetic per-task token volume (assumption)

export function tierCost(tier, tokIn = TOK_IN, tokOut = TOK_OUT) {
  return (tokIn * tier.priceIn + tokOut * tier.priceOut) / 1e6;
}

// --- SANDBOX synthetic model call: deterministic, reproducible --------------
export function syntheticCall(tier, task) {
  const h = hash(task.id + '|' + tier.id);
  const noiseFail = (h % 10000) / 10000 < tier.noise;
  const capable = tier.rank >= task.difficulty;
  const correct = capable && !noiseFail;
  return {
    tier: tier.id,
    content: JSON.stringify({ answer: correct ? task.expected : `wrong-${h % 97}` }),
    usage: { prompt_tokens: TOK_IN, completion_tokens: TOK_OUT },
    cost: tierCost(tier),
    _correct: correct, // simulator only; NEVER used by the verifier
  };
}

// --- LIVE call: any OpenAI-compatible endpoint (LiteLLM, Ollama, Groq...) ----
export async function liveCall(tier, messages, cfg) {
  const res = await fetch(cfg.baseURL.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}) },
    body: JSON.stringify({ model: cfg.model, messages, temperature: 0 }),
  });
  if (!res.ok) throw Object.assign(new Error(`tier ${tier.id} HTTP ${res.status}`), { status: res.status });
  const j = await res.json();
  const u = j.usage || { prompt_tokens: 0, completion_tokens: 0 };
  return {
    tier: tier.id,
    content: j.choices?.[0]?.message?.content ?? '',
    usage: u,
    cost: (u.prompt_tokens * tier.priceIn + u.completion_tokens * tier.priceOut) / 1e6,
  };
}

// --- verifiers (pluggable; the gate that decides, not the model) ------------
export function verifyExact(candidateJson, task) {
  try {
    const o = JSON.parse(candidateJson);
    return { passed: o.answer === task.expected, reason: o.answer === task.expected ? 'answer matches expected' : `answer '${o.answer}' != expected '${task.expected}'` };
  } catch (e) { return { passed: false, reason: `candidate not valid JSON: ${e.message}` }; }
}
export function verifyContains(value) { return (c) => ({ passed: String(c).includes(value), reason: `contains(${value})` }); }
export function makeVerifier(spec, task) {
  if (!spec || spec.type === 'exact') return (c) => verifyExact(c, task);
  if (spec.type === 'contains') return verifyContains(spec.value);
  if (spec.type === 'exec') {
    // LIVE bridge to mikoshi harness: write candidate to a temp file, run the
    // repo's harness command (e.g. `pnpm run quality`, E2); exit 0 == pass.
    const { execFileSync } = require('node:child_process');
    return (c) => {
      const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
      const f = path.join(os.tmpdir(), `freecc-cand-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.writeFileSync(f, c);
      try { execFileSync('bash', ['-c', spec.cmd.replace('{candidate}', f)], { stdio: 'pipe', timeout: spec.timeoutMs || 120000 }); return { passed: true, reason: 'exec verifier exit 0' }; }
      catch (e) { return { passed: false, reason: `exec verifier failed: ${String(e.stderr || e.message).slice(0, 400)}` }; }
    };
  }
  throw new Error(`unknown verifier ${spec.type}`);
}

// --- the cascade itself ------------------------------------------------------
// opts: { budget (USD, Infinity ok), quotas: {tierId: n}, debate: bool, mode: 'sandbox'|'live', liveCfg: {tierId: cfg} }
export async function runCascade(task, opts = {}) {
  const { budget = Infinity, quotas = {}, debate = false, mode = 'sandbox', liveCfg = {} } = opts;
  const verify = makeVerifier(opts.verify || { type: 'exact' }, task);
  const ledger = [];
  let messages = [{ role: 'user', content: `Solve. Reply JSON {"answer": ...}. TASK:${task.id}:${task.difficulty}:${task.expected}` }];
  let spent = 0, last = null;

  for (const tier of TIERS) {
    if (quotas[tier.id] !== undefined && quotas[tier.id] <= 0) {
      ledger.push({ task: task.id, tier: tier.id, event: 'quota-skip' });
      continue; // E13: free quota exhausted -> next tier, never a hard stall
    }
    const projected = spent + tierCost(tier);
    if (projected > budget) {
      ledger.push({ task: task.id, tier: tier.id, event: 'budget-stop', spent });
      return { status: 'blocked', reason: 'budget_exhausted', tier: last?.tier, content: last?.content, ledger, cost: spent };
    }
    let call;
    if (mode === 'sandbox') {
      call = syntheticCall(tier, task);
    } else {
      try { call = await liveCall(tier, messages, liveCfg[tier.id] || {}); }
      catch (e) {
        if (e.status === 429) { ledger.push({ task: task.id, tier: tier.id, event: '429-failover' }); continue; }
        throw e;
      }
    }
    spent += call.cost;
    if (quotas[tier.id] !== undefined) quotas[tier.id] -= 1;

    // optional debate step at mid tier (E10 Du et al.): 3 samples, majority answer
    let candidate = call.content;
    if (debate && tier.id === 'mid') {
      const samples = [call];
      for (let i = 0; i < 2; i++) {
        const s = mode === 'sandbox'
          ? syntheticCall(tier, { ...task, id: `${task.id}~deb${i}` })
          : await liveCall(tier, messages, liveCfg[tier.id] || {});
        spent += s.cost; samples.push(s);
      }
      const votes = {};
      for (const s of samples) { try { const a = JSON.parse(s.content).answer; votes[a] = (votes[a] || 0) + 1; } catch {} }
      const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
      if (best) candidate = JSON.stringify({ answer: best[0] });
      ledger.push({ task: task.id, tier: tier.id, event: 'debate', votes });
    }

    const verdict = verify(candidate, task);
    ledger.push({ task: task.id, tier: tier.id, event: 'attempt', passed: verdict.passed, reason: verdict.reason, cost: call.cost });
    last = { ...call, content: candidate };
    if (verdict.passed) return { status: 'done', tier: tier.id, content: candidate, verdict, ledger, cost: spent };
    // mikoshi implementer rule (E2): next rung receives the failure excerpt
    messages = [...messages,
      { role: 'assistant', content: candidate },
      { role: 'user', content: `Verification failed: ${verdict.reason}. Fix the cause, not the symptom.` }];
  }
  return { status: 'failed', tier: last?.tier, content: last?.content, ledger, cost: spent };
}
