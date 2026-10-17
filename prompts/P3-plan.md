# P3 — Plan (feature → 2–6 gated tasks)
<!-- stage: plan | roles: planner | evidence: E2,E3 | gate: G16 -->

## When to use
Per feature, after discovery (P2) is green. In Claude Code: `/plan <feature>`. The plan is where
the budget is *decided* — E3's numbers (low ≈ 0.5M billable tokens vs high ≈ 14M on Opus) are why
effort class is assigned here, deliberately, before any agent runs.

## THE PROMPT
```text
FEATURE: <one paragraph, user-visible outcome, one repo>

Turn this feature into 2–6 tasks. For EACH task output:
- id, one sentence, ONE owner module (cross-module work = two tasks with a dependency, not one)
- effort class low|medium|high WITH RATIONALE. Default low. Force high when the task touches
  money, auth/PII, schemas/migrations, concurrency, or an AGENTS.md high-effort-area (the ladder
  is allowed to start high when the task warrants it — E2).
- acceptance criteria: each is an EXECUTABLE check that can be witnessed RED before the
  implementation exists and GREEN after (E2). If you cannot state how it fails first, it is
  intent, not a criterion — rewrite it until you can.
- harness command(s) that run those criteria (from AGENTS.md §commands; default `pnpm run quality`)
- depends-on / parallel-safe flag

CONTRADICTION CHECK BEFORE OUTPUT (this is a cost gate, not a nicety): if any two criteria
conflict, or the feature conflicts with contracts/api/openapi.yaml, or a term in the feature has
two readings that change the design — STOP and output ONLY the questions. E3 measured one
contradictory brief at 4.16M tokens burned for nothing; questions are free.

OUTPUT: task table {id, sentence, class+rationale, criteria[] each with its witness command,
harness, depends-on} + the questions block (empty if none).
```

## Output contract
A task table where every criterion names a command that can fail, every task has exactly one
owner module, and the questions block is either empty or the only output.

## Verification
Mechanical: for task 1 criterion 1, run the witness command NOW — it must be red (E2: shown
failing before the implementation exists). Planner output with an unwitnessable criterion is
rejected, not repaired downstream.
