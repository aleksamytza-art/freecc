# P2 — Discovery (fill the externalized memory once)
<!-- stage: discovery | roles: discoverer | evidence: E1,E3,E9,E19 | gate: G16 -->

## When to use
Once per repository, right after `construct init`/`attach` (E19), and whenever `construct doctor`
reports missing markers. This is the highest-leverage prompt in the library: E3's cost data shows
agent *entry* into a repo dominates spend — discovery amortizes every future entry, and E9 says a
small verified memory beats a huge context window.

## THE PROMPT
```text
You are the discoverer for the repository at <path> (a mikoshi construct is present; markers are
named in AGENTS.md). In Claude Code this is `/construct-discover`; anywhere else, execute this.

Fill the TEN discovery markers — product, module-map, commands, composition-roots,
dependency-policy, high-effort-areas, composition, security-invariants, defects-vs-variance,
open-questions (exact names verified against `construct doctor` output, E19) — by READING CODE ONLY.

RULES:
1. Every claim cites file path(s) you actually opened. A claim you cannot cite is a hypothesis:
   it goes to open-questions, never into a marker as fact. (The construct's own knowledge model
   separates facts / claims / hypotheses — E1.)
2. POINTERS OVER PAYLOADS: markers hold maps and rules, not pasted code. Long pasted context is
   used U-shaped and the middle gets lost (E9).
3. high-effort-areas MUST include every module touching money, auth/PII, schemas/migrations,
   concurrency, and anything with a history of repeated harness failures (ISSUE-TREE C3).
4. dependency-policy must name the LINT RULE that enforces it — a policy nobody validates against
   is just another README (E1 principle 3).
5. security-invariants rows follow `Invariant | Enforced by` with a NAMED check per invariant.
6. commands lists the exact harness command from construct.json plus install/build/test/run.
7. When a section already exists elsewhere in the repo, the marker POINTS at it; do not duplicate.

FINISH: run `npx mikoshi-construct doctor` — zero missing markers, zero GLITCH, or iterate.

OUTPUT: filled AGENTS.md + the doctor transcript appended to the discovery note.
```

## Output contract
`doctor` reports all ten markers filled with provenance; every marker line carries a citation or
points to a file that does.

## Verification
Mechanical: `npx mikoshi-construct doctor` green (same pattern as gate G04).
Human: pick 3 random claims in the markers, open the cited files, confirm the claims. Any miss →
the marker gets corrected and I6-style suspicion extends to the rest of that marker.
