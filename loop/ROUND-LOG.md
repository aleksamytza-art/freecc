# Loop log — measured improvement rounds

Each round: **audit → LLM findings → decompose → implement → test → re-measure**. Findings from
the LLM are recorded whether I acted on them or rejected them, because a rejected finding is
evidence too.

Machine-readable records: `round-1-audit.json` (Gemini), `round-2-review.json` (Groq).

---

## Round 0 — baseline (before any change)

Measured with `node ui/scripts/audit.mjs`:

| Metric | Baseline |
|---|---|
| Invariants | 28 passing, 0 failing |
| Accessibility heuristics | **3 / 14 passing** |
| Console errors | 0 |
| External requests | 0 |
| Horizontal overflow at 512 px | **YES** (scrollWidth 1023) |
| App payload | 109.5 KB |
| Raw DOMContentLoaded | ~590 ms |
| DOM nodes built at boot | 2147 |
| Grades (integrity) | 11 verified · 0 supported · 17 weak · 1 unsupported |

## Round 1 — audit by Gemini (`gemini-3.8-flash`), 8 findings

All eight were accepted: each named a concrete acceptance check, and each matched something the
audit had measured independently.

| id | Finding | Accepted | Outcome |
|---|---|---|---|
| F1 | Mobile overflow | yes | fixed (see round 2 below for the second half of it) |
| F2 | 13 inputs unlabelled | yes | `aria-label` on all inputs, including JS-rendered index inputs |
| F3 | No tablist/tab/tabpanel semantics | yes | full ARIA tabs + roving tabindex + arrow-key navigation |
| F4 | No `<h1>` | yes | `.logo` became the `<h1>` |
| F5 | No skip link | yes | skip link + `id="main"` |
| F6 | Toast not a live region | yes | `role="status" aria-live="polite"` |
| F7 | Cloud SVG unlabelled | yes | `aria-hidden="true"` (the Issues table is the accessible equivalent) |
| F8 | No `:focus-visible`, no reduced-motion | yes | both added; the ticker stops under reduced-motion |

Kept as a deliberate second pass: F1 was only half fixed in round 1 — see round 2.

## Round 2 — my own measurement + implementation

The round-1 audit reported overflow at "512 px" with two offending chips. Rather than guess, the
audit was taught to **name the offenders** (it now reports `overflowing[]`), and a one-off geometry
probe showed why: the header chips and the footer ticker are `nowrap` flex children that cannot
shrink, so they push past the viewport instead of wrapping.

| Change | Why | Verified by |
|---|---|---|
| Lazy tab rendering | boot built 2147 DOM nodes, all nine views, for one visible tab | DOM nodes at boot 2147 → **430** |
| `app CSS`: stack header chips, drop the rotating ticker on mobile | its text repeats in the side panel, so nothing unique is lost | overflow 1023 → **512 (none)** |
| Tables scroll inside their card, not the page | wide tables blew out the document width | same |
| `--strict` audit gate + CI step | a scorecard nobody enforces is a wish | CI |

## Round 3 — independent review by Groq (`openai/gpt-oss-120b`)

The reviewer was told to distrust the changes and judge the current state. Verdict returned:
**`fail`**, with two findings. Both were checked mechanically, and **both were rejected**:

### R1 — "critical-path issue lacks evidence; add citations so unsupported drops to zero" → REJECTED

Rejected because it asks for exactly the thing the app exists to prevent. The unsupported node is
`L0`, the root outcome, which is parameterised on an **open question** (`OQ-1: destination set D not
supplied`). Making its grade pass by adding citations would be fabricating evidence to satisfy a
metric — the precise failure mode `QUALITY.md` Q10 and truth rule 2 exist to catch. The correct
resolution is for the **operator** to supply D and add real ledger entries: a human action, listed
in the verdict as a manual action, not a code change.

### R2 — "evidence coverage chip shows 0% despite existing data" → FALSE POSITIVE

The reviewer read the *static* default `<b id="chipCov">0%</b>` in the HTML rather than the
rendered value. Measured in the browser, the chip renders **97%** (asserted by
`verify-render.mjs` → "header reports evidence coverage"). No change made.

This is the loop doing its job: the verifier is not the doer, and the doer is not obliged to accept
the verifier. A finding is only accepted when a measurement backs it.

## Final measurement

| Metric | Baseline | After | Target | Result |
|---|---|---|---|---|
| Invariants | 28 pass | **28 pass** | 0 failing | ✅ |
| Accessibility heuristics | 3 / 14 | **14 / 14** | all | ✅ |
| Console errors | 0 | **0** | 0 | ✅ |
| External requests | 0 | **0** | 0 | ✅ |
| Overflow at 512 px | yes (1023) | **no (512)** | none | ✅ |
| Payload | 109.5 KB | **114.8 KB** | < 130 KB | ✅ |
| App JS boot | not measured | **45 ms** | < 150 ms | ✅ |
| DOM nodes at boot | 2147 | **430** | — | improved |
| Grades (integrity) | 11/0/17/1 | **11/0/17/1** | unchanged | ✅ not inflated |
| CI (node 20 + 22) | green | **green** | green | ✅ |

The grade distribution is unchanged **on purpose**. A loop that improves an app which grades
claims must not improve its own grades; that would be the one regression that invalidates every
other number in this table.
