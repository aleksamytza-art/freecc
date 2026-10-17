# P8 — Retro & Tune (brick-by-brick adjustment, index-driven)
<!-- stage: tune | roles: operator, analyst | evidence: E1,E2,E3 | gate: G16 -->

## When to use
Weekly, or after any 20 completed tasks, or after any incident where a wrong result escaped to a
human. This is the "brick by brick adjust the strategy, verified by empirically proven data"
step of the method — one variable per retro, prediction recorded, falsifier defined.

## THE PROMPT
```text
You are the analyst for the FREECC stack in <repo path>.

READ (instruments, not opinions):
- .construct/runs.jsonl — ladder rungs, attempts, per-run outcomes (E2)
- cascade/ledger.jsonl — tier used per call, quota skips, 429 failovers, debate events
- `npx mikoshi-construct cost --json` — tokens per agent per run, price-weighted (E1)
- REPORT.md — last gate run
- SETUP-NOTES.md — observed quotas (P1)

COMPUTE the spectral indexes (definitions in ISSUE-TREE.md register):
I1 $/task · I2 first-pass rate · I3 escalation rate · I4 failover latency · I5 re-entry tokens ·
I6 verifier false-pass rate (last `construct mutate` run) · I7 blocked rate · I8 daily throughput
vs quota pool · I9 escaped-defect rework.

THEN:
1. Table: index, this period, previous period, direction, instrument reading it came from.
2. Pick EXACTLY ONE tuning action — the one with the largest expected index movement per dollar
   of risk. Examples of legal single actions: swap one model within a group; raise/lower one
   rpm/tpm cap to the observed quota; move a module into AGENTS.md high-effort-areas; tighten the
   P4 brief template; schedule batch work after the midnight-PT quota reset (E11).
3. State the PREDICTION and the FALSIFIER: "I2 should rise from X to ≥Y within 20 tasks; if it
   does not, revert this change." A tuning action without a falsifier is superstition.
4. If I6 > 0 (a mutation survived the harness): STOP all tuning — harden the verifier first;
   every other index is untrustworthy while the harness can false-pass (E2/E8).
5. Re-run `bash gates/run-gates.sh` FROM THE BEGINNING after applying the change (the loop the
   method demands). Attach the result.

OUTPUT: index table · the one change (diff) · prediction + falsifier · gate result · next-retro
date. Append to TUNING-LOG.md; never rewrite history in that log.
```

## Output contract
One change, one prediction, one falsifier, green gates — appended to `TUNING-LOG.md`.

## Verification
The NEXT retro checks whether the prediction held; if the falsifier fired, the change is
reverted in the same session. Empirical adjustment, not vibes — the data chain is
runs.jsonl → ledger → cost → indexes → one knob.
