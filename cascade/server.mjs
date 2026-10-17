#!/usr/bin/env node
// =============================================================================
// FREECC cascade router — HTTP server (OpenAI-compatible surface).
// SANDBOX_MODE=1 (default): deterministic synthetic tiers, zero network, zero
// keys — proves the mechanism (gates G11-G13). SANDBOX_MODE=0: proxies to the
// live tier endpoints from FREECC_TIER_<ID>_{URL,MODEL,KEY} env vars (point
// them at the LiteLLM groups: http://localhost:4000/v1 with model haiku/sonnet/opus).
//
//   POST /v1/chat/completions  {model:"cascade", messages:[...],
//                               freecc:{verify:{type:"exact"|"contains"|"exec",...},
//                                       budget_usd:0.5, max_tier:"strong", debate:false}}
//   GET  /health | /v1/models | /ledger     POST /reset
// Response headers: X-FREECC-TIER, X-FREECC-STATUS, X-FREECC-COST
// Ledger: JSONL at LEDGER_PATH (default ./ledger.jsonl)
// =============================================================================
import http from 'node:http';
import fs from 'node:fs';
import { runCascade, parseTask, TIERS } from './core.mjs';

const PORT = Number(process.env.PORT || 4597);
const SANDBOX = process.env.SANDBOX_MODE !== '0';
const LEDGER_PATH = process.env.LEDGER_PATH || new URL('./ledger.jsonl', import.meta.url).pathname;
const quotas = {};
for (const t of TIERS) {
  const q = Number(process.env[`${t.id.toUpperCase()}_QUOTA`] ?? Infinity);
  quotas[t.id] = Number.isFinite(q) ? q : Infinity;
}
const liveCfg = {};
for (const t of TIERS) {
  const U = process.env[`FREECC_TIER_${t.id.toUpperCase()}_URL`];
  if (U) liveCfg[t.id] = { baseURL: U, model: process.env[`FREECC_TIER_${t.id.toUpperCase()}_MODEL`] || t.id, apiKey: process.env[`FREECC_TIER_${t.id.toUpperCase()}_KEY`] };
}
let costTotal = 0, reqTotal = 0, byTier = {};
fs.writeFileSync(LEDGER_PATH, ''); // fresh ledger per boot

function appendLedger(entries) {
  fs.appendFileSync(LEDGER_PATH, entries.map(e => JSON.stringify({ ts: new Date().toISOString(), ...e })).join('\n') + '\n');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (code, obj, headers = {}) => {
    const body = JSON.stringify(obj, null, 0);
    res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), ...headers });
    res.end(body);
  };
  if (req.method === 'GET' && url.pathname === '/health') return send(200, { ok: true, mode: SANDBOX ? 'sandbox' : 'live', tiers: TIERS.map(t => ({ id: t.id, quotaRemaining: quotas[t.id] })), costTotal, reqTotal, byTier });
  if (req.method === 'GET' && url.pathname === '/v1/models') return send(200, { object: 'list', data: [{ id: 'cascade', object: 'model', owned_by: 'freecc' }] });
  if (req.method === 'GET' && url.pathname === '/ledger') {
    const lines = fs.existsSync(LEDGER_PATH) ? fs.readFileSync(LEDGER_PATH, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    return send(200, { summary: { costTotal, reqTotal, byTier }, entries: lines.slice(-200) });
  }
  if (req.method === 'POST' && url.pathname === '/reset') {
    costTotal = 0; reqTotal = 0; byTier = {};
    for (const t of TIERS) { const q = Number(process.env[`${t.id.toUpperCase()}_QUOTA`] ?? Infinity); quotas[t.id] = Number.isFinite(q) ? q : Infinity; }
    fs.writeFileSync(LEDGER_PATH, '');
    return send(200, { ok: true });
  }
  if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let j; try { j = JSON.parse(body); } catch { return send(400, { error: { message: 'invalid JSON body' } }); }
    const f = j.freecc || {};
    const task = parseTask(j.messages);
    if (SANDBOX && !task) return send(400, { error: { message: 'sandbox mode requires TASK:<id>:<difficulty>:<expected> in a message' } });
    const maxIdx = TIERS.findIndex(t => t.id === (f.max_tier || 'strong'));
    const tiers = maxIdx >= 0 ? TIERS.slice(0, maxIdx + 1) : TIERS;
    const taskOrLive = task || { id: `live-${Date.now()}`, difficulty: 3, expected: null };
    const result = await runCascade(taskOrLive, {
      budget: f.budget_usd ?? Infinity,
      quotas, debate: !!f.debate, mode: SANDBOX ? 'sandbox' : 'live', liveCfg,
      verify: f.verify || { type: task ? 'exact' : 'contains', ...(task ? {} : { value: f.expect_contains || '' }) },
    });
    appendLedger(result.ledger || []);
    costTotal += result.cost || 0; reqTotal += 1;
    if (result.tier) byTier[result.tier] = (byTier[result.tier] || 0) + 1;
    return send(200, {
      id: `freecc-${Date.now()}`, object: 'chat.completion', model: 'cascade',
      choices: [{ index: 0, message: { role: 'assistant', content: result.content ?? '' }, finish_reason: result.status === 'done' ? 'stop' : 'freecc_' + result.status }],
      usage: { prompt_tokens: 0, completion_tokens: 0 },
      freecc: { status: result.status, tier: result.tier, cost: result.cost, reason: result.reason, ledger: result.ledger },
    }, {
      'X-FREECC-TIER': String(result.tier || 'none'),
      'X-FREECC-STATUS': result.status,
      'X-FREECC-COST': String(result.cost || 0),
    });
  }
  return send(404, { error: { message: 'not found' } });
});

server.listen(PORT, () => console.log(`[freecc-cascade] ${SANDBOX ? 'SANDBOX' : 'LIVE'} mode on :${PORT} — ledger ${LEDGER_PATH}`));
