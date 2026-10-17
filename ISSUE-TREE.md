# ISSUE TREE — FREECC
### Decomposition of the root issue into layers, components, variables, roles, spectral indexes and mechanical gates

Method contract (per the brief): start from the **desired result**, decompose into sub-issue
concepts, each sub-issue carries its **method / use case / expected result**, each method is a
piece of a **proven working strategy** with a ledger entry in `EVIDENCE.md` (E#) — nothing is
invented — and each issue closes only when its **mechanical gate** (`gates/run-gates.sh`, G##)
is green. Then repeat the check from the beginning, solve the next issue, repeat.

```
L0 desired result ──► L1 core issue ──► L2 components C1..C5 ──► L3 sub-issues ──► L4 atomic tasks
     (business)          (toolset)          (layers)              (mechanisms)        (gates G01–G15)
```

---

## L0 — Desired result (root issue)

> Company expansion → qualified leads → paid bookings to the destinations provided.

**Status: PARAMETERIZED.** The destinations were referenced as "provided" but are not in the
brief → open question **OQ-1**. L0 is therefore kept as a parameter `D = {destinations}`;
everything below is destination-independent, because the *binding constraint* on L0 is not
copywriting — it is **production engine throughput**: how many qualified, verified artifacts
(campaign pages, lead-magnet flows, outreach sequences, booking integrations, SEO pages per
destination) can be built and maintained per dollar. At $0 marginal model cost, throughput is
bounded only by verification discipline. That is what L1 delivers.

L0 decomposition (each child is an L0.x issue whose resolution *mechanism* is the L1 toolset):

| Sub-issue | Resolution mechanism | Depends on |
|---|---|---|
| L0.1 Expand reachable inventory (pages/flows per destination in D) | agent fleet executes `/plan → /implement` ladder per asset | L1 |
| L0.2 Qualify leads (scoring, enrichment, routing) | agents build+maintain pipelines under harness verification | L1 |
| L0.3 Convert to paid bookings (funnels, integrations, follow-up) | same ladder; money-path = `high-effort-area` (C3 policy) | L1 |
| L0.4 Keep unit cost ≈ $0 while scaling | quota pooling + cascade + budget ledger (C1/C5) | L1 |

---

## L1 — Core issue

> **"High-productivity agent LLM toolset that will, for free and scalably, ensure the
> performance of Claude Code at Max level."**

Decomposed by equivalence: Max is not one feature, it is five. Each gets a substitute built
from proven pieces — this *is* the "comparison chain to real existing verified mechanical
gates" the brief demands:

| Max dimension | FREECC substitute | Proven strategy (ledger) | Spectral index |
|---|---|---|---|
| Opus/Sonnet-class reasoning on demand | quality-gated cascade + mikoshi reasoning ladder: pay for strength only when verification proves weakness | FrugalGPT: matches GPT-4 at up to 98% lower cost (E6); RouteLLM: 85% cost cut at 95% GPT-4 perf (E7); mikoshi ladder cost data (E2, E3) | I1 $/task, I3 escalation rate |
| Huge usage limits | quota pooling across ≥4 free providers + local models, quota-aware failover | Gemini/Groq/OpenRouter free tiers exist but are per-model RPM/TPM/RPD and shrinking (E11–E13) → pooling is the only durable design | I4 failover time, I8 daily throughput |
| 1M-token context | externalized verified memory: AGENTS.md 10 discovery markers, architecture docs, atlas; context discipline policy | Lost in the Middle: long context is used U-shaped (E9); mikoshi: re-entry cost dominates spend (E3); discovery protocol (E1, E19) | I5 re-entry tokens |
| Reliability at scale | harness agent + schema-validated verdicts, never self-reported; mutation checks | SWE-agent/ACI: scaffold design is first-order (E8); mikoshi verdict schema + `construct mutate` (E1, E2) | I6 false-pass rate |
| One coherent product | roles: operator (human) / architect / implementer / harness, wired identically in Claude Code *and* OpenCode | mikoshi role pins (E4); AI-DLC "one core, many harnesses" (E5); Claude Code↔LiteLLM official (E14, E15); OpenCode custom provider (E16) | I2 first-pass rate |

**Honest bound (kept per method contract):** the reasoning *ceiling* of FREECC equals the
strongest model reachable for free-or-near-free at the time of use. For frontier-only tasks the
near-free escape hatch is DeepSeek at ~$0.15/M off-peak (E17) — "free" holds for the routine
99% of production work; it is not a claim that $0 buys the frontier.

---

## L2 — Components (layers)

### C1 ROUTING — "which model answers this call"
- **Variables:** free-tier model IDs (drift monthly, E11), RPM/TPM/RPD quotas, tier prices, task difficulty mix, verifier cost.
- **Roles:** router (automated), operator (refreshes quotas/IDs), harness (rejects too-weak answers → triggers escalation).
- **Methods (all proven pieces):**
  1. *Quota failover* — LiteLLM `usage-based-routing-v2` + `fallbacks` + `cooldown_time` (E14; config `router/litellm.config.yaml`). Use case: Gemini free tier 429s → Groq takes the call, agent never stalls.
  2. *Quality-gated cascade* — FrugalGPT escalation with verifier gate (E6; `cascade/`). Use case: cheap model attempts, local harness decides, escalate only on red.
  3. *Role pre-routing* — alias contract `opus/sonnet/haiku` → groups; Claude Code remaps via `ANTHROPIC_DEFAULT_*_MODEL` (E15); mikoshi agents pin roles (E4). Use case: implementer always lands on free workhorses; architect lands on strongest.
  4. *Debate sampling* (optional) — majority-of-3 at mid tier before paying strong (E10).
- **Expected result / gate:** groups served by one proxy (**G10**), cascade escalates weak→mid→strong (**G12**), budget blocks (**G13**), sim holds cost/quality shape (**G14**). **STATUS: RESOLVED-IN-SANDBOX.**

### C2 HARNESS — "where the human talks to the fleet"
- **Variables:** harness choice (terminal/UI), auth wiring, model discovery.
- **Roles:** operator (human), netrunner (coding agent, mikoshi's word, E1).
- **Methods:** Claude Code pointed at the router via officially documented env wiring (E14, E15) — `harness/run-claude-code.sh`; OpenCode (free, open-source, terminal Claude-Code-class, custom `baseURL` provider, E16) — `harness/opencode.json`; any OpenAI-compatible client can hit the cascade server directly (`cascade/server.mjs`, G11).
- **Expected result / gate:** configs parse and pin the alias contract (**G15**). Live TUI run needs the operator's keys → **CONFIGURED-NEEDS-KEYS**.

### C3 CONSTRUCT — "workflow + verification that makes weak models safe"
- **Variables:** preset, effort class per task, acceptance criteria quality (a bad brief cost 4.16M tokens once — E3).
- **Roles:** architect (designs, never writes), implementer (strict constraints, never self-grades), harness (runs `pnpm run quality`, schema-validated verdict), operator.
- **Methods:** `mikoshi-construct init/attach` materializes policy + contract + harness + agents (E1, E19); ladder `low→low→medium→high` spends reasoning only when verification fails (E2, E3); lineage AI-DLC (E5); `construct mutate` measures the verifier itself (E1) → index I6; `construct cost`/`board` give the ledger (E1).
- **Expected result / gates:** init materialized 44 files (**G03**), doctor/soulkill execute (**G04/G05**), ladder constant and role pins verified in the materialized artifacts (**G06/G07**). **STATUS: RESOLVED-IN-SANDBOX.**

### C4 CONTEXT/MEMORY — "the free substitute for a huge window"
- **Variables:** marker fill-state, context-window fraction in use, re-entry token cost.
- **Roles:** every agent reads `AGENTS.md` first (relic files, E1); discoverer fills markers.
- **Methods:** 10 discovery markers (names verified from real `doctor` output, E19) in `harness/AGENTS.md.template`; window discipline rule (write findings out at ~50% window, E9); `construct atlas` renders a self-contained repo map (E1); markers are machine-checkable (`doctor` reports each missing marker by name — empirically observed, E19).
- **Expected result / gate:** template carries all 10 markers (**G15**). **STATUS: RESOLVED-IN-SANDBOX.**

### C5 ECONOMY — "the budget is divided in a smart way"
- **Variables:** daily token budget, per-tier quota remaining, $/task, escalation rate.
- **Roles:** operator sets budget; ledger records; cascade enforces.
- **Methods:** three-level budget split — *per-call* (cascade `budget_usd`, blocks escalation past the line, E3 principle "don't pay for reasoning until the system demonstrates we need it"), *per-task* (ladder effort class, E2), *per-day* (quota pool sizing from E11–E13: OpenRouter 50 free req/day → RPM 10 ceiling in config; Groq TPM cap → tpm 6000 until verified; Gemini RPD resets midnight PT). Everything is written to `cascade/ledger.jsonl` + `.construct/runs.jsonl` (E2) and priced by `construct cost` (E1).
- **Expected result / gates:** budget guard (**G13**), quota-capped simulation degrades gracefully with ≥0.99 accuracy ratio (**G14**, scenario S2/S3). **STATUS: RESOLVED-IN-SANDBOX.**

---

## L3 — Sub-issue chain (dependencies)

```
I1.1 quota failover ──┐
I1.2 quality cascade ─┼─► C1 ──► I2.1 claude-code wiring ──┐
I1.3 role pre-route ──┘            I2.2 opencode wiring ──┼─► C2 ─┐
                                   I2.3 direct API ───────┘        │
I3.1 init/attach ─► I3.2 discovery ─► I3.3 ladder ─► I3.4 mutate ─► C3 ─┼─► L1 ─► L0.1..L0.4
I4.1 markers ─► I4.2 window discipline ─► I4.3 atlas ─────────────► C4 ─┤
I5.1 pool sizing ─► I5.2 ledgers ─► I5.3 degradation policy ───────► C5 ─┘
```
Each arrow = "must be green before". Gate mapping: I1.1→G10, I1.2→G11/G12/G14, I1.3→G07+G15,
I2.1→G15(+G10 boot), I2.2/I2.3→G15/G11, I3.1→G03, I3.2→G04/G05, I3.3→G06, I3.4→(operator run:
`construct mutate`, E1), I4.1→G15, I5.1→G09/G10, I5.2→G11–G13 ledger files, I5.3→G14 (S2/S3).

## L4 — Atomic tasks executed in this build
Install mikoshi-construct ✔ · real `init/doctor/soulkill` runs ✔ · install LiteLLM 1.105.1 ✔ ·
author+boot router config ✔ · author harness wirings ✔ · implement cascade core/server ✔ ·
implement simulation ✔ · author+debug+green 15 gates ✔ (two self-inflicted gate bugs were
caught by the gates themselves — the iteration protocol working as specified).

---

## Spectral index register (measurable, with instrument)

| Index | Definition | Instrument |
|---|---|---|
| I1 | $ per completed task | `construct cost` (E1) + `cascade/ledger.jsonl` |
| I2 | first-pass rate (green on rung 1) | `.construct/runs.jsonl` (E2) |
| I3 | escalation rate (tasks leaving weak tier) | ledger `event:attempt` counts |
| I4 | quota-failover latency (429 → next provider) | LiteLLM logs / `cooldown_time` |
| I5 | re-entry token cost per fresh agent | session tokens ÷ tasks (E3 method) |
| I6 | verifier false-pass rate | `construct mutate apply/judge` (E1) |
| I7 | blocked-task rate (bad briefs) | runs.jsonl `status:blocked` (E2/E3) |
| I8 | daily task throughput under pooled quotas | quota math: Σ(provider RPD) |
| I9 | escaped-defect rework cost | harness findings log + CI |

**Tuning loop (brick by brick, as specified):** week 1 → measure I2/I3/I6 on real tasks; if
I2 < 0.5, the weak tier is too weak → move one model up within the group; if I6 > 0, harden the
harness command (never the model's word against the harness, E2/E8); if I4 spikes, add a
provider to the pool; re-run gates from the beginning after every change.

## Open questions (honesty ledger)
- **OQ-1** destinations `D` for L0 not provided → L0 children stay parameterized.
- **OQ-2** free-tier model IDs/quotas drift (E11) → monthly dashboard check is a standing task.
- **OQ-3** simulation proves *mechanism*, not real-model quality → first live week measures I2/I3 with real free models and recalibrates tier prices in `cascade/core.mjs`.
- **OQ-4** frontier-ceiling tasks → near-free escape hatch (E17), or keep one paid key dormant in the `opus` group as last fallback.
