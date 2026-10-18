# QUALITY — the scorecard this app is improved against

An improvement loop is worthless without a target it can be measured against. This file defines
that target. Every line is either **machine-checked** (a script fails if it regresses) or
**manual** (a human must look). The loop in `tools/` reads `scripts/audit.mjs`, which produces the
numbers referenced here.

Run the audit:

```bash
node scripts/audit.mjs            # human-readable scorecard
node scripts/audit.mjs --json     # machine-readable, what the loop consumes
```

## Targets

| # | Target | How it is verified | Status |
|---|---|---|---|
| Q1 | Every data/rubric invariant passes | `npm test` (two suites) | machine |
| Q2 | Boot, ported capabilities and snapshot verified in a real browser | `npm run verify:render` | machine |
| Q3 | Automated accessibility heuristics: 100% pass | `scripts/audit.mjs` → `a11y` | machine |
| Q4 | No uncaught errors or `console.error` during boot | audit, via injected error capture | machine |
| Q5 | No external network requests at boot (offline claim) | audit, via Resource Timing | machine |
| Q6 | App JS boot (own code, `performance.now` around boot) under 150 ms | audit → `appJsMs` | machine |
| Q7 | Total payload under 130 KB uncompressed (no bloat) | audit → `sizes.total` | machine |
| Q8 | Usable at 375 px: no horizontal overflow, nav wraps, panel stacks | audit → `responsive.mobile` | machine |
| Q9 | CI green on Node 20 and 22, live site serving the new build | GitHub Actions + live fetch | machine |
| Q10 | **Integrity: grades are not inflated to hit a target** | audit → `grades` | machine |
| Q11 | Screen-reader pass with NVDA/VoiceOver | — | **manual** |
| Q12 | Colour contrast ≥ 4.5:1 on all text | — | **manual** |

Q10 exists because the cheapest way to "improve" a grading app is to make it grade itself
generously. The audit therefore records the grade distribution and the tests assert the rubric —
so a rise in `verified` that does not come with new corroborating sources is a failure, not a win.

## What "conceptually desired performance" means here

The app is a planning console that must be trustworthy, fast, accessible and honest. So the target
is not "more features" — it is:

1. **Trustworthy** — no claim on screen that a mechanical check does not back (Q1, Q2, Q10).
2. **Fast and offline-clean** — one screen, no build step, no network (Q5, Q6, Q7).
3. **Usable by everyone** — keyboard, screen reader, small screens (Q3, Q8, Q11).
4. **Shippable** — CI green, deployed, verified live (Q9).

Features are only worth adding if they serve one of those four.
