#!/usr/bin/env node
// =============================================================================
// FREECC prompt-library validator (gate G16). The library is "verified" in the
// only honest sense available to documents: machine-checked structure + evidence
// cross-reference. Checks:
//   1. manifest parses; covers exactly P0..P8
//   2. each prompt file exists, carries the stage|roles|evidence|gate header,
//      and contains every required section heading
//   3. every E# cited anywhere in a prompt file exists in EVIDENCE.md
//      (no orphan evidence references — EVIDENCE.md rule 1 enforced by code)
//   4. every evidence ID declared in the manifest appears in the prompt body
//   5. PLAYBOOK.md references every prompt ID (gate G17 re-checks independently)
// Exit 0 only if all checks pass.
// =============================================================================
import fs from 'node:fs';

const here = new URL('.', import.meta.url).pathname;
const root = here.endsWith('/prompts/') ? here.slice(0, -'/prompts/'.length) : here;
const man = JSON.parse(fs.readFileSync(`${root}/prompts/manifest.json`, 'utf8'));
const fails = [];

// expected IDs
const expected = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
const ids = man.prompts.map(p => p.id);
if (JSON.stringify([...ids].sort()) !== JSON.stringify(expected)) fails.push(`manifest covers ${ids.join(',')} — expected ${expected.join(',')}`);

// evidence universe
const ev = fs.readFileSync(`${root}/EVIDENCE.md`, 'utf8');
const evIds = new Set([...ev.matchAll(/^\| (E\d+) \|/gm)].map(m => m[1]));
if (evIds.size < 10) fails.push(`EVIDENCE.md parsed with only ${evIds.size} entries — ledger format changed?`);

// playbook
let pb = '';
try { pb = fs.readFileSync(`${root}/PLAYBOOK.md`, 'utf8'); } catch { fails.push('PLAYBOOK.md missing'); }

const headerRe = /<!-- stage:.+ \| roles:.+ \| evidence:.+ \| gate:.+ -->/;
for (const p of man.prompts) {
  const path = `${root}/prompts/${p.file}`;
  if (!fs.existsSync(path)) { fails.push(`${p.id}: file ${p.file} missing`); continue; }
  const txt = fs.readFileSync(path, 'utf8');
  if (!headerRe.test(txt)) fails.push(`${p.id}: missing/incorrect stage|roles|evidence|gate header`);
  for (const s of man.required_sections) if (!txt.includes(s)) fails.push(`${p.id}: missing section "${s}"`);
  // 3. cited E# must exist in the ledger
  const cited = new Set([...txt.matchAll(/\bE(\d+)\b/g)].map(m => `E${m[1]}`));
  for (const c of cited) if (!evIds.has(c)) fails.push(`${p.id}: cites ${c} which is not in EVIDENCE.md`);
  // 4. manifest-declared evidence must appear in the body
  for (const d of p.evidence || []) if (!txt.includes(d)) fails.push(`${p.id}: manifest declares ${d} but body never references it`);
  // 5. playbook references
  if (pb && !pb.includes(p.id)) fails.push(`PLAYBOOK.md never references ${p.id}`);
}

if (fails.length) { console.log(`PROMPT LIBRARY INVALID (${fails.length} findings):`); for (const f of fails) console.log('  FAIL ' + f); process.exit(1); }
console.log(`PROMPT LIBRARY OK — ${man.prompts.length}/9 prompts validated against manifest, ${evIds.size} ledger entries, PLAYBOOK cross-referenced`);
