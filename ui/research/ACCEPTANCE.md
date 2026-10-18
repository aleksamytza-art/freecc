# Acceptance criteria — the research core

Defined **before** the loop that fixed it, so "done" is not retrofitted to whatever got built.
Each criterion names the evidence that decides it. `node research/run.mjs` produces the artefacts.

| # | Criterion | Evidence | Status |
|---|---|---|---|
| AC1 | A run returns at least 5 real plots under the budget, each with a resolvable source URL | `ui/data/research-latest.js` → `candidates[]`, every `url` fetchable | ✅ 10 returned |
| AC2 | Every candidate carries a gate result computed by fetching **its own** page, with the matched excerpt | `candidates[].gates.checks[].evidence` | ✅ |
| AC3 | The result is visible in the app, not just in a terminal | Research tab (`10 · Research`) | ✅ |
| AC4 | The user can move a weight and the ranking changes deterministically | slider → `research-view.js` re-score; parity + ranking tests | ✅ |
| AC5 | Criteria with no mechanical source are reported as gaps and **never** counted as passed | `gates.unverified` → `ok: null`; excluded from the score | ✅ 3 declared |
| AC6 | Nothing is fabricated: a listing that is not land, or whose price is missing from its page, is rejected | `type` + `plausible` + `price` gates; blocked rows visible | ✅ (a bathtub and a trading card were blocked) |
| AC7 | The app still passes its own quality gates | `npm test` 40, `verify-render`, `audit --strict` | ✅ |
| AC8 | CI is green and the live site serves the run | GitHub Actions + Pages fetch | see verdict |

## Non-goals, stated plainly

- **This is not a crawler.** One request per query and per shortlisted plot, ≥750 ms apart, with a
  hard cap. Volume is a manual decision, and the source site's terms are the user's to respect.
- **One source.** `bazos.sk` is the only adapter. Adding another source means adding an adapter
  that returns the same row shape — the gates do not change.
- **Climate and legality are not solved.** They are the two criteria that matter most for a
  glamping business and the two this engine cannot check. They are surfaced as gaps instead of
  being scored by vibes. Solving them needs a cited climate dataset and the municipal zoning
  plan, per plot.

## What a "result" means here

A row is a **result** only when its critical gates pass: it is in the real-estate section, it is
land, its price is plausible and appears on its own page. Everything else is shown as blocked,
with the failing check named. The score only orders the admissible rows — it can never rescue one.
