# FREECC UI

The interactive front end for [FREECC](../README.md) — a decomposition, dependency-cloud and
verification console for planning agent work under a *gate discipline*.

Zero dependencies, zero network requests, no build step. Open `index.html` and it runs.

![FREECC UI — the dependency cloud for the baseline tree, with the side panel showing the seven rules of truth](docs/preview.png)

```
describe an outcome  ─▶  detect outcome-domains  ─▶  generate a gated issue tree
                                                          │
    ┌─────────────────────────────────────────────────────┴──────────────────┐
    ▼                          ▼                     ▼                      ▼
 dependency cloud        issue ranking        evidence ledger        gate report
 (prereq ▶ dependent)    (unlock power)       (E1–E19)              (G01–G18)
```

## Run it

```bash
# straight from disk — no server needed
start index.html            # Windows
open index.html             # macOS

# or over HTTP, exactly like the deployed site
npm start                   # -> http://127.0.0.1:8080
PORT=3000 npm start
```

Node is only needed for the dev server and the verification scripts, never to *use* the app.

## What is in it

| View | What it does |
|---|---|
| **1 · Build** | Prompt `P0` as a wizard: state the desired result → toggle the detected outcome-domains → generate the tree. Deterministic: the same description always yields the same seed and the same tree. |
| **2 · Dependency Cloud** | Pannable/zoomable SVG DAG. Node size = unlock power, colour = status, click for the detail panel. `critical chain` walks prerequisites to `L0`; `re-layout` reseeds the layout. |
| **3 · Issues** | Every node ranked by *importance of resolving* — own weight plus the transitive weight it unlocks. |
| **4 · Indexes** | The spectral register `I1–I9`, each with the real instrument that reads it and the `P8` tuning rule. |
| **5 · Evidence** | Ledger `E1–E19` (primary / secondary / empirical), click-through from any `E#` chip. |
| **6 · Prompts** | The verified prompt library `P0–P8` with copy-to-clipboard. Bodies live in the HTML as `<script type="text/template">`. |
| **7 · Report** | Gate report `G01–G18` plus a `replay` that re-runs the gate animation. |

## The truth rules are enforced in code

The UI is not a mockup: several rules from `PLAYBOOK.md` are invariants in the app itself.

- **An issue with an evidence gap cannot be resolved.** Try it — `resolve` is refused and the
  node is routed through `P0` step 2 first.
- **Resolution needs a green gate or a labelled simulation.** `runSimGate` marks simulated
  resolutions as simulated, because they prove mechanism, not vendors.
- **The verifier is never the doer.** Gates are displayed as recorded facts, not self-reported
  claims; `E18`/`E19` are the empirical entries that make them checkable.

`npm test` asserts those invariants against the data so the numbers on screen cannot silently
drift from the ledger.

## Layout

```
index.html              app shell; holds the P0–P8 prompt templates
assets/styles.css       the entire stylesheet
assets/data.js          ledger E1–E19, gates G01–G18, indexes I1–I9,
                        prompts P0–P8, 7 truth rules, the FREECC engine subtree,
                        the outcome-domain lexicon
assets/app.js           engine (detection, generation, ordering, layout),
                        SVG cloud, panels, tables, wizard, boot
scripts/serve.mjs       zero-dependency static server
scripts/verify-render.mjs  headless-browser equivalence + boot checks
tests/data.test.mjs     data invariants (node:test)
reference/              the original single-file attachment, untouched
```

## Verification

```bash
npm run check          # node --check on both scripts
npm test               # 14 data invariants
npm run verify:render  # headless Chrome: render equivalence + boot assertions
npm run verify         # all three
```

`scripts/verify-render.mjs` is the interesting one. This app began as a single-file HTML
attachment; the sources were split into `styles.css` / `data.js` / `app.js` with **no functional
edits**. The script renders `reference/freecc-ui.original.html` and `index.html` in headless
Chrome and compares the resulting `<body>` byte-for-byte (ignoring the `<link>` and `<script>`
tags that were intentionally moved). Identical output is the proof that the split changed
nothing, and it is re-checked on every push.

It exits `0` with `SKIP` when no Chromium-family browser is present; set `CHROME_PATH` to point
at one explicitly.

### Provenance

| | |
|---|---|
| original attachment | `reference/freecc-ui.original.html` |
| sha256 | `6531a05109bec066fd86efd9707d25ba0030cb5cac767b3ea38f63dbc4c1c1ac` |
| size | 80,063 bytes, 987 lines |

## Deploy

`.github/workflows/pages.yml` publishes this folder to GitHub Pages on every push that touches
`ui/`, using the Actions artifact flow (so the folder can live in a subdirectory of the repo).
`ci.yml` runs the three verification steps on every push and pull request.

## Honest limits

- The wizard's domain detection is a keyword lexicon, not an LLM call. It is deterministic on
  purpose — but it will miss domains that are not in `LEX`.
- Index values in the UI are session-local illustrations. Wire them to `.construct/runs.jsonl`,
  `cascade/ledger.jsonl` and `construct cost --json` for real numbers.
- The gate report is a recorded snapshot of a real run, not a live re-execution.
