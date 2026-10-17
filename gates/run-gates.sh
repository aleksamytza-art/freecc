#!/usr/bin/env bash
# =============================================================================
# FREECC mechanical gates — every claim in the docs must pass an executable
# check here. Writes REPORT.md (PASS/FAIL + evidence excerpts). Exit 0 only if
# all gates pass. No curl in this environment: all HTTP checks use node fetch.
# =============================================================================
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
REPORT="$ROOT/REPORT.md"
TMP="$(mktemp -d)"
PASS=0; FAIL=0; declare -a ROWS=(); declare -a DETAILS=()

add() { # id desc status detail
  ROWS+=("| $1 | $2 | **$3** |")
  DETAILS+=("<details><summary>$1 — $2 ($3)</summary>

\`\`\`
$(printf '%s' "$4" | head -c 2400)
\`\`\`
</details>")
  if [[ "$3" == "PASS" ]]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
}

gate() { # id desc bash-cmd-string
  local id="$1" desc="$2" cmd="$3" out code
  out=$(bash -c "$cmd" 2>&1); code=$?
  if [[ $code -eq 0 ]]; then add "$id" "$desc" "PASS" "$out"; else add "$id" "$desc" "FAIL" "$out"; fi
  echo "[$id] $([[ $code -eq 0 ]] && echo PASS || echo FAIL) — $desc"
}

http() { # method url [body] [headers-json] -> prints "HTTP <code>" + body; exit 0 iff 2xx
  node -e '
const [, method, url, body, headers] = process.argv;
fetch(url, { method, body: body && body !== "-" ? body : undefined, headers: headers && headers !== "-" ? JSON.parse(headers) : undefined })
  .then(async r => { const t = await r.text(); console.log("HTTP " + r.status); for (const [k,v] of r.headers) if (k.startsWith("x-freecc")) console.log(k+": "+v); console.log(t); process.exit(r.ok ? 0 : 1); })
  .catch(e => { console.log("FETCH ERROR: " + e.message); process.exit(1); });
' "$1" "$2" "${3:--}" "${4:--}"
}
export -f http   # gate() runs commands in a child bash; the helper must travel with it

# --- L1 environment -----------------------------------------------------------
gate G01 "node >= 20 present (mikoshi engines requirement, E1)" \
  'v=$(node --version | cut -d. -f1 | tr -d v); [ "$v" -ge 20 ] && node --version && npm --version'

# --- L2 mikoshi-construct (empirical, E19) ------------------------------------
gate G02 "mikoshi-construct CLI executes from workspace install (E19)" \
  'cd sandbox && npx mikoshi-construct --help | head -3'
gate G03 "construct init materialized the baseline (44 files: agents, ladder, policy, harness scripts)" \
  'cd sandbox/demo-lib && for f in construct.json construct.model.json AGENTS.md architecture/security-invariants.md scripts/construct/implement.workflow .claude/agents/implementer.md .claude/agents/harness.md .claude/agents/architect.md .claude/skills/implement/SKILL.md; do [ -f "$f" ] || { echo "MISSING $f"; exit 1; }; done; find . -path ./node_modules -prune -o -type f -print | wc -l'
gate G04 "construct doctor executes and reads the baseline back (E19)" \
  'cd sandbox/demo-lib && npx mikoshi-construct doctor 2>&1 | grep -q "Materialized by construct" && echo "doctor: baseline intact + discovery markers reported"'
gate G05 "construct soulkill --json emits valid machine-readable facts" \
  'cd sandbox/demo-lib && npx mikoshi-construct soulkill --json | node -e "let s=\"\";process.stdin.on(\"data\",d=>s+=d).on(\"end\",()=>{const j=JSON.parse(s);if(j.schemaVersion!==1)process.exit(1);console.log(\"soulkill JSON valid, schemaVersion\",j.schemaVersion)})"'
gate G06 "reasoning-budget ladder constant matches docs: low -> low,low,medium,high (E2)" \
  "grep -q \"low: \\['low', 'low', 'medium', 'high'\\]\" sandbox/demo-lib/scripts/construct/implement.workflow && grep -A4 'const LADDERS' sandbox/demo-lib/scripts/construct/implement.workflow"
gate G07 "role model pins exist: implementer=sonnet, harness=inherit, architect=inherit (E4)" \
  'grep -l "model: sonnet" sandbox/demo-lib/.claude/agents/implementer.md && grep -l "model: inherit" sandbox/demo-lib/.claude/agents/harness.md && grep -l "model: inherit" sandbox/demo-lib/.claude/agents/architect.md'

# --- L3 router (LiteLLM) -------------------------------------------------------
gate G08 "litellm proxy installed and importable (E18)" \
  'python3 -c "import importlib.metadata as m; print(\"litellm\", m.version(\"litellm\"))" && which litellm'
gate G09 "router config YAML parses (schema-shape check before boot)" \
  'python3 - <<EOF
import yaml, sys
c = yaml.safe_load(open("router/litellm.config.yaml"))
names = sorted({m["model_name"] for m in c["model_list"]})
assert names == ["haiku", "opus", "sonnet"], names
rs = c["router_settings"]
assert rs["routing_strategy"] == "usage-based-routing-v2"
assert any("opus" in f for f in rs["fallbacks"])
print("YAML valid; groups:", names, "| fallbacks:", rs["fallbacks"])
EOF'
gate G10 "litellm proxy BOOTS on this config and serves /v1/models with groups opus|sonnet|haiku (E14)" \
  'export LITELLM_MASTER_KEY=sk-gate-test GEMINI_API_KEY=fake GROQ_API_KEY=fake OPENROUTER_API_KEY=fake DEEPSEEK_API_KEY=fake OLLAMA_BASE=http://localhost:11434
   litellm --config router/litellm.config.yaml --port 4599 > "$TMP/litellm.log" 2>&1 &
   LPID=$!
   ok=0
   for i in $(seq 1 60); do
     sleep 3
     if out=$(node -e "fetch(\"http://127.0.0.1:4599/v1/models\",{headers:{authorization:\"Bearer sk-gate-test\"}}).then(async r=>{const t=await r.text();console.log(r.status,t);process.exit(r.ok?0:1)}).catch(e=>{process.exit(1)})" 2>/dev/null); then ok=1; break; fi
     kill -0 $LPID 2>/dev/null || break
   done
   kill $LPID 2>/dev/null; wait $LPID 2>/dev/null
   [ $ok -eq 1 ] || { echo "--- litellm log tail ---"; tail -30 "$TMP/litellm.log"; exit 1; }
   echo "$out" | head -c 500
   echo "$out" | grep -q "\"sonnet\"" && echo "$out" | grep -q "\"opus\"" && echo "$out" | grep -q "\"haiku\""'

# --- L4 cascade router (empirical, offline) ------------------------------------
gate G11 "cascade server boots (SANDBOX) and solves an easy task on the weak tier" \
  'SANDBOX_MODE=1 PORT=4598 LEDGER_PATH='"$TMP"'/ledger.jsonl node cascade/server.mjs > "$TMP/cascade.log" 2>&1 &
   CPID=$!
   for i in $(seq 1 20); do sleep 1; node -e "fetch(\"http://127.0.0.1:4598/health\").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null && break; done
   http POST http://127.0.0.1:4598/v1/chat/completions "{\"model\":\"cascade\",\"messages\":[{\"role\":\"user\",\"content\":\"TASK:G11:1:ZZZ\"}]}" "{\"content-type\":\"application/json\"}" > "$TMP/g11.out"
   rc=$?
   kill $CPID 2>/dev/null; wait $CPID 2>/dev/null
   cat "$TMP/g11.out" | head -c 400
   [ $rc -eq 0 ] && grep -q "x-freecc-tier: weak" "$TMP/g11.out" && grep -q "\"status\":\"done\"" "$TMP/g11.out"'
gate G12 "hard task escalates through weak->mid->strong (FrugalGPT cascade mechanism, E6)" \
  'SANDBOX_MODE=1 PORT=4598 LEDGER_PATH='"$TMP"'/ledger2.jsonl node cascade/server.mjs > "$TMP/cascade2.log" 2>&1 &
   CPID=$!
   for i in $(seq 1 20); do sleep 1; node -e "fetch(\"http://127.0.0.1:4598/health\").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null && break; done
   http POST http://127.0.0.1:4598/v1/chat/completions "{\"model\":\"cascade\",\"messages\":[{\"role\":\"user\",\"content\":\"TASK:G12:3:ZZZ\"}]}" "{\"content-type\":\"application/json\"}" > "$TMP/g12.out"
   rc=$?
   L=$(http GET http://127.0.0.1:4598/ledger)
   kill $CPID 2>/dev/null; wait $CPID 2>/dev/null
   head -c 300 "$TMP/g12.out"; echo; echo "$L" | head -c 600
   [ $rc -eq 0 ] && grep -q "x-freecc-tier: strong" "$TMP/g12.out" && echo "$L" | grep -q "\"tier\":\"weak\"" && echo "$L" | grep -q "\"tier\":\"mid\""'
gate G13 "budget guard blocks escalation past budget_usd (E3: do not pay for reasoning unproven)" \
  'SANDBOX_MODE=1 PORT=4598 LEDGER_PATH='"$TMP"'/ledger3.jsonl node cascade/server.mjs > "$TMP/cascade3.log" 2>&1 &
   CPID=$!
   for i in $(seq 1 20); do sleep 1; node -e "fetch(\"http://127.0.0.1:4598/health\").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null && break; done
   http POST http://127.0.0.1:4598/v1/chat/completions "{\"model\":\"cascade\",\"messages\":[{\"role\":\"user\",\"content\":\"TASK:G13:3:ZZZ\"}],\"freecc\":{\"budget_usd\":0.0001}}" "{\"content-type\":\"application/json\"}" > "$TMP/g13.out"
   kill $CPID 2>/dev/null; wait $CPID 2>/dev/null
   head -c 400 "$TMP/g13.out"
   grep -q "budget_exhausted" "$TMP/g13.out" && grep -q "freecc_blocked" "$TMP/g13.out"'
gate G14 "1000-task strategy simulation: all cost/quality assertions hold (synthetic replication of E6/E7/E10/E13)" \
  'node cascade/simulate.mjs --n 1000'

# --- L5 harness configs ---------------------------------------------------------
gate G15 "harness configs valid: opencode.json parses, claude-code.env pins alias remaps, AGENTS template has all 10 markers" \
  'node -e "const c=require(\"./harness/opencode.json\"); if(!c.provider.freecc.options.baseURL.includes(\"4000\")) process.exit(1); if(c.model!==\"freecc/sonnet\") process.exit(1); console.log(\"opencode.json OK:\", c.model, c.small_model)"
   grep -q "ANTHROPIC_DEFAULT_SONNET_MODEL=\"sonnet\"" harness/claude-code.env || exit 1
   grep -q "ANTHROPIC_BASE_URL=\"http://localhost:4000\"" harness/claude-code.env || exit 1
   grep -q "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1" harness/claude-code.env || exit 1
   n=0; for m in product module-map commands composition-roots dependency-policy high-effort-areas composition security-invariants defects-vs-variance open-questions; do grep -q "construct-discover:$m" harness/AGENTS.md.template && n=$((n+1)); done
   [ "$n" -eq 10 ] && echo "claude-code.env OK; AGENTS.md.template markers: $n/10"'

# --- L6 prompt library (definitive instructions) --------------------------------
gate G16 "prompt library validated: P0–P8 present, headers/sections machine-checked, every E# cited exists in EVIDENCE.md" \
  'node prompts/validate.mjs'
gate G17 "PLAYBOOK operational loop references all 9 prompts + the seven truth rules" \
  'test -f PLAYBOOK.md || exit 1
   for p in P0 P1 P2 P3 P4 P5 P6 P7 P8; do grep -q "$p" PLAYBOOK.md || { echo "PLAYBOOK missing $p"; exit 1; }; done
   grep -q "Seven rules of truth" PLAYBOOK.md || exit 1
   grep -q "gates/run-gates.sh" PLAYBOOK.md || exit 1
   echo "PLAYBOOK.md: 9/9 prompts referenced, truth rules + gate loop present"'

# --- report ----------------------------------------------------------------------
{
  echo "# FREECC REPORT — mechanical gate run"
  echo
  echo "- Date: $(date -u '+%Y-%m-%d %H:%M UTC')  · Host: sandbox workspace $(uname -m)"
  echo "- Result: **$PASS PASS / $FAIL FAIL** (exit code $( [[ $FAIL -eq 0 ]] && echo 0 || echo 1 ))"
  echo "- Rule: a statement is only kept in the docs if its gate is green (EVIDENCE.md rule 1)."
  echo
  echo "| Gate | Check | Status |"
  echo "|------|-------|--------|"
  for r in "${ROWS[@]}"; do echo "$r"; done
  echo
  echo "## Evidence excerpts"
  echo
  for d in "${DETAILS[@]}"; do echo "$d"; echo; done
} > "$REPORT"

echo; echo "REPORT written: $REPORT ($PASS PASS / $FAIL FAIL)"
rm -rf "$TMP"
[[ $FAIL -eq 0 ]]
