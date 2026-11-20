# Runs the ML service on :8001.
# Train on real data first:  .\scripts\run_ml.ps1 --train <unsw|cicids> <csv-file-or-dir>... [--sample N]
#   e.g. .\scripts\run_ml.ps1 --train unsw data\raw\UNSW_NB15_training-set.csv data\raw\UNSW_NB15_testing-set.csv
# (paths relative to ml_service\). Without --train, serves existing models\.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\ml_service")
$py = if ($env:PYTHON) { $env:PYTHON } elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "py" }
$vpy = "venv\Scripts\python.exe"

function Run { & $args[0] $args[1..($args.Count - 1)]; if ($LASTEXITCODE) { exit $LASTEXITCODE } }

if (-not (Test-Path venv)) {
  Run $py -m venv venv
  Run $vpy -m pip install -r requirements.txt
}
if ($args.Count -gt 0 -and $args[0] -eq "--train") {
  $env:PYTHON = (Resolve-Path $vpy).Path
  $rest = @($args | Select-Object -Skip 1)
  Run powershell -NoProfile -ExecutionPolicy Bypass -File scripts\train_real.ps1 @rest
}
Run $vpy -m uvicorn main:app --reload --port 8001
