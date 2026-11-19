#!/usr/bin/env bash
# Run every attack back to back (a good live demo).   bash all_attacks.sh
cd "$(dirname "$0")" || exit 1
for s in ssh_bruteforce rdp_bruteforce port_scan syn_flood data_exfil; do python3 "$s.py" "$@"; done
