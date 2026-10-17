# PLAYBOOK — how to run FREECC for maximum value and maximum truth

Two questions this file answers: **where the definitive instructions live**, and **how to operate
them so the results are both valuable and true**. Every rule below is tied to a ledger entry
(`EVIDENCE.md`, E#) or a gate (`REPORT.md`, G#) — this playbook is itself gated (G17) and the
prompt library it points to is machine-validated (G16 via `prompts/validate.mjs`).

## 0. Where the definitive instructions live (the map)

| You want… | File | Form |
|---|---|---|
| The R&D meta-prompt: turn ANY new problem into a gated build | `prompts/P0-research-decompose.md` | copy-paste prompt |
| Setup of this stack on a machine (day 0 + monthly re-verify) | `prompts/P1-stack-setup.md` | copy-paste prompt |
| Fill repo memory once (10 discovery markers) | `prompts/P2-discovery.md` | copy-paste prompt |
| Plan a feature into budgeted tasks | `prompts/P3-plan.md` | copy-paste prompt |
| Brief an implementer (the only input it gets) | `prompts/P4-implement-brief.md` | copy-paste prompt |
| Verify without trusting the doer | `prompts/P5-harness-verdict.md` | copy-paste prompt |
| Resolve ambiguity with a sequence of free agents | `prompts/P6-debate-crosscheck.md` | copy-paste prompt |
| Escalate to design after red | `prompts/P7-architect-escalation.md` | copy-paste prompt |
| Tune brick-by-brick from measured indexes | `prompts/P8-retro-tune.md` | copy-paste prompt |
| The decomposition + indexes + open questions | `ISSUE-TREE.md` | reference |
| The source of every claim | `EVIDENCE.md` | ledger E1–E19 |
| Machine-generated truth of the current build | `REPORT.md` | gates G01–G17 |

Each prompt is "verified" in the only honest sense available to text: it is **structure-checked,
evidence-cross-referenced by code** (`prompts/validate.mjs`), and its real-world claims trace to
the ledger. Prompts are inputs; *gates* are what make outputs trustworthy.

## 1. Seven rules of truth (why the results can be believed)

1. **No result without a gate.** "Done" = `gates/run-gates.sh` exit 0. Opinions, including the
   agent's own confidence, are not results. (Built under this rule: 15/15 → 17/17.)
2. **No claim without an E#.** Strategies are assembled from proven pieces — FrugalGPT cascade
   (E6), RouteLLM routing (E7), scaffold-first (E8), externalized memory (E9), debate (E10),
   quota-pooling (E11–E13). The validator *fails the build* if a prompt cites a non-existent E#.
3. **The verifier is never the doer.** Implementer reports; harness decides (E2, E4); judge is
   not a solver (P6). Self-reported success is structurally impossible.
4. **Red before green.** An acceptance criterion that was never witnessed failing was never a
   criterion (E2). P3 refuses to emit unwitnessable criteria; P5 demands witness evidence.
5. **Test the test.** `construct mutate` injects a named wrong implementation; a harness that
   passes it is broken (E1 → index I6). While I6 > 0, all other indexes are untrustworthy (P8).
6. **Synthetic is labeled synthetic.** The simulation proves *mechanism* (G14), never vendor
   quality; live indexes come from live ledgers (runs.jsonl, ledger.jsonl, `construct cost`).
7. **Open questions are deliverables.** OQ-1..OQ-4 (ISSUE-TREE) and every "UNVERIFIED" line in
   SETUP-NOTES are first-class outputs. A blocked task with one precise question beats a guessed
   answer — measured once at 4.16M tokens (E3).

## 2. Value protocol (why the results are worth what they cost ≈ $0)

- **Three-level budget split** (all gated): per-call — cascade tries $0 tiers first, `budget_usd`
  hard-stops (G13); per-task — ladder starts at the cheapest rung, buys reasoning only on red
  (G06, E3); per-day — quota pool across ≥4 providers with rpm/tpm caps + cooldown failover
  (G09/G10; sim S2/S3 held ≥0.99 accuracy ratio with the weak tier capped at OpenRouter's real
  50/day free limit, E13).
- **Memory before muscle.** Run P2 once; every future agent entry costs less (E3 shows entry is
  the dominant cost; E9 shows huge windows don't fix it — the middle gets lost).
- **Quota calendar.** Gemini RPD resets midnight Pacific (E11); OpenRouter free = 50 req/day,
  1000/day after $10 credits (E13); Groq is TPM-bound (E12). Batch heavy work after resets;
  let Ollama absorb overflow; P1 records *observed* quotas monthly because they drift.
- **When to pay.** Frontier-ceiling tasks only. The near-free anchor (DeepSeek off-peak ≈
  $0.15/M, E17) is already wired as the last deployment of the strong group, so "never stall"
  costs cents, not dollars.
- **One knob per retro.** P8 changes exactly one variable, records a prediction and a falsifier,
  re-runs all gates. Compounding tuning beats heroic rewrites — brick by brick, as specified.

## 3. Operating loop (which prompt, when)

```
DAY 0        P1 setup ────────────► REPORT.md green (G01–G17)
PER REPO     P2 discovery ────────► doctor: 10/10 markers
PER FEATURE  P3 plan ─────────────► tasks w/ red-witnessable criteria
PER TASK     P4 brief → implementer ─► P5 harness verdict
                │ passed=false (twice) or blocked
                ▼
             P7 architect spec ───► revised class → back to P4
                │ ambiguous & no mechanical verifier
                ▼
             P6 debate (3 solvers + judge) ─► adopt or escalate
WEEKLY       P8 retro: indexes I1–I9 → ONE tuning change → re-run ALL gates
NEW PROBLEM  P0 research+decompose (this is the R&D input prompt)
```

## 4. Feeding inputs for research & development (P0 in practice)

Worked example — the L0.3 child of ISSUE-TREE (bookings), instantiated for a destination set:

```text
CHALLENGE: Build and maintain a booking-conversion funnel (landing → lead magnet → qualification
→ payment integration) for destinations D = {<from operator — OQ-1>}. Desired result first:
paid bookings per destination per week; then qualified leads; then traffic. Constraints: $0 model
spend except the DeepSeek anchor; all code through the FREECC ladder; every page must pass the
repo harness.
BUDGET: $0 routine / ≤$5 total anchor spend    DEADLINE: first funnel live in 7 days
MACHINE: <yours>    INPUTS PROVIDED: destination list, brand assets, payment provider keys location
```
Feed that to P0 through the `opus` group. P0's process clauses (verify-existence, ledger,
decompose, indexes, gate-runner-first, red-fix-rerun, honesty ledger) do the rest — the same
chain that produced this repo, now reproducible by any agent that can read a prompt.

## 5. Failure modes and what catches each

| Failure | Caught by | Index |
|---|---|---|
| Fake green (weakened/skipped test) | P5 testsWeakened scan (E4 patterns) + `construct mutate` | I6 |
| Endless escalation / token burn | ladder rung cap (E2) + cascade `budget_usd` (G13) | I1, I3 |
| Quota cliff mid-sprint | fallback chains + cooldown (G09/G10, E11–E13) | I4, I8 |
| Bad brief → expensive nonsense | P3 contradiction check; P4 blocked rule (E3) | I7 |
| Model-ID / quota drift | monthly P1 re-verification (OQ-2) | I4 |
| Context bloat, lost middle | P2 markers + pointers-over-payloads rule (E9) | I5 |
| Tuning by vibes | P8 one-knob + falsifier + gates-from-the-beginning | all |
