#!/usr/bin/env bash
# Replays simulated cyber attacks into a running Sentinel (backend :8000 + ML :8001).
#   scripts/run_simulation.sh                      # every attack type once
#   scripts/run_simulation.sh phishing campaign    # chosen scenarios
#   scripts/run_simulation.sh --list               # show scenarios
#   scripts/run_simulation.sh --loop               # keep going until Ctrl-C (live demo)
# Any other flag is passed to backend/scripts/simulate_attacks.py (--delay, --repeat, --no-noise, --dry-run ...).
# Needs the seeded analyst account. See docs/ATTACK_SIMULATION.md.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=${PYTHON:-$(command -v python3 || command -v python)}  # the simulator is stdlib-only, any Python works
SIM=backend/scripts/simulate_attacks.py
BACKEND=${BACKEND_URL:-http://localhost:8000}
ML=${ML_URL:-http://localhost:8001}

LOOP=0; ARGS=()
for a in "$@"; do [ "$a" = "--loop" ] && LOOP=1 || ARGS+=("$a"); done
[ ${#ARGS[@]} -eq 0 ] && ARGS=(all)

# --list and --dry-run need no running services
case " ${ARGS[*]} " in *" --list "*|*" --dry-run "*) exec "$PY" "$SIM" "${ARGS[@]}";; esac

up() { curl -fsS -m 5 -o /dev/null "$1" 2>/dev/null; }
up "$BACKEND/health" || { echo "Backend is not reachable at $BACKEND. Start it with: scripts/run_backend.sh --seed" >&2; exit 1; }
up "$ML/health"      || echo "Warning: ML service is not reachable at $ML. Events will be stored but not scored (start scripts/run_ml.sh)." >&2

run() { "$PY" "$SIM" --url "$BACKEND" "${ARGS[@]}"; }
if [ "$LOOP" = 1 ]; then
  echo "Looping. Press Ctrl-C to stop."
  while true; do run; sleep 5; done
else
  run
fi
