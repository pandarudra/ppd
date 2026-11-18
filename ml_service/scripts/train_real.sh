#!/usr/bin/env bash
# Usage: scripts/train_real.sh <unsw|cicids> <csv-file-or-dir>... [--sample N]
# Example: scripts/train_real.sh unsw data/raw/UNSW_NB15_training-set.csv data/raw/UNSW_NB15_testing-set.csv
set -euo pipefail
cd "$(dirname "$0")/.."

[ $# -ge 2 ] || { sed -n '2,3p' "$0"; exit 1; }
PY=${PYTHON:-$(command -v python3 || command -v python)}

"$PY" training/prepare_real_dataset.py "$@"
"$PY" training/train.py --data data/prepared.csv
