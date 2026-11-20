# Replays simulated cyber attacks into a running Sentinel (backend :8000 + ML :8001).
#   .\scripts\run_simulation.ps1                      # every attack type once
#   .\scripts\run_simulation.ps1 phishing campaign    # chosen scenarios
#   .\scripts\run_simulation.ps1 --list               # show scenarios
#   .\scripts\run_simulation.ps1 --loop               # keep going until Ctrl-C (live demo)
# Any other flag is passed to backend\scripts\simulate_attacks.py (--delay, --repeat, --no-noise, --dry-run ...).
# Needs the seeded analyst account. See docs\ATTACK_SIMULATION.md.
# Env overrides: PYTHON, BACKEND_URL, ML_URL.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$py = if ($env:PYTHON) { $env:PYTHON } elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "py" }  # the simulator is stdlib-only, any Python works
$sim = "backend\scripts\simulate_attacks.py"
$backend = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "http://localhost:8000" }
$ml = if ($env:ML_URL) { $env:ML_URL } else { "http://localhost:8001" }

$loop = $args -contains "--loop"
$rest = @($args | Where-Object { $_ -ne "--loop" })
if ($rest.Count -eq 0) { $rest = @("all") }

# --list and --dry-run need no running services
if ($rest -contains "--list" -or $rest -contains "--dry-run") { & $py $sim @rest; exit $LASTEXITCODE }

function Up($url) { try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null; $true } catch { $false } }
if (-not (Up "$backend/health")) { [Console]::Error.WriteLine("Backend is not reachable at $backend. Start it with: .\scripts\run_backend.ps1 --seed"); exit 1 }
if (-not (Up "$ml/health")) { [Console]::Error.WriteLine("Warning: ML service is not reachable at $ml. Events will be stored but not scored (start .\scripts\run_ml.ps1).") }

function Run { & $py $sim --url $backend @rest; if ($LASTEXITCODE) { exit $LASTEXITCODE } }
if ($loop) {
  Write-Host "Looping. Press Ctrl-C to stop."
  while ($true) { Run; Start-Sleep -Seconds 5 }
} else {
  Run
}
