#!/usr/bin/env bash
# Runs the ML service on :8001.
# Train on real data first:  run_ml.sh --train <unsw|cicids> <csv-file-or-dir>... [--sample N]
#   e.g. run_ml.sh --train unsw data/raw/UNSW_NB15_training-set.csv data/raw/UNSW_NB15_testing-set.csv
# (paths relative to ml_service/). Without --train, serves existing models/.
set -euo pipefail
cd "$(dirname "$0")/../ml_service"
[ -d venv ] || { python3 -m venv venv; venv/bin/pip install -r requirements.txt; }
. venv/bin/activate
if [ "${1:-}" = "--train" ]; then
  shift
  PYTHON=python bash scripts/train_real.sh "$@"
fi
exec uvicorn main:app --reload --port 8001
