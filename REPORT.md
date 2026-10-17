# FREECC REPORT — mechanical gate run

- Date: 2026-10-17 12:33 UTC  · Host: sandbox workspace x86_64
- Result: **17 PASS / 0 FAIL** (exit code 0)
- Rule: a statement is only kept in the docs if its gate is green (EVIDENCE.md rule 1).

| Gate | Check | Status |
|------|-------|--------|
| G01 | node >= 20 present (mikoshi engines requirement, E1) | **PASS** |
| G02 | mikoshi-construct CLI executes from workspace install (E19) | **PASS** |
| G03 | construct init materialized the baseline (44 files: agents, ladder, policy, harness scripts) | **PASS** |
| G04 | construct doctor executes and reads the baseline back (E19) | **PASS** |
| G05 | construct soulkill --json emits valid machine-readable facts | **PASS** |
| G06 | reasoning-budget ladder constant matches docs: low -> low,low,medium,high (E2) | **PASS** |
| G07 | role model pins exist: implementer=sonnet, harness=inherit, architect=inherit (E4) | **PASS** |
| G08 | litellm proxy installed and importable (E18) | **PASS** |
| G09 | router config YAML parses (schema-shape check before boot) | **PASS** |
| G10 | litellm proxy BOOTS on this config and serves /v1/models with groups opus|sonnet|haiku (E14) | **PASS** |
| G11 | cascade server boots (SANDBOX) and solves an easy task on the weak tier | **PASS** |
| G12 | hard task escalates through weak->mid->strong (FrugalGPT cascade mechanism, E6) | **PASS** |
| G13 | budget guard blocks escalation past budget_usd (E3: do not pay for reasoning unproven) | **PASS** |
| G14 | 1000-task strategy simulation: all cost/quality assertions hold (synthetic replication of E6/E7/E10/E13) | **PASS** |
| G15 | harness configs valid: opencode.json parses, claude-code.env pins alias remaps, AGENTS template has all 10 markers | **PASS** |
| G16 | prompt library validated: P0–P8 present, headers/sections machine-checked, every E# cited exists in EVIDENCE.md | **PASS** |
| G17 | PLAYBOOK operational loop references all 9 prompts + the seven truth rules | **PASS** |

## Evidence excerpts

<details><summary>G01 — node >= 20 present (mikoshi engines requirement, E1) (PASS)</summary>

```
v20.20.2
10.8.2
```
</details>

<details><summary>G02 — mikoshi-construct CLI executes from workspace install (E19) (PASS)</summary>

```
[90mmikoshi-construct — bootstrap for AI-native software projects (construct v0.43.0)[39m

[4m[1mUSAGE[22m[24m [36mconstruct init|attach|jack-in|detach|jack-out|soulkill|inspect|capture|doctor|sync|cost|board|graph|atlas|intake|mutate[39m
```
</details>

<details><summary>G03 — construct init materialized the baseline (44 files: agents, ladder, policy, harness scripts) (PASS)</summary>

```
46
```
</details>

<details><summary>G04 — construct doctor executes and reads the baseline back (E19) (PASS)</summary>

```
doctor: baseline intact + discovery markers reported
```
</details>

<details><summary>G05 — construct soulkill --json emits valid machine-readable facts (PASS)</summary>

```
soulkill JSON valid, schemaVersion 1
```
</details>

<details><summary>G06 — reasoning-budget ladder constant matches docs: low -> low,low,medium,high (E2) (PASS)</summary>

```
const LADDERS = {
  low: ['low', 'low', 'medium', 'high'],
  medium: ['medium', 'medium', 'high'],
  high: ['high', 'high', 'xhigh'],
}
```
</details>

<details><summary>G07 — role model pins exist: implementer=sonnet, harness=inherit, architect=inherit (E4) (PASS)</summary>

```
sandbox/demo-lib/.claude/agents/implementer.md
sandbox/demo-lib/.claude/agents/harness.md
sandbox/demo-lib/.claude/agents/architect.md
```
</details>

<details><summary>G08 — litellm proxy installed and importable (E18) (PASS)</summary>

```
litellm 1.105.1
/opt/arena-python/bin/litellm
```
</details>

<details><summary>G09 — router config YAML parses (schema-shape check before boot) (PASS)</summary>

```
YAML valid; groups: ['haiku', 'opus', 'sonnet'] | fallbacks: [{'opus': ['sonnet', 'haiku']}, {'sonnet': ['haiku', 'opus']}, {'haiku': ['sonnet']}]
```
</details>

<details><summary>G10 — litellm proxy BOOTS on this config and serves /v1/models with groups opus|sonnet|haiku (E14) (PASS)</summary>

```
200 {"data":[{"id":"opus","object":"model","created":1677610602,"owned_by":"openai","mode":"chat","max_input_tokens":131072,"max_output_tokens":65536},{"id":"sonnet","object":"model","created":1677610602,"owned_by":"openai","mode":"chat","max_input_tokens":1048576,"max_output_tokens":65536},{"id":"haiku","object":"model","created":1677610602,"owned_by":"openai","mode":"chat"}],"object":"list"}
```
</details>

<details><summary>G11 — cascade server boots (SANDBOX) and solves an easy task on the weak tier (PASS)</summary>

```
HTTP 200
x-freecc-cost: 0
x-freecc-status: done
x-freecc-tier: weak
{"id":"freecc-1792240398673","object":"chat.completion","model":"cascade","choices":[{"index":0,"message":{"role":"assistant","content":"{\"answer\":\"ZZZ\"}"},"finish_reason":"stop"}],"usage":{"prompt_tokens":0,"completion_tokens":0},"freecc":{"status":"done","tier":"weak","cost":0,"ledger":[{"task":"G11","tier":"weak","event":"a
```
</details>

<details><summary>G12 — hard task escalates through weak->mid->strong (FrugalGPT cascade mechanism, E6) (PASS)</summary>

```
HTTP 200
x-freecc-cost: 0.005652
x-freecc-status: done
x-freecc-tier: strong
{"id":"freecc-1792240400090","object":"chat.completion","model":"cascade","choices":[{"index":0,"message":{"role":"assistant","content":"{\"answer\":\"ZZZ\"}"},"finish_reason":"stop"}],"usage":{"prompt_tokens":0,"completion
HTTP 200
{"summary":{"costTotal":0.005652,"reqTotal":1,"byTier":{"strong":1}},"entries":[{"ts":"2026-10-17T12:33:20.089Z","task":"G12","tier":"weak","event":"attempt","passed":false,"reason":"answer 'wrong-88' != expected 'ZZZ'","cost":0},{"ts":"2026-10-17T12:33:20.089Z","task":"G12","tier":"mid","event":"attempt","passed":false,"reason":"answer 'wrong-86' != expected 'ZZZ'","cost":0.000252},{"ts":"2026-10-17T12:33:20.089Z","task":"G12","tier":"strong","event":"attempt","passed":true,"reason":"answer matches expected","cost":0.0054}]}
```
</details>

<details><summary>G13 — budget guard blocks escalation past budget_usd (E3: do not pay for reasoning unproven) (PASS)</summary>

```
HTTP 200
x-freecc-cost: 0
x-freecc-status: blocked
x-freecc-tier: weak
{"id":"freecc-1792240401715","object":"chat.completion","model":"cascade","choices":[{"index":0,"message":{"role":"assistant","content":"{\"answer\":\"wrong-38\"}"},"finish_reason":"freecc_blocked"}],"usage":{"prompt_tokens":0,"completion_tokens":0},"freecc":{"status":"blocked","tier":"weak","cost":0,"reason":"budget_exhausted"
```
</details>

<details><summary>G14 — 1000-task strategy simulation: all cost/quality assertions hold (synthetic replication of E6/E7/E10/E13) (PASS)</summary>

```

FREECC simulation — 1000 synthetic tasks (deterministic, reproducible)

strategy                                                      cost($)      acc    escal
--------------------------------------------------------------------------------------
always-strong                                                  5.4000   0.9930        -
always-weak                                                    0.0000   0.5640        -
cascade [S1 unlimited free quota]                              0.7417   1.0000   0.4360
cascade [S2 weak capped 50/day (OpenRouter-style, E13)]        0.9685   1.0000   0.9720
cascade [S3 weak 50/day + mid capped 300 (Groq TPM-style, E12)]     3.9366   0.9940   0.9720
cascade+debate [S2b weak capped 50/day + debate at mid]        1.2964   1.0000   0.9720

cost ratio cascade(S1)/always-strong : 0.1373
cost ratio cascade(S2)/always-strong : 0.1794
acc  ratio cascade(S2)/always-strong : 1.0070

assertions:
 PASS  cascade(S1) accuracy >= 0.97 x always-strong
 PASS  cascade(S1) cost <= 0.50 x always-strong
 PASS  cascade(S2, quota-capped) accuracy >= 0.95 x always-strong
 PASS  cascade(S2) cost <= 0.60 x always-strong
 PASS  always-weak accuracy < cascade accuracy (verification+escalation earns its keep)
 PASS  S1 escalation rate < 45% (most tasks die cheap when free quota is open, E6/E7 shape)
 PASS  S2 quota-capped failover keeps accuracy >= 0.99 (graceful degradation, E11/E13)

SIMULATION OK — all assertions passed
```
</details>

<details><summary>G15 — harness configs valid: opencode.json parses, claude-code.env pins alias remaps, AGENTS template has all 10 markers (PASS)</summary>

```
opencode.json OK: freecc/sonnet freecc/haiku
claude-code.env OK; AGENTS.md.template markers: 10/10
```
</details>

<details><summary>G16 — prompt library validated: P0–P8 present, headers/sections machine-checked, every E# cited exists in EVIDENCE.md (PASS)</summary>

```
PROMPT LIBRARY OK — 9/9 prompts validated against manifest, 19 ledger entries, PLAYBOOK cross-referenced
```
</details>

<details><summary>G17 — PLAYBOOK operational loop references all 9 prompts + the seven truth rules (PASS)</summary>

```
PLAYBOOK.md: 9/9 prompts referenced, truth rules + gate loop present
```
</details>

