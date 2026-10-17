# SETUP — from nothing to a working free-LLM stack

Piece by piece. Each step says **what to run** and **what you should see** before you move on.
Do them in order. Do not skip Part 3 — it is where most setups break.

---

## First: two different things

| | What it is | What it needs |
|---|---|---|
| **The app** — `ui/` | The console: wizard, dependency cloud, issue ranking, ledgers, gate report. | **Nothing.** No keys, no install, no internet. Double-click `ui/index.html`. |
| **The free-LLM routing** — `router/` + `harness/` | The thing that makes an agent (Claude Code / OpenCode) run on free model quotas. | 4 free API keys, one `.env` file, and 3 model names fixed. |

So: the app already works. Parts 1–7 make the *routing* work.

---

## Part 1 — Install the tools

Open **PowerShell** and run each check. You only need the ones that fail.

### 1.1 Node.js 20 or newer — required

```powershell
node -v          # need v20.x or higher
npm -v
```

If missing: download the **LTS** installer from https://nodejs.org and re-open PowerShell.

### 1.2 Git for Windows — required on Windows

```powershell
git --version
```

Download: https://git-scm.com/download/win

> **Important:** the repo's scripts (`router/start.sh`, `gates/run-gates.sh`) are *bash*.
> On Windows you run them from **Git Bash** (Start menu → "Git Bash"), not PowerShell.
> Git for Windows also gives you a `curl` that does not have PowerShell's TLS problems.

### 1.3 Python 3.10+ — required (for LiteLLM)

```powershell
python --version
```

Download: https://www.python.org/downloads/ — tick **"Add python.exe to PATH"** during install.

### 1.4 LiteLLM proxy — required

```powershell
pip install "litellm[proxy]"
litellm --version
```

### 1.5 Ollama — optional, local and completely free

Only if you want a zero-quota last resort that works offline.

```powershell
ollama --version
ollama pull qwen2.5-coder:7b      # ~4.7 GB
ollama pull qwen2.5-coder:1.5b    # ~1 GB
```

If missing: https://ollama.com/download

### 1.6 Claude Code — optional, this is the agent

```powershell
npm install -g @anthropic-ai/claude-code
claude --version
```

Alternative agent (also free): OpenCode — https://opencode.ai

---

## Part 2 — Get the free API keys

You need **at least two** providers. Four is better: that is what "quota pooling" means —
when one provider says 429, the next one answers.

Get each key, paste it into Notepad as you go. Do not lose them.

### 2.1 Google Gemini (free tier) — recommended

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account.
3. Click **Create API key** → choose a project (or create one).
4. Copy the key. It looks like `AIza...`

Then check your real limits (they differ per account):
https://aistudio.google.com/rate-limit

### 2.2 Groq (free tier) — recommended, very fast

1. Go to https://console.groq.com/keys
2. Sign up / sign in.
3. **Create API Key** → name it `freecc` → copy. It looks like `gsk_...`
4. Limits: https://console.groq.com/docs/rate-limits

### 2.3 OpenRouter (free `:free` models) — recommended

1. Go to https://openrouter.ai/keys
2. Sign up / sign in.
3. **Create Key** → copy. It looks like `sk-or-v1-...`
4. Free rule: **50 free requests/day** while your lifetime top-up is under $10;
   **1000/day** after that. Source: https://openrouter.ai/docs/faq

### 2.4 DeepSeek (NOT free — about $0.15 per million tokens) — optional but useful

This is the "never stall" anchor: cheap enough to be boring, strong enough to finish.
Without it, a hard task can end with "all free quotas exhausted".

1. Go to https://platform.deepseek.com/api_keys
2. Add a small credit ($2 is plenty) → **Create API key** → copy.

### 2.5 Ollama — no key at all

Local models need no key. Nothing to do here beyond Part 1.5.

**What you now have:** 2–4 keys, saved in Notepad.

---

## Part 3 — Create `router/.env` and fix the model names ⚠️ the step that matters

### 3.1 Make the file

In PowerShell, from the project folder:

```powershell
cd C:\path\to\freecc
Copy-Item router\.env.example router\.env
notepad router\.env
```

`router/.env` is already listed in `.gitignore`, so your keys will never be committed. Leave it that way.

### 3.2 Generate a master key

Pick any long random string. To generate one:

```powershell
python -c "import secrets; print('sk-' + secrets.token_hex(24))"
```

Paste the result as `LITELLM_MASTER_KEY`. This is the password your agent uses to talk to the
router — it is **not** a provider key and costs nothing.

### 3.3 Fill the keys

In `router/.env`, put each key after its `=` with **no spaces and no quotes**:

```ini
LITELLM_MASTER_KEY=sk-4f9c...your generated string...
GEMINI_API_KEY=AIza...your Gemini key...
GROQ_API_KEY=gsk_...your Groq key...
OPENROUTER_API_KEY=sk-or-v1-...your OpenRouter key...
DEEPSEEK_API_KEY=sk-...your DeepSeek key...        # optional
OLLAMA_BASE=http://localhost:11434
```

Save and close.

### 3.4 Fix the model names — read this before starting anything

The values shipped in `router/.env.example` and `router/litellm.config.yaml`
(`gemini-3-pro`, `gemini-3.8-flash`, `gemini-3.8-flash-lite`) are **placeholders that must be
verified**. Provider model names change, and a wrong name is the #1 cause of
`model not found` / `BadRequest` errors.

Print the models your account can actually use, one provider at a time.

**Gemini** (in Git Bash):

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
  | grep '"name"' | head -40
```

You are looking for names like `models/gemini-2.0-flash`. In `litellm.config.yaml` the value goes
**without** the `models/` prefix: `gemini/gemini-2.0-flash`.

**Groq:**

```bash
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | grep '"id"'
```

**OpenRouter** (free ones only):

```bash
curl -s https://openrouter.ai/api/v1/models \
  | python -c "import json,sys; [print(m['id']) for m in json.load(sys.stdin)['data'] if m['id'].endswith(':free')]" | head -30
```

**DeepSeek:**

```bash
curl -s https://api.deepseek.com/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"
```

Now open `router/litellm.config.yaml` and replace every `model:` line with a name you just saw.
Keep the three `model_name:` values (`opus`, `sonnet`, `haiku`) exactly as they are — the whole
stack refers to those three names.

> Tip: if a provider gave you nothing usable, delete its 3–4 line block from the config. An empty
> group is better than a broken one, as long as each group keeps at least one working model.

---

## Part 4 — Start the router and prove it

Open **Git Bash** in the project folder.

```bash
cd /c/path/to/freecc
bash router/start.sh
```

Expected output ends with something like `Uvicorn running on http://0.0.0.0:4000`.

Leave that window open. In a **second** Git Bash window:

```bash
source router/.env
curl -s http://localhost:4000/v1/models -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

**You should see** JSON listing `opus`, `sonnet`, `haiku`. That single check passing means:
file found → keys loaded → config parsed → proxy alive.

If you see an error instead, jump to Part 11.

---

## Part 5 — Test each of the three tiers

Still in the second window. Each command must return a real answer.

```bash
# sonnet = the everyday workhorse tier
curl -s http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H "content-type: application/json" \
  -d '{"model":"sonnet","messages":[{"role":"user","content":"reply with exactly: OK"}]}'
```

Then swap `"sonnet"` for `"haiku"`, and again for `"opus"`.

**You should see:** a `choices` array with a message. `OK` is enough.

If `sonnet` works but `opus` fails, an `opus` model name is still wrong — go back to Part 3.4.
That is normal and expected on the first run.

---

## Part 6 — Connect your agent

### Option A — Claude Code (uses the router instead of Anthropic)

```bash
bash harness/run-claude-code.sh
```

It loads `router/.env`, then `harness/claude-code.env`, then starts `claude` pointed at
`http://localhost:4000` with the aliases remapped onto your free tiers.

Inside Claude Code, run:

```
/status
/model
```

**You should see** `opus`, `sonnet`, `haiku` listed as coming from the gateway. Pick `sonnet` for
everyday work; switch to `opus` only for planning and architecture.

### Option B — OpenCode (fully free, open source)

```bash
cp harness/opencode.json /path/to/your-project/opencode.json
cd /path/to/your-project
opencode
```

It is preconfigured for provider `freecc` → `http://localhost:4000/v1`, model `freecc/sonnet`.
`apiKey` reads the `LITELLM_MASTER_KEY` environment variable, so export it first:

```bash
export LITELLM_MASTER_KEY=...your master key...
```

---

## Part 7 — Optional: the quality-gated cascade

Two modes. Start in sandbox mode — it needs **no keys at all** and proves the mechanism.

```bash
# sandbox: deterministic fake tiers, zero network
node cascade/server.mjs
```

Second window:

```bash
curl -s http://localhost:4597/health
curl -s http://localhost:4597/ledger
```

Live mode — point the tiers at your LiteLLM groups:

```bash
cd /c/path/to/freecc
source router/.env
SANDBOX_MODE=0 \
FREECC_TIER_LOW_URL=http://localhost:4000/v1  FREECC_TIER_LOW_MODEL=haiku   FREECC_TIER_LOW_KEY=$LITELLM_MASTER_KEY \
FREECC_TIER_MID_URL=http://localhost:4000/v1  FREECC_TIER_MID_MODEL=sonnet  FREECC_TIER_MID_KEY=$LITELLM_MASTER_KEY \
FREECC_TIER_STRONG_URL=http://localhost:4000/v1 FREECC_TIER_STRONG_MODEL=opus FREECC_TIER_STRONG_KEY=$LITELLM_MASTER_KEY \
node cascade/server.mjs
```

The cascade tries `haiku` first, checks the answer, and only pays for `sonnet`/`opus` when the
check fails — with a hard `budget_usd` stop.

---

## Part 8 — Optional: make a real project safe for weak models

```bash
cd /path/to/your-project
npx mikoshi-construct init --dry-run     # look first — changes nothing
npx mikoshi-construct init               # then for real
npx mikoshi-construct doctor             # mechanical health check
```

Then, inside Claude Code, run `/construct-discover` once to fill the ten memory markers.

---

## Part 9 — The app

```powershell
# simplest: just open it
start ui\index.html
```

```powershell
# or serve it like the deployed site
cd ui
npm start                # http://127.0.0.1:8080
```

It needs no keys and no router. Everything it displays is in `ui/assets/data.js`.

To publish it: push to `main` and `.github/workflows/pages.yml` deploys `ui/` to GitHub Pages.

---

## Part 10 — Prove the whole thing

From **Git Bash** in the project root:

```bash
bash gates/run-gates.sh
```

It writes `REPORT.md` and exits `0` only if every gate passes. Gates about LiteLLM and
`mikoshi-construct` need Parts 1.4 and 8 done first; that is expected.

```bash
node cascade/simulate.mjs --n 1000      # strategy simulation, no keys needed
```

---

## Part 11 — When something breaks

| Symptom | Cause | Fix |
|---|---|---|
| `WARN: router/.env missing` | wrong folder or wrong filename | file must be exactly `freecc/router/.env` |
| `401 Unauthorized` from the router | wrong `LITELLM_MASTER_KEY` | the `Authorization: Bearer` value must equal it exactly, no quotes in `.env` |
| `model not found` / `BadRequest` | placeholder or outdated model name | redo Part 3.4 for that provider |
| `429 Too Many Requests` | free quota spent for the minute/day | that is normal — a second provider should answer (Part 2); daily limits reset at midnight PT for Gemini |
| `APIConnectionError` to Ollama | Ollama not running | `ollama serve` in its own window |
| `router/start.sh: No such file` | ran from PowerShell | use **Git Bash**, or run `litellm --config router/litellm.config.yaml --port 4000` |
| `Address already in use` on 4000 | old router still running | close the other window, or `PORT=4001 bash router/start.sh` |
| Keys work, agent still hits api.anthropic.com | env not sourced | use `harness/run-claude-code.sh`, do not start `claude` directly |
| PowerShell TLS / certificate errors on `curl` | PowerShell's network stack | use **Git Bash** for `curl` commands |

---

## Part 12 — Keep it working

Free tiers move. This is not a one-time setup.

**Weekly:** run `node cascade/simulate.mjs --n 1000`, look at indexes `I1`–`I3` in the app, change
**one** knob (a quota, a model, a cooldown), write down the prediction, re-run the gates.

**Monthly, or when a tier stops answering:** re-check the model IDs and quotas (Part 3.4) and
update `router/litellm.config.yaml` + `router/.env`. Google especially has been reducing free
quotas over time.

---

## Final checklist

| # | Step | Done means |
|---|---|---|
| 1 | Node 20+, Git, Python installed | `node -v`, `git --version`, `python --version` all print |
| 2 | LiteLLM installed | `litellm --version` prints |
| 3 | 2+ provider keys obtained | keys saved somewhere safe |
| 4 | `router/.env` created and filled | no spaces/quotes; master key generated |
| 5 | Model names verified and fixed | all three groups point at names you listed yourself |
| 6 | Router starts | `Uvicorn running on http://0.0.0.0:4000` |
| 7 | `/v1/models` lists opus, sonnet, haiku | JSON with your three groups |
| 8 | One real completion per group | `choices` array with an answer |
| 9 | Agent connected | `/model` shows the gateway aliases |
| 10 | App opens | `ui/index.html` shows the dependency cloud |
| 11 | Gates pass | `bash gates/run-gates.sh` exits 0 |

Steps 1–8 are the free-LLM routing. Steps 9–11 are the agent and the proof.
