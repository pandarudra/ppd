# Usage: .\scripts\train_real.ps1 <unsw|cicids> <csv-file-or-dir>... [--sample N]
# Example: .\scripts\train_real.ps1 unsw data\raw\UNSW_NB15_training-set.csv data\raw\UNSW_NB15_testing-set.csv
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if ($args.Count -lt 2) { Get-Content $PSCommandPath -TotalCount 3 | Select-Object -Skip 1; exit 1 }
$py = if ($env:PYTHON) { $env:PYTHON } elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "py" }

& $py training/prepare_real_dataset.py @args
if ($LASTEXITCODE) { exit $LASTEXITCODE }
& $py training/train.py --data data/prepared.csv
exit $LASTEXITCODE
