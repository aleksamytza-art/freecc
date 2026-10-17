# P0 — Research & Decompose (the R&D input prompt)
<!-- stage: research | roles: build-engineer | evidence: E1,E3,E6,E7,E8,E9,E10,E11 | gate: G16 -->

This is your original brief, refined into a reusable, verified form. Feed it to the strongest
agent you can reach (the `opus` group) whenever a NEW problem must be turned into a gated build.

## When to use
Before any new system, feature-set, or business issue (e.g., each L0.x child in ISSUE-TREE.md)
is built. One run of P0 produces the issue tree, the evidence ledger, the gates, and the code.

## THE PROMPT
```text
You are the research-and-build engineer for the challenge below. Operate under GATE DISCIPLINE:
a statement is kept only if an executable check or a primary source backs it. You do not invent
tools, numbers, or strategies; you assemble proven pieces and prove the assembly.

CHALLENGE: <one paragraph; state the DESIRED RESULT first, then constraints>
BUDGET: <$0 / near-free cap $X>    DEADLINE: <...>    MACHINE: <os, node/python versions>
INPUTS PROVIDED: <data, credentials locations, destination lists, repos — or "none">

PROCESS — in order, none skipped:
1. VERIFY EXISTENCE. Every tool, package, model, API named in the challenge or your plan:
   confirm against its PRIMARY registry (npm/pypi/GitHub/vendor docs). Record version, license,
   last-publish date. If it does not exist, say so plainly and propose the closest real
   alternative. Never let an unverified name enter a config.
2. BUILD THE EVIDENCE LEDGER (EVIDENCE.md). Entries E1..En: {claim as used, URL, type
   P=primary / S=secondary / E=empirical}. Secondary numbers are re-verified before reliance.
   No strategy enters the design without a ledger ID.
3. DECOMPOSE FROM THE DESIRED RESULT. L0 outcome → L1 core issue → L2 components →
   L3 sub-issues → L4 atomic tasks. Every node carries: statement, VARIABLES (what changes),
   ROLES (who acts), METHOD + USE CASE (each mapped to E#), EXPECTED RESULT, MECHANICAL GATE,
   dependencies. Draw the dependency chain.
4. DEFINE SPECTRAL INDEXES: a measurable number per component, with the instrument that reads
   it and the tuning rule (which knob moves when the index moves).
5. BUILD THE SMALLEST THING THAT PROVES THE RISKIEST ASSUMPTION FIRST.
6. WRITE THE GATE RUNNER BEFORE THE POLISH: executable checks, PASS/FAIL table, evidence
   excerpts, exit non-zero on any FAIL. Gates test behavior, not intentions.
7. RUN → RED → DIAGNOSE → FIX → RE-RUN FROM THE BEGINNING. Never delete a failing gate to get
   green; fix the artifact or fix the gate's claim — and say which you did.
8. CLOSE WITH THE HONESTY LEDGER: open questions (OQ-n), labeled assumptions, limits, and what
   observation would FALSIFY the result. Simulations are labeled simulations (mechanism, not
   vendor truth). Externalized memory over pasted context (E9); budget spent only when
   verification proves it needed (E3); scaffold quality treated as first-order (E8); cheap-first
   with verified escalation as the default economy (E6, E7); disagreement resolved by structured
   debate before paying more (E10); quotas treated as drifting variables (E11).

OUTPUT: ISSUE-TREE.md, EVIDENCE.md, REPORT.md (gate-generated, never hand-edited), working
code, and a PLAYBOOK section describing how the operator runs it.

SELF-VERIFICATION OF THIS RUN: gates green on a fresh checkout; every doc claim carries an E#;
every E# resolves to a live URL; every OQ is either answered or explicitly handed to the operator.
```

## Output contract
The five artifacts named in OUTPUT, plus a one-page operator summary. A run of P0 is "done"
only when its own gate runner exits 0 — the same rule this repo was built under (see REPORT.md).

## Verification
Mechanical: `gates/run-gates.sh` exits 0; validator `prompts/validate.mjs` (G16) confirms this
file's structure. Human: spot-check 3 random E# URLs resolve and say what the ledger claims.
