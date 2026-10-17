"use strict";
/* =========================================================================
   FREECC Decomposition & Agent UI — single file, zero external resources.
   Encodes: ISSUE-TREE.md (L0..L4, C1..C5, I-subissues), EVIDENCE.md (E1-E19),
   REPORT.md (G1-G18, real run 2026-10-17), PLAYBOOK.md (7 truth rules, loop),
   prompts P0-P8 (bodies in <script type="text/template"> above).
   Truth rules are enforced in code: evidence-gap nodes cannot resolve (rule 2),
   resolution requires a green gate or a LABELED simulation (rules 1+6).
   ========================================================================= */

const EVIDENCE=[
 {id:"E1",t:"P",u:"https://www.npmjs.com/package/mikoshi-construct",c:"mikoshi-construct v0.43.0 real (MIT, 2026-10-09): materializes architecture policy, API contract, quality harness, agent instructions; doctor/sync/cost/board/mutate/atlas CLIs"},
 {id:"E2",t:"P+E",u:"https://www.npmjs.com/package/mikoshi-construct",c:"Reasoning-budget ladder low->low->medium->high; phases Preflight->Design->Implement->Verify; schema-validated harness verdicts; a pass is never self-reported; criteria witnessed red-before/green-after"},
 {id:"E3",t:"P",u:"https://www.npmjs.com/package/mikoshi-construct",c:"Cost data (Opus, 13 runs): low 557-740k tokens, medium 847k-5.9M, high ~14.19M; agent entry into the repo dominates spend; one contradictory brief burned 4.16M tokens for nothing"},
 {id:"E4",t:"E",u:"https://github.com/E1i/mikoshi-construct",c:"Role model pins verified in materialized files: implementer=model:sonnet/effort:low, harness=inherit (never edits), architect=inherit/effort:xhigh (never writes)"},
 {id:"E5",t:"P",u:"https://github.com/awslabs/aidlc-workflows",c:"Lineage: AI-DLC from AWS Labs — classify, implement, verify, escalate; one core, many harnesses"},
 {id:"E6",t:"P",u:"https://arxiv.org/abs/2305.05176",c:"FrugalGPT (Chen/Zaharia/Zou): LLM cascade matches GPT-4 at up to 98% cost reduction, or +4% accuracy at same cost; 1400+ citations"},
 {id:"E7",t:"P",u:"https://arxiv.org/abs/2406.18665",c:"RouteLLM (LMSYS): preference-trained routers cut cost up to 85% at 95% of GPT-4 performance (MT-Bench); >2x savings; open-source framework"},
 {id:"E8",t:"P",u:"https://arxiv.org/abs/2405.15793",c:"SWE-agent (NeurIPS 2024): the agent-computer interface (scaffold) significantly enhances model performance — scaffold design is first-order, independent of model size"},
 {id:"E9",t:"P",u:"https://arxiv.org/abs/2307.03172",c:"Lost in the Middle (TACL 2024): long-context use is U-shaped — huge windows do not behave like effective memory; externalized structured memory is the justified substitute"},
 {id:"E10",t:"P",u:"https://arxiv.org/abs/2305.14325",c:"Multiagent Debate (Du et al.): multiple LLM instances proposing+critiquing improve factuality and reasoning — basis for a sequence of free agents"},
 {id:"E11",t:"P+S",u:"https://ai.google.dev/gemini-api/docs/rate-limits",c:"Gemini free tier real: per-model RPM/TPM/RPD, per-project, RPD resets midnight PT, 429 on breach; Google actively reducing free quotas -> quotas are variables"},
 {id:"E12",t:"P+S",u:"https://console.groq.com/docs/rate-limits",c:"Groq free tier with per-model limits (~6k TPM community-reported on free tier — re-verify in console)"},
 {id:"E13",t:"P",u:"https://openrouter.ai/docs/faq",c:"OpenRouter free models: 50 free requests/day under $10 credits, 1000/day after; 402/429 handling documented"},
 {id:"E14",t:"P",u:"https://docs.litellm.ai/docs/tutorials/claude_non_anthropic_models",c:"Claude Code on LiteLLM proxy (official tutorial, based on Anthropic's config): ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN; automatic Anthropic Messages API translation"},
 {id:"E15",t:"P",u:"https://code.claude.com/docs/en/model-config",c:"Alias remap env vars ANTHROPIC_DEFAULT_OPUS/SONNET/HAIKU_MODEL + CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1 populate /model from the gateway"},
 {id:"E16",t:"P+S",u:"https://opencode.ai/docs/providers/",c:"OpenCode: open-source terminal agent, 75+ providers, custom baseURL provider in opencode.json, local models supported"},
 {id:"E17",t:"P",u:"https://api-docs.deepseek.com/quick_start/pricing/",c:"DeepSeek official pricing: $0.15/M input off-peak ($0.30 peak) — the near-free never-stall anchor"},
 {id:"E18",t:"E",u:"",c:"Empirical: LiteLLM 1.105.1 installed and booted on router/litellm.config.yaml in this workspace, serving groups opus|sonnet|haiku (gate G10)"},
 {id:"E19",t:"E",u:"",c:"Empirical: real mikoshi-construct install; init materialized 44 files; doctor + soulkill --json executed; 10 discovery marker names verified (gates G02-G05)"}
];
const GATES=[
 {id:"G01",d:"node >= 20 present (mikoshi engines requirement, E1)",s:"PASS"},
 {id:"G02",d:"mikoshi-construct CLI executes from workspace install (E19)",s:"PASS"},
 {id:"G03",d:"construct init materialized the baseline (44 files: agents, ladder, policy, harness scripts)",s:"PASS"},
 {id:"G04",d:"construct doctor executes and reads the baseline back (E19)",s:"PASS"},
 {id:"G05",d:"construct soulkill --json emits valid machine-readable facts",s:"PASS"},
 {id:"G06",d:"ladder constant matches docs: low -> low,low,medium,high (E2)",s:"PASS"},
 {id:"G07",d:"role model pins: implementer=sonnet, harness=inherit, architect=inherit (E4)",s:"PASS"},
 {id:"G08",d:"litellm proxy installed and importable (E18)",s:"PASS"},
 {id:"G09",d:"router config YAML parses (groups/fallbacks/strategy shape check)",s:"PASS"},
 {id:"G10",d:"litellm proxy BOOTS on this config and serves /v1/models with opus|sonnet|haiku (E14)",s:"PASS"},
 {id:"G11",d:"cascade server boots (SANDBOX) and solves an easy task on the weak tier",s:"PASS"},
 {id:"G12",d:"hard task escalates weak->mid->strong (FrugalGPT mechanism, E6)",s:"PASS"},
 {id:"G13",d:"budget guard blocks escalation past budget_usd (E3)",s:"PASS"},
 {id:"G14",d:"1000-task simulation: all cost/quality assertions hold (synthetic replication E6/E7/E10/E13)",s:"PASS"},
 {id:"G15",d:"harness configs valid: opencode.json parses; claude-code.env pins alias remaps; AGENTS template has all 10 markers",s:"PASS"},
 {id:"G16",d:"prompt library validated: P0-P8 headers/sections machine-checked; every cited E# exists in EVIDENCE.md",s:"PASS"},
 {id:"G17",d:"PLAYBOOK references all 9 prompts + the seven truth rules + the gate loop",s:"PASS"},
 {id:"G18",d:"this UI: inline app script extracted, passes node --check; required views + data constants present",s:"PASS"}
];
const INDEXES=[
 {id:"I1",n:"$ per task",d:"cost per completed task",i:"construct cost --json + cascade/ledger.jsonl"},
 {id:"I2",n:"first-pass rate",d:"share of tasks green on rung 1",i:".construct/runs.jsonl"},
 {id:"I3",n:"escalation rate",d:"tasks leaving the weak tier",i:"ledger event:attempt counts"},
 {id:"I4",n:"failover latency",d:"429 -> next provider answering",i:"LiteLLM logs / cooldown_time"},
 {id:"I5",n:"re-entry tokens",d:"tokens paid per fresh agent entry",i:"session tokens / tasks (E3 method)"},
 {id:"I6",n:"false-pass rate",d:"mutations the harness missed",i:"construct mutate apply/judge (E1)"},
 {id:"I7",n:"blocked rate",d:"bad-brief stops per 100 tasks",i:"runs.jsonl status:blocked (E2/E3)"},
 {id:"I8",n:"daily throughput",d:"tasks/day under pooled quotas",i:"sum of provider RPD (E11-E13)"},
 {id:"I9",n:"escaped-defect cost",d:"rework after a wrong result reached a human",i:"harness findings + CI"}
];
const PROMPTS=[
 {id:"P0",n:"Research & Decompose",w:"any NEW problem -> gated build (the R&D input prompt)"},
 {id:"P1",n:"Stack Setup",w:"day 0 on a machine + monthly quota/ID re-verification"},
 {id:"P2",n:"Discovery",w:"fill the 10 memory markers once per repo (kills re-entry cost)"},
 {id:"P3",n:"Plan",w:"feature -> 2-6 tasks with red-witnessable criteria + effort classes"},
 {id:"P4",n:"Implement Brief",w:"the only input an implementer gets"},
 {id:"P5",n:"Harness Verdict",w:"verification that cannot be gamed by the doer"},
 {id:"P6",n:"Debate / Cross-check",w:"sequence of free agents where no mechanical verifier exists"},
 {id:"P7",n:"Architect Escalation",w:"design-only, bought by evidence of failure"},
 {id:"P8",n:"Retro & Tune",w:"weekly: indexes -> ONE knob -> prediction + falsifier -> re-run gates"}
];
const TRUTH_RULES=[
 "1 · No result without a gate — 'done' = run-gates.sh exit 0.",
 "2 · No claim without an E# — the validator fails the build on orphan citations.",
 "3 · The verifier is never the doer — implementer reports, harness decides.",
 "4 · Red before green — an unwitnessed criterion was never a criterion.",
 "5 · Test the test — construct mutate; while I6>0 nothing else is trustworthy.",
 "6 · Synthetic is labeled synthetic — simulations prove mechanism, not vendors.",
 "7 · Open questions are deliverables — a blocked+question beats a 4.16M-token guess."
];

/* ---------- FREECC engine subtree (from ISSUE-TREE.md; reused by the generator) ---------- */

/* ---------- FREECC engine subtree (from ISSUE-TREE.md) ---------- */
function N(id,col,t,d,o){ return Object.assign({id:id,col:col,t:t,d:d,ev:[],g:[],ix:[],p:"P0",w:5,st:"open",vars:"",roles:"",oq:null,sim:false},o||{}); }
const ENGINE_NODES=[
 N("L1",2,"FREECC toolset: Max-class performance, free & scalable","Five proven substitutes for Max: cascade+ladder (reasoning), quota pooling (limits), externalized memory (context), separated verification (reliability), one role model across harnesses (coherence).",{ev:["E6","E7","E8","E9","E10","E14"],g:["G10","G14","G15","G16","G17"],ix:["I1","I2","I8"],p:"P0",w:9,vars:"free-tier IDs, quotas, tier prices, difficulty mix",roles:"operator, architect, implementer, harness"}),
 N("C1",1,"ROUTING — which model answers this call","Quota failover + quality cascade + role pre-routing + optional debate. Config: router/litellm.config.yaml (groups opus|sonnet|haiku).",{ev:["E6","E7","E11","E12","E13","E14"],g:["G09","G10","G12","G13","G14"],ix:["I3","I4","I8"],p:"P1",w:8,st:"resolved",vars:"RPM/TPM/RPD caps, cooldowns, fallback order",roles:"router (auto), operator (refresh), harness (rejects weak answers)"}),
 N("I1.1",0,"quota failover","LiteLLM usage-based-routing-v2 + fallbacks + cooldown: one provider's 429 never stops the fleet.",{ev:["E11","E12","E13","E14"],g:["G09","G10"],p:"P1",w:7,st:"resolved"}),
 N("I1.2",0,"quality-gated cascade","FrugalGPT escalation: $0 tiers first; verifier decides; budget_usd hard-stop. cascade/server.mjs.",{ev:["E6","E7"],g:["G11","G12","G13","G14"],p:"P8",w:8,st:"resolved"}),
 N("I1.3",0,"role pre-routing","Alias contract opus/sonnet/haiku; Claude Code remaps via ANTHROPIC_DEFAULT_*_MODEL onto mikoshi role pins.",{ev:["E4","E14","E15"],g:["G07","G15"],p:"P1",w:7,st:"resolved"}),
 N("I1.4",0,"debate sampling","Majority-of-3 at mid tier before paying strong — only where no mechanical verifier exists.",{ev:["E10"],g:["G14"],p:"P6",w:5,st:"resolved"}),
 N("C2",1,"HARNESS — where the human talks to the fleet","Claude Code via router (official wiring) or OpenCode (fully free OSS) or any OpenAI client on the cascade server.",{ev:["E14","E15","E16"],g:["G10","G15"],ix:["I5"],p:"P1",w:7,st:"resolved",roles:"operator (human), netrunner (agent)"}),
 N("I2.1",0,"Claude Code wiring","harness/run-claude-code.sh: ANTHROPIC_BASE_URL -> :4000, alias remap, gateway model discovery.",{ev:["E14","E15"],g:["G15"],p:"P1",w:6,st:"resolved"}),
 N("I2.2",0,"OpenCode wiring","opencode.json custom provider freecc -> :4000/v1; model freecc/sonnet; small_model freecc/haiku.",{ev:["E16"],g:["G15"],p:"P1",w:6,st:"resolved"}),
 N("I2.3",0,"direct API","cascade/server.mjs exposes OpenAI-compatible /v1/chat/completions with ledger + budget headers.",{ev:["E6"],g:["G11"],p:"P1",w:5,st:"resolved"}),
 N("C3",1,"CONSTRUCT — workflow that makes weak models safe","mikoshi-construct: policy + contract + harness + roles + ladder. Lineage AI-DLC (E5).",{ev:["E1","E2","E3","E5"],g:["G02","G03","G04","G05","G06","G07"],ix:["I2","I6","I7"],p:"P2",w:9,vars:"preset, effort class, brief quality",roles:"architect, implementer, harness, operator"}),
 N("I3.1",0,"init / attach","construct init materialized 44 files in sandbox; attach jack-in for foreign repos.",{ev:["E1","E19"],g:["G03"],p:"P1",w:7,st:"resolved"}),
 N("I3.2",0,"discovery protocol","/construct-discover fills 10 markers; doctor checks them mechanically.",{ev:["E1","E19"],g:["G04","G05"],p:"P2",w:8,st:"resolved"}),
 N("I3.3",0,"reasoning-budget ladder","low->low->medium->high; rungs bought only by red verdicts; runs logged to .construct/runs.jsonl.",{ev:["E2","E3"],g:["G06"],p:"P4",w:9,st:"resolved"}),
 N("I3.4",0,"mutation check (test the test)","construct mutate injects a named wrong implementation; harness must catch it -> index I6.",{ev:["E1"],g:[],p:"P8",w:7,st:"open",oq:"operator-run gate pending: schedule `construct mutate` weekly"}),
 N("C4",1,"CONTEXT/MEMORY — free substitute for a huge window","Lost in the Middle says windows are U-shaped; the fix is small verified memory read first.",{ev:["E3","E9"],g:["G15"],ix:["I5"],p:"P2",w:7}),
 N("I4.1",0,"AGENTS.md 10 markers","Template carries all ten marker names verified against real doctor output.",{ev:["E9","E19"],g:["G15"],p:"P2",w:7,st:"resolved"}),
 N("I4.2",0,"window discipline","Write findings out at ~50% window; pointers over payloads; never rely on the model remembering.",{ev:["E9"],g:[],p:"P2",w:5,st:"resolved"}),
 N("I4.3",0,"atlas / repo map","construct atlas renders one self-contained HTML map of stages, parts and code.",{ev:["E1"],g:[],p:"P2",w:4,st:"open",oq:"operator-run: execute `construct atlas` on the live repo"}),
 N("C5",1,"ECONOMY — the budget is divided in a smart way","Three levels: per-call (cascade budget), per-task (ladder class), per-day (quota pool). Ledgers everywhere.",{ev:["E3","E11","E12","E13","E17"],g:["G09","G13","G14"],ix:["I1","I8"],p:"P8",w:8,st:"resolved",roles:"operator sets budget; ledger records; cascade enforces"}),
 N("I5.1",0,"pool sizing from observed quotas","rpm/tpm caps set to dashboard-observed values (P1 step 3b), not hopes; midnight-PT reset calendar.",{ev:["E11","E12","E13"],g:["G09","G10"],p:"P1",w:6,st:"resolved"}),
 N("I5.2",0,"ledgers & observability","cascade/ledger.jsonl + .construct/runs.jsonl + construct cost --json price every rung.",{ev:["E1","E2"],g:["G11","G12","G13"],p:"P8",w:6,st:"resolved"}),
 N("I5.3",0,"graceful degradation policy","Whole provider down -> fallback chains; sim S2/S3 held >=0.99 accuracy ratio under caps.",{ev:["E11","E13"],g:["G14"],p:"P8",w:6,st:"resolved"}),
 N("I5.4",0,"three-level budget split","per-call budget_usd (G13) · per-task effort class (G06) · per-day pool (G09/G10).",{ev:["E2","E3"],g:["G06","G13"],p:"P3",w:7,st:"resolved"})
];
const ENGINE_EDGES=[
 ["I1.1","C1"],["I1.2","C1"],["I1.3","C1"],["I1.4","C1"],
 ["I2.1","C2"],["I2.2","C2"],["I2.3","C2"],
 ["I3.1","C3"],["I3.2","C3"],["I3.3","C3"],["I3.4","C3"],
 ["I4.1","C4"],["I4.2","C4"],["I4.3","C4"],
 ["I5.1","C5"],["I5.2","C5"],["I5.3","C5"],["I5.4","C5"],
 ["I3.2","I4.1"],["I1.1","I5.1"],["I3.3","I5.4"],["I5.2","I5.3"],
 ["C1","L1"],["C2","L1"],["C3","L1"],["C4","L1"],["C5","L1"],["C1","I2.1"],["C1","I2.2"],["C1","I2.3"]
];

/* ---------- outcome-domain lexicon (P0 step 1) ---------- */
const LEX=[
 {k:"bookings",title:"Payments & Booking Conversion",kw:["book","pay","checkout","reserve","purchase","invoice","order","price"],
  l0:"Paid bookings convert (money-path)",
  subs:[
   {id:"CB.1",t:"Contract-first payment integration",d:"contracts/api/openapi.yaml changes BEFORE code; types generated; breaking changes flagged in CI (E4 implementer rule, E1 contract tooling).",ev:["E1","E4"],p:"P4",w:9},
   {id:"CB.2",t:"Money-path = high effort class",d:"Every task touching money starts at ladder class high; architect designs before any code (E2, E3 pricing of classes).",ev:["E2","E3"],p:"P3",w:8},
   {id:"CB.3",t:"Funnel witnesses red/green",d:"Each funnel step gets an executable check witnessed failing before and passing after (E2). No unwitnessable criteria (P3).",ev:["E2"],p:"P5",w:8},
   {id:"CB.4",t:"PCI / SCA compliance scope",d:"Card-data scope, 3-D Secure, refunds. NO ledger entry exists yet.",ev:[],p:"P0",w:7,oq:"OQ-auto: run P0 step 1-2 — verify provider docs, add ledger entry, define gate BEFORE build"}]},
 {k:"leads",title:"Lead Capture & Qualification",kw:["lead","qualif","crm","contact","signup","form","prospect"],
  l0:"Qualified leads flow",
  subs:[
   {id:"LB.1",t:"Capture forms + validation harness",d:"Forms as contracts; validation rules tested red-before/green-after (E2).",ev:["E2"],p:"P4",w:7},
   {id:"LB.2",t:"Lead scoring via cascade (cheap-first)",d:"Score with the $0 tier; escalate only when the verifier rejects — FrugalGPT shape (E6, E7).",ev:["E6","E7"],p:"P8",w:7},
   {id:"LB.3",t:"CRM routing rules under contract",d:"Routing table versioned in the repo; lint enforces the dependency policy (E1).",ev:["E1"],p:"P4",w:6}]},
 {k:"content",title:"Destination Content & SEO Inventory",kw:["destination","travel","tour","trip","hotel","flight","seo","content","page","blog","landing","copy"],
  l0:"Inventory of destination pages expands",
  subs:[
   {id:"NB.1",t:"Page factory on the ladder",d:"One template task per destination at class low; harness gates every page; class rises only on red (E2, E3).",ev:["E2","E3"],p:"P3",w:8},
   {id:"NB.2",t:"Per-destination memory markers",d:"Destination facts live in AGENTS.md-style markers, cited to sources — not in context (E9); kills re-entry cost (E3).",ev:["E9","E3"],p:"P2",w:7},
   {id:"NB.3",t:"Factual-claim verifier (no invented facts)",d:"Every published claim must cite a source file/URL; NO executable checker built yet.",ev:[],p:"P0",w:8,oq:"OQ-auto: define the claim-check gate (P0 step 6) before publishing anything"}]},
 {k:"acquisition",title:"Acquisition & Campaigns",kw:["traffic","ads","campaign","social","email","outreach","channel","newsletter"],
  l0:"Traffic & outreach produce qualified demand",
  subs:[
   {id:"AB.1",t:"Campaign copy via debate cross-check",d:"Copy has no mechanical verifier -> P6 debate (3 solvers + judge) is the sanctioned checker (E10).",ev:["E10"],p:"P6",w:6},
   {id:"AB.2",t:"Channel quota calendar",d:"Send schedules aligned to provider quota resets (midnight PT, E11; 50/day OpenRouter-class limits, E13).",ev:["E11","E13"],p:"P8",w:6},
   {id:"AB.3",t:"Landing A/B under harness",d:"Variant tasks are ladder tasks; the metric assertion is the witnessed criterion (E2).",ev:["E2"],p:"P5",w:6}]},
 {k:"analytics",title:"Analytics & Index Instrumentation",kw:["analytic","metric","report","dashboard","kpi","measure","track"],
  l0:"Decisions run on measured indexes",
  subs:[
   {id:"AN.1",t:"Instrument I1-I9",d:"Wire runs.jsonl + ledger.jsonl + construct cost into the index register (E1, E2).",ev:["E1","E2"],p:"P8",w:7},
   {id:"AN.2",t:"Weekly one-knob retro",d:"P8 loop: indexes -> one change -> prediction + falsifier -> re-run all gates (E3 economy).",ev:["E3"],p:"P8",w:7}]},
 {k:"compliance",title:"Compliance & Security Invariants",kw:["complian","gdpr","legal","pci","kyc","security","privacy","consent"],
  l0:"Compliance holds under automation",
  subs:[
   {id:"CP.1",t:"Invariants table with named checks",d:"Invariant | Enforced by — every row names the check that enforces it (E1 principle 3).",ev:["E1"],p:"P2",w:7},
   {id:"CP.2",t:"Secret scanning in CI",d:"gitleaks over history on every push/PR — materialized by construct init and verified in sandbox (E1, E19).",ev:["E1","E19"],p:"P1",w:6}]}
];
const GENERIC_SUBS=[
 {id:"GN.1",t:"Run P0: verify-existence + ledger",d:"Confirm every named tool against its primary registry; open EVIDENCE entries before design (scaffold-first, E8).",ev:["E8"],p:"P0",w:8},
 {id:"GN.2",t:"Plan into witnessed tasks",d:"P3: 2-6 tasks, red-witnessable criteria, effort classes priced by E3 token data.",ev:["E2","E3"],p:"P3",w:7},
 {id:"GN.3",t:"Build-verify loop",d:"P4 brief -> P5 verdict; verifier never the doer (E2, E8).",ev:["E2","E8"],p:"P4",w:8},
 {id:"GN.4",t:"Tune from indexes",d:"P8: one knob, prediction, falsifier, gates from the beginning (E1, E3).",ev:["E1","E3"],p:"P8",w:6}
];
