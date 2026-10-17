# P6 — Debate / Cross-check (sequence of free agents before paying more)
<!-- stage: verify | roles: solver, judge | evidence: E2,E10 | gate: G16 -->

## When to use
Exactly three situations — never as a default (debate costs 3–4 calls, E10's method is worth its
price only where a mechanical verifier can't decide):
1. No mechanical verifier exists for the artifact (copy, naming, UX text, architecture rationale).
2. Two runs of the same task disagreed.
3. The cascade is about to escalate weak→mid→strong and the mid tier is ambiguous — majority
   sampling at mid is cheaper than one strong call (wired as `debate:true` in cascade/core.mjs,
   scenario S2b in the simulation, G14).

## THE PROMPT
```text
STEP 1 — SOLVE (three independent calls, SAME tier, temperature ~0.7, no shared history):
  <the task brief, P4 form, minus the previous-failure excerpt>

STEP 2 — JUDGE (a fourth call, at the same or next tier; the judge sees ONLY the three answers
and the acceptance criteria, never which answer came from which solver):
  "Three candidate answers follow, with the acceptance criteria. For EACH criterion, state which
  candidates satisfy it and cite the exact part that satisfies/violates it. Majority agreement is
  evidence, not proof: a well-argued minority beats a lazy majority (E10 — debate improves
  factuality through critique, not through voting alone). Then output JSON:
  {"adopted": <candidate id>, "votes": {criterion: [ids satisfying]}, "rationale": "...",
   "concordant": bool}"

STEP 3 — ROUTE:
  concordant=true  ⇒ adopt; log a debate event to the ledger (cascade server does this natively);
                     if ANY mechanical verifier exists, re-run it on the adopted answer — the
                     debate never overrides a red harness (E2).
  concordant=false ⇒ escalate one tier, appending the disagreement summary as the failure
                     excerpt (the E2 rule: the next rung receives why the last one failed).

CONSTRAINT: judge output that fails the JSON shape voids the round — do not re-ask; escalate
instead (E3 economy: entries are the cost).
```

## Output contract
Judge JSON + a ledger entry (`event:debate`, votes recorded — implemented in `cascade/core.mjs`,
exercised by `simulate.mjs` scenario S2b under gate G14).

## Verification
Mechanical: ledger shows the debate event and the subsequent route (adopt or escalate); any
adopted answer that has a mechanical verifier available must pass it. Truth rule #3 (PLAYBOOK):
the judge is never one of the solvers.
