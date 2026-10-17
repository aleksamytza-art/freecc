# P1 — Stack Setup (make FREECC live on a machine)
<!-- stage: setup | roles: setup-agent, operator | evidence: E11,E12,E13,E14,E17 | gate: G16 -->

## When to use
Day 0 on any new machine, and monthly (free-tier model IDs and quotas drift — E11 shows the
vendor actively cutting them; OQ-2 in ISSUE-TREE.md makes re-verification a standing task).

## THE PROMPT
```text
You are the setup agent for the FREECC stack in <repo path>. GOAL: `bash gates/run-gates.sh`
exits 0 on THIS machine and the router is live on :4000 serving groups opus|sonnet|haiku (E14).

STEPS — in order:
1. Read EVIDENCE.md and router/.env.example. Do NOT invent model IDs, quotas, or endpoints.
2. Collect keys. Ask the operator for exactly the missing ones among: GEMINI_API_KEY
   (aistudio.google.com/apikey, free), GROQ_API_KEY (console.groq.com, free),
   OPENROUTER_API_KEY (openrouter.ai, free; note the 50 free-req/day cap, E13),
   DEEPSEEK_API_KEY (optional near-free anchor, E17). Keys go ONLY into router/.env —
   never into any other file, never into chat output.
3. VERIFY CURRENT REALITY before trusting the config:
   a. For each provider with a key, fetch its model list (e.g. GET https://api.groq.com/openai/v1/models,
      GET https://openrouter.ai/api/v1/models, Gemini via AI Studio) and confirm every model ID used in
      router/litellm.config.yaml exists TODAY. If an ID drifted: update the config AND .env.example,
      and record old→new in SETUP-NOTES.md.
   b. Open the provider dashboards' rate-limit pages (ai.google.dev/gemini-api/docs/rate-limits,
      console.groq.com/docs/rate-limits) and write the OBSERVED rpm/tpm/rpd numbers into SETUP-NOTES.md;
      adjust rpm/tpm in the config to observed values, not to hopes.
4. Run `bash gates/run-gates.sh`. Any red: diagnose, fix, RE-RUN FROM THE BEGINNING. Never edit a
   gate to pass.
5. Start `router/start.sh`; then one smoke call per group (10-token prompt) through :4000; record
   latency, tier that answered (check LiteLLM logs), and any 429 into SETUP-NOTES.md.
6. If a whole provider is unavailable: mark its deployments commented-out, rely on fallback chains
   (the config is built for this), and open an OQ entry. Degraded ≠ fake-green.

STOP CONDITIONS: missing key → report precisely which; provider unreachable → degrade and record;
any claim you cannot verify → SETUP-NOTES.md "UNVERIFIED" section, not silent acceptance.

OUTPUT: REPORT.md (gate-generated) + SETUP-NOTES.md {model IDs verified with the endpoint that
confirmed each, observed quotas, smoke results, changes made, UNVERIFIED list}.
```

## Output contract
`REPORT.md` all green + `SETUP-NOTES.md` where every model ID in the config has a confirming
endpoint response recorded.

## Verification
Mechanical: G01–G15 green on this machine (G10 = proxy boots and serves the three groups).
Human: pick one model ID from SETUP-NOTES.md and re-fetch its provider's model list yourself.
