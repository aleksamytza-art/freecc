/* =============================================================================
   Provider + search roster — ported from free-research-llm
   (https://github.com/bezgolovyponch/free-research-llm, MIT, commit d5ca596)
   src/llm/presets.mjs.

   Adapted for FREECC: the role split (deep / fast / reviewer) mirrors
   router/litellm.config.yaml's opus / sonnet / haiku groups, and `verified`
   records whether this machine actually reached the provider and got content
   back (2026-10-17), as opposed to the source repo merely documenting it.

   One capability worth stealing outright: model ids are NOT hard-coded.
   Each provider's /models list is read at start and the best match from
   `preferFast` / `preferDeep` is picked — which is why renamed free models keep
   working there, and why the hard-coded ids in router/.env.example broke here.
   ============================================================================= */

const PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    tier: "free",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyEnv: "GEMINI_API_KEY",
    signup: "https://aistudio.google.com/apikey",
    verified: true,
    note: "Free tier. Flash family answers; every Pro model returns 429 on a free key.",
    preferFast: ["gemini-3.8-flash-lite", "gemini-3.5-flash-lite", "flash-lite"],
    preferDeep: ["gemini-3.8-flash", "gemini-3.5-flash", "flash"],
    roles: ["deep", "fast"],
  },
  {
    id: "groq",
    label: "Groq",
    tier: "free",
    baseURL: "https://api.groq.com/openai/v1",
    keyEnv: "GROQ_API_KEY",
    signup: "https://console.groq.com/keys",
    verified: true,
    note: "Free tier. Fastest of the set (0.2-0.6s). No llama models any more; gpt-oss only.",
    preferFast: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"],
    preferDeep: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"],
    roles: ["fast", "deep"],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    tier: "free",
    baseURL: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
    signup: "https://openrouter.ai/settings/keys",
    verified: true,
    note: "Only `:free` models. 50 requests/day under $10 lifetime credit. Free tier is flaky under load.",
    preferFast: ["cohere/north-mini-code:free", "liquid/lfm-2.5-2.6b:free"],
    preferDeep: ["nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free"],
    roles: ["deep", "fast"],
    freeOnly: true,
  },
  {
    id: "cerebras",
    label: "Cerebras",
    tier: "free",
    baseURL: "https://api.cerebras.ai/v1",
    keyEnv: "CEREBRAS_API_KEY",
    signup: "https://cloud.cerebras.ai",
    verified: false,
    note: "Documented free tier in the source repo; not exercised here.",
    preferFast: ["gpt-oss-120b", "qwen-3.8-27b"],
    preferDeep: ["gpt-oss-120b", "qwen-3.8-27b"],
    roles: ["deep", "fast"],
  },
  {
    id: "mistral",
    label: "Mistral",
    tier: "free",
    baseURL: "https://api.mistral.ai/v1",
    keyEnv: "MISTRAL_API_KEY",
    signup: "https://console.mistral.ai/api-keys",
    verified: false,
    note: "Free Experiment plan.",
    preferFast: ["mistral-small-latest"],
    preferDeep: ["mistral-large-latest", "mistral-medium-latest"],
    roles: ["deep", "fast"],
  },
  {
    id: "nvidia",
    label: "NVIDIA build.nvidia.com",
    tier: "free",
    baseURL: "https://integrate.api.nvidia.com/v1",
    keyEnv: "NVIDIA_API_KEY",
    signup: "https://build.nvidia.com",
    verified: false,
    note: "Free prototyping credits.",
    preferFast: ["openai/gpt-oss-20b", "meta/llama-3.3-70b-instruct"],
    preferDeep: ["openai/gpt-oss-120b", "deepseek-ai/deepseek-v3"],
    roles: ["deep", "fast"],
  },
  {
    id: "sambanova",
    label: "SambaNova Cloud",
    tier: "free",
    baseURL: "https://api.sambanova.ai/v1",
    keyEnv: "SAMBANOVA_API_KEY",
    signup: "https://cloud.sambanova.ai/apis",
    verified: false,
    note: "Free tier ~20 requests/day.",
    preferFast: ["gpt-oss-120b", "Meta-Llama-3.3-70B-Instruct"],
    preferDeep: ["DeepSeek-V3.2", "gpt-oss-120b"],
    roles: ["deep", "fast"],
  },
  {
    id: "cloudflare",
    label: "Cloudflare Workers AI",
    tier: "free",
    baseURL: "https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1",
    keyEnv: "CLOUDFLARE_API_TOKEN",
    signup: "https://dash.cloudflare.com/profile/api-tokens",
    verified: false,
    note: "10k neurons/day free. Needs an account id as well as a token.",
    preferFast: ["@cf/meta/llama-3.1-8b-instruct"],
    preferDeep: ["@cf/openai/gpt-oss-120b"],
    roles: ["deep", "fast"],
  },
  {
    id: "cohere",
    label: "Cohere",
    tier: "free",
    baseURL: "https://api.cohere.ai/compatibility/v1",
    keyEnv: "COHERE_API_KEY",
    signup: "https://dashboard.cohere.com/api-keys",
    verified: false,
    note: "Trial key, 1,000 calls/month.",
    preferFast: ["command-a"],
    preferDeep: ["command-a"],
    roles: ["deep", "fast"],
  },
  {
    id: "puter",
    label: "Puter",
    tier: "free",
    baseURL: "https://api.puter.com/puterai/openai/v1",
    keyEnv: "PUTER_AUTH_TOKEN",
    signup: "https://puter.com/dashboard#account",
    verified: false,
    note: "Uses your Puter account allowance.",
    preferFast: ["gemini-3.5-flash-lite", "gpt-5.4-nano"],
    preferDeep: ["gemini-3.5-flash-lite", "gpt-5.4-nano"],
    roles: ["deep", "fast"],
  },
  {
    id: "pollinations",
    label: "Pollinations",
    tier: "free",
    baseURL: "https://text.pollinations.ai/openai",
    keyEnv: null,
    signup: "https://auth.pollinations.ai",
    verified: false,
    note: "No key at all. Rate-limited to one call every ~31s.",
    preferFast: ["openai-fast", "openai"],
    preferDeep: ["openai-fast", "openai"],
    roles: ["deep", "fast"],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    tier: "local",
    baseURL: "http://localhost:11434/v1",
    keyEnv: null,
    signup: "https://ollama.com/download",
    verified: false,
    note: "Zero quota, zero cost, works offline. Needs `ollama pull` first.",
    preferFast: ["qwen2.5:3b", "llama3.2:3b"],
    preferDeep: ["qwen2.5:7b", "llama3.1:8b"],
    roles: ["deep", "fast"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    tier: "paid",
    baseURL: "https://api.deepseek.com/v1",
    keyEnv: "DEEPSEEK_API_KEY",
    signup: "https://platform.deepseek.com/api_keys",
    verified: false,
    note: "Near-free paid anchor (~$0.15/M). Use only as a never-stall last resort.",
    preferFast: ["deepseek-chat"],
    preferDeep: ["deepseek-reasoner", "deepseek-chat"],
    roles: ["deep", "fast"],
  },
];

/* Which provider is tried first for each role. The reviewer role is never the
   same provider that produced the answer — the verifier is not the doer. */
const ROUTE_ORDER = {
  deep: ["gemini", "mistral", "cerebras", "groq", "nvidia", "sambanova", "openrouter", "cloudflare", "cohere", "puter", "pollinations", "ollama", "deepseek"],
  fast: ["groq", "gemini", "mistral", "nvidia", "cerebras", "openrouter", "cloudflare", "sambanova", "cohere", "puter", "pollinations", "ollama", "deepseek"],
  reviewer: ["groq", "gemini", "cerebras", "mistral", "nvidia", "openrouter", "cloudflare", "sambanova", "cohere"],
};

const SEARCH = [
  { env: "LANGSEARCH_API_KEY", label: "LangSearch", note: "free, no monthly cap, full page text", signup: "https://langsearch.com/api-keys" },
  { env: "TAVILY_API_KEY", label: "Tavily", note: "1,000 credits/month free", signup: "https://app.tavily.com" },
  { env: "EXA_API_KEY", label: "Exa", note: "$10/month free credit", signup: "https://dashboard.exa.ai/api-keys" },
  { env: "LINKUP_API_KEY", label: "Linkup", note: "€5 free", signup: "https://app.linkup.so" },
  { env: "JINA_API_KEY", label: "Jina", note: "search + reader, ~1,000 searches", signup: "https://jina.ai/api-dashboard" },
  { env: "FIRECRAWL_API_KEY", label: "Firecrawl", note: "free monthly credits", signup: "https://www.firecrawl.dev/app/api-keys" },
  { env: "SERPER_API_KEY", label: "Serper", note: "2,500 free queries once", signup: "https://serper.dev/api-key" },
  { env: "BRAVE_API_KEY", label: "Brave", note: "$5/month credit, card required", signup: "https://api-dashboard.search.brave.com" },
  { env: "SEARXNG_URL", label: "SearXNG", note: "local Docker, unlimited", signup: "http://127.0.0.1:8888" },
];

/* Model lists contain embeddings, TTS, image and guard models. Asking a chat
   endpoint for one of those wastes a request and looks like a router bug. */
const NON_CHAT_MODEL = "embed|whisper|tts|audio|image|vision-only|guard|moderation|rerank|transcribe|aqa|imagen|veo|lyria|native-audio|computer-use|robotics|orpheus|playai|compound|ocr|reward|parakeet|retriever|nemoguard|safety|clip|kosmos|deplot|paligemma|vila|neva|flux|stable-diffusion|bge-|m2m|translate";
