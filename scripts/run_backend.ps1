# Runs migrations then the FastAPI backend on :8000. Add --seed to seed demo users.
# Usage: .\scripts\run_backend.ps1 [--seed]
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\backend")
$py = if ($env:PYTHON) { $env:PYTHON } elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "py" }
$vpy = "venv\Scripts\python.exe"

function Run { & $args[0] $args[1..($args.Count - 1)]; if ($LASTEXITCODE) { exit $LASTEXITCODE } }

if (-not (Test-Path venv)) {
  Run $py -m venv venv
  Run $vpy -m pip install -r requirements.txt
}
Run $vpy -m alembic upgrade head
if ($args -contains "--seed") { Run $vpy scripts/seed_data.py }
Run $vpy -m uvicorn app.main:app --reload --port 8000
