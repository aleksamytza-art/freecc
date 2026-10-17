# P4 — Implementer Task Brief (the only input an implementer gets)
<!-- stage: implement | roles: implementer | evidence: E2,E3,E4 | gate: G16 -->

## When to use
Per task, per ladder rung, in `/implement`. The brief is the whole contract: the implementer role
(E4) is deliberately narrow — strict constraints, structured report, no self-grading. A good brief
is cheaper than a smart model (E3).

## THE PROMPT
```text
TASK: <one sentence from the P3 table — one owner, one module>
EFFORT CLASS: <low|medium|high>   RUNG: <1..4 of the ladder (E2)>

CONTEXT POINTERS (never pasted code — E9): AGENTS.md §module-map, §commands; files <paths>;
design spec <path, if the architect produced one>; previous failure excerpt <text, if any>.

ACCEPTANCE CRITERIA (each witnessed red before you start, green when you finish — E2):
  A1: <command> → expect <exact failure signature> now, success after
  A2: ...
HARNESS COMMAND: <e.g. pnpm run quality>

CONSTRAINTS (verbatim from the materialized implementer role, E4):
- Implement ONLY the requested change. Follow the pattern of the neighbouring code.
- Add no abstraction, no dependency, no layer. Touch no unrelated module.
- HTTP route touched → change contracts/api/openapi.yaml FIRST, regenerate types, then implement.
- NEVER delete, skip, or weaken a test (.skip/.only/xfail are harness-caught, E4). A changed
  logic module ships its test in the same change.
- Read the previous failure excerpt before touching code; fix the CAUSE, not the symptom.
- Run the harness before reporting. If it fails and you cannot see why within two attempts,
  report failed with the excerpt rather than looping.
- Do not commit.

BLOCKED RULE: if the brief is ambiguous about a contract, a boundary, or which of two designs is
meant — STOP and report blocked with ONE precise question. Do not pick one. (E3: guessing on a
contradiction cost 4.16M tokens once.)

OUTPUT — exact JSON, schema-validated by the runtime (E2 REPORT schema):
{"status":"done|failed|blocked","summary":"...","files":["..."],"harnessTail":"<verbatim tail>",
 "question":"<the one precise question, or empty>"}
```

## Output contract
The REPORT JSON above. A response the schema rejects is NOT re-asked by default — a second
attempt buys another entry, not another answer (E3, README "Three principles").

## Verification
Mechanical: the harness agent (P5) — a different role, different call — decides `passed`; the
implementer's own word is never the verdict (E2: "a pass is never self-reported"; E8: scaffolds
that separate doing from checking are what make small models safe).
