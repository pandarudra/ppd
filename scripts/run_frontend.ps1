# Runs the Vite dev server on :5173.
# Usage: .\scripts\run_frontend.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\frontend")
if (-not (Test-Path node_modules)) { npm install; if ($LASTEXITCODE) { exit $LASTEXITCODE } }
npm run dev
exit $LASTEXITCODE
