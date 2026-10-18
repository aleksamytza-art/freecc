# FREECC router start — Windows (PowerShell) equivalent of router/start.sh
#
#   .\router\start.ps1
#   $env:PORT=4001; .\router\start.ps1
#
# Why this exists: the bash script needs Git Bash. This does the same thing in
# plain PowerShell, and it sets PYTHONIOENCODING, without which LiteLLM crashes
# on a Windows console with:
#   UnicodeEncodeError: 'charmap' codec can't encode characters ...
# (its startup banner contains box-drawing characters).

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# LiteLLM prints UTF-8 art; force UTF-8 so the banner cannot kill startup.
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUTF8 = '1'

# --- load router/.env -------------------------------------------------------
$envFile = Join-Path $here '.env'
if (Test-Path $envFile) {
    $loaded = 0
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
            $i = $line.IndexOf('=')
            $name = $line.Substring(0, $i).Trim()
            $value = $line.Substring($i + 1).Trim()
            if ($value) {
                Set-Item -Path "env:$name" -Value $value
                $loaded++
            }
        }
    }
    Write-Host "[freecc] loaded $loaded values from router/.env" -ForegroundColor Cyan
} else {
    Write-Host "[freecc] WARN: router/.env missing - copy .env.example and fill the keys" -ForegroundColor Yellow
}

if (-not $env:LITELLM_MASTER_KEY) {
    $env:LITELLM_MASTER_KEY = 'sk-freecc-change-me'
    Write-Host "[freecc] WARN: LITELLM_MASTER_KEY not set - using the insecure default" -ForegroundColor Yellow
}
if (-not $env:OLLAMA_BASE) { $env:OLLAMA_BASE = 'http://localhost:11434' }
$port = if ($env:PORT) { $env:PORT } else { '4000' }

# --- find litellm -----------------------------------------------------------
# 1. $env:FREECC_LITELLM  2. a .litellm-env next to the repo  3. PATH
$litellm = $null
if ($env:FREECC_LITELLM -and (Test-Path $env:FREECC_LITELLM)) {
    $litellm = $env:FREECC_LITELLM
}
if (-not $litellm) {
    $sibling = Join-Path (Split-Path -Parent (Split-Path -Parent $here)) '.litellm-env\Scripts\litellm.exe'
    if (Test-Path $sibling) { $litellm = $sibling }
}
if (-not $litellm) {
    $cmd = Get-Command litellm -ErrorAction SilentlyContinue
    if ($cmd) { $litellm = $cmd.Source }
}
if (-not $litellm) {
    Write-Host "[freecc] litellm not found. Install it:" -ForegroundColor Red
    Write-Host "    pip install `"litellm[proxy]`"" -ForegroundColor Yellow
    Write-Host "  or point FREECC_LITELLM at the executable." -ForegroundColor Yellow
    exit 1
}

$config = Join-Path $here 'litellm.config.yaml'
Write-Host "[freecc] starting LiteLLM on :$port  (config: $config)" -ForegroundColor Cyan
Write-Host "[freecc] litellm: $litellm" -ForegroundColor DarkGray
& $litellm --config $config --port $port --host 127.0.0.1
