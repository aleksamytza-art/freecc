#!/usr/bin/env node
// =============================================================================
// FREECC strategy simulation — SYNTHETIC REPLICATION (EVIDENCE.md rule 4).
// Demonstrates the MECHANISM of published results on deterministic synthetic
// tiers; it is NOT a vendor benchmark:
//   * FrugalGPT (E6): cascade matches best-single-model quality at a fraction
//     of the cost.   * RouteLLM (E7): routing cheap-first with escalation keeps
//     ~95%+ of strong quality at far lower cost.   * Debate (E10): majority
//     sampling recovers extra tasks at mid-tier price.   * Quota reality
//     (E13): free tiers are finite; scenario 2/3 model exhaustion + failover.
//
// ASSUMPTIONS (all labeled): task difficulty mix 60/30/10 (easy/mid/hard);
// 800 in + 200 out tokens per attempt; tier prices per core.mjs; verifier is a
// local exec/unit test => ~$0 marginal (the mikoshi harness runs `pnpm run
// quality` locally, E2).
//
// Usage: node cascade/simulate.mjs [--n 1000]
// Exit code 0 only if ALL mechanical assertions pass (gate G14).
// =============================================================================
import { runCascade, TIERS, tierCost, syntheticCall, verifyExact } from './core.mjs';

const N = Number((process.argv.find((_, i, a) => a[i - 1] === '--n') || 1000));
const MIX = { 1: 0.6, 2: 0.3, 3: 0.1 }; // assumption, labeled

function makeTasks(n) {
  const tasks = [];
  for (let i = 0; i < n; i++) {
    const r = (i * 2654435761 % 1000) / 1000;
    const difficulty = r < MIX[1] ? 1 : r < MIX[1] + MIX[2] ? 2 : 3;
    tasks.push({ id: `T${i}`, difficulty, expected: `A${(i * 7919) % 1000}` });
  }
  return tasks;
}

const tasks = makeTasks(N);

async function strategyAlways(tierId) {
  const tier = TIERS.find(t => t.id === tierId);
  let cost = 0, ok = 0;
  for (const t of tasks) { const c = syntheticCall(tier, t); cost += c.cost; if (verifyExact(c.content, t).passed) ok++; }
  return { name: `always-${tierId}`, cost, acc: ok / tasks.length };
}

async function strategyCascade(scenario, quotas, debate = false) {
  let cost = 0, ok = 0, escal = 0, byTier = {};
  for (const t of tasks) {
    const r = await runCascade(t, { quotas, debate, mode: 'sandbox' });
    cost += r.cost; if (r.status === 'done') ok++;
    byTier[r.tier || 'none'] = (byTier[r.tier || 'none'] || 0) + 1;
    if (r.tier && r.tier !== 'weak') escal++;
  }
  return { name: `cascade${debate ? '+debate' : ''} [${scenario}]`, cost, acc: ok / tasks.length, escal: escal / tasks.length, byTier };
}

const fmt = (x) => x.toFixed(4);
const results = [];
results.push(await strategyAlways('strong'));
results.push(await strategyAlways('weak'));
results.push(await strategyCascade('S1 unlimited free quota', {}));
results.push(await strategyCascade('S2 weak capped 50/day (OpenRouter-style, E13)', { weak: 50 }));
results.push(await strategyCascade('S3 weak 50/day + mid capped 300 (Groq TPM-style, E12)', { weak: 50, mid: 300 }));
results.push(await strategyCascade('S2b weak capped 50/day + debate at mid', { weak: 50 }, true));

const strong = results[0], casc1 = results[2], casc2 = results[3];
console.log(`\nFREECC simulation — ${N} synthetic tasks (deterministic, reproducible)\n`);
console.log('strategy'.padEnd(58), 'cost($)'.padStart(10), 'acc'.padStart(8), 'escal'.padStart(8));
console.log('-'.repeat(86));
for (const r of results) console.log(r.name.padEnd(58), fmt(r.cost).padStart(10), fmt(r.acc).padStart(8), r.escal !== undefined ? fmt(r.escal).padStart(8) : '-'.padStart(8));
console.log(`\ncost ratio cascade(S1)/always-strong : ${fmt(casc1.cost / strong.cost)}`);
console.log(`cost ratio cascade(S2)/always-strong : ${fmt(casc2.cost / strong.cost)}`);
console.log(`acc  ratio cascade(S2)/always-strong : ${fmt(casc2.acc / strong.acc)}`);

// --- mechanical assertions (the gate; replicate the SHAPE of E6/E7) ----------
const A = [];
A.push(['cascade(S1) accuracy >= 0.97 x always-strong', casc1.acc >= 0.97 * strong.acc]);
A.push(['cascade(S1) cost <= 0.50 x always-strong', casc1.cost <= 0.5 * strong.cost]);
A.push(['cascade(S2, quota-capped) accuracy >= 0.95 x always-strong', casc2.acc >= 0.95 * strong.acc]);
A.push(['cascade(S2) cost <= 0.60 x always-strong', casc2.cost <= 0.6 * strong.cost]);
A.push(['always-weak accuracy < cascade accuracy (verification+escalation earns its keep)', results[1].acc < casc1.acc]);
A.push(['S1 escalation rate < 45% (most tasks die cheap when free quota is open, E6/E7 shape)', casc1.escal < 0.45]);
A.push(['S2 quota-capped failover keeps accuracy >= 0.99 (graceful degradation, E11/E13)', casc2.acc >= 0.99]);
let failed = 0;
console.log('\nassertions:');
for (const [name, pass] of A) { console.log(` ${pass ? 'PASS' : 'FAIL'}  ${name}`); if (!pass) failed++; }
console.log(failed ? `\nSIMULATION FAILED (${failed} assertions)` : '\nSIMULATION OK — all assertions passed');
process.exit(failed ? 1 : 0);
