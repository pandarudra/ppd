# Simulating attacks in Sentinel

Use this to demo Sentinel without real attackers: replay realistic attack traffic and watch alerts, the attack map, attack paths and the AI assistant react.

## 1. Before you start

Three things must be running (use the scripts in `scripts/`):

```bash
scripts/run_ml.sh         # ML service  :8001
scripts/run_backend.sh --seed   # backend :8000 (--seed creates the demo users once)
scripts/run_frontend.sh   # console     :5173
```

Sign in at http://localhost:5173 as `analyst@sentinel.local` / `analyst123`, and keep the **Overview** or **Live stream** page open while you run a simulation.

The simulator uses only the Python standard library, so any Python 3.9+ works, with or without a venv.

## 2. Quick start

The shortest way is the launcher next to the other run scripts. It checks the backend and ML service first:

```bash
scripts/run_simulation.sh                      # every attack once
scripts/run_simulation.sh phishing campaign    # chosen scenarios
scripts/run_simulation.sh --loop               # repeat until Ctrl-C, for a live demo
```

It passes any other flag (`--delay`, `--repeat`, `--no-noise`, `--dry-run`, `--list`) straight to the simulator. Or call the simulator directly:

```bash
python backend/scripts/simulate_attacks.py --list          # show every scenario
python backend/scripts/simulate_attacks.py phishing        # one scenario
python backend/scripts/simulate_attacks.py campaign        # a full attack, start to finish
python backend/scripts/simulate_attacks.py all             # everything once
```

Each run logs in, sends events to the backend one by one, and mixes in a little normal traffic so alerts stand out. Within a second or two of each event, alerts appear on Overview and the event shows on Live stream.

## 3. The scenarios

| Scenario | What it simulates | Events | Expected severity |
|---|---|---|---|
| `port_scan` | Nmap-style scan across common ports | 6 | Medium |
| `icmp_sweep` | Ping sweep to map live hosts | 5 | Medium |
| `ssh_brute_force` | Repeated failed SSH logins | 8 | High |
| `rdp_brute_force` | Failed RDP logins on Windows hosts | 8 | High |
| `ftp_brute_force` | Failed FTP logins | 6 | High |
| `credential_stuffing` | Leaked passwords tried on the web login | 8 | High |
| `phishing` | Lure email, then click, credential harvest, malware callback, attacker login with stolen password | 4 | High |
| `spear_phishing_attachment` | Malicious attachment opens a reverse shell | 2 | High |
| `sql_injection` | SQL injection against the web tier | 5 | High |
| `web_exploit` | Remote-code-execution attempts on an app server | 4 | High |
| `privilege_escalation` | Exploit to become domain admin on the DC | 3 | Critical |
| `ransomware_lateral` | Ransomware spreading over SMB | 6 | Critical |
| `malware_c2` | Infected host beaconing to a command server | 5 | High |
| `dns_tunneling` | Data smuggled out inside DNS | 5 | Critical |
| `data_exfiltration` | Large outbound upload from a database/file server | 3 | Critical |
| `syn_flood` | DDoS SYN flood on the web tier | 5 | Critical |
| `udp_flood` | DDoS UDP flood | 4 | Critical |
| `campaign` | One attacker: recon, brute force, access, exfiltration | ~15 | Medium to Critical |

Phishing deserves a note when you present it: an email on its own is invisible to a network sensor. The simulated events are the **traffic phishing causes** (the fake login page, the callback to the attacker's server, the attacker's later login), which is what a SOC would really see.

## 4. A 5-minute demo script

1. Open **Overview** (Live mode, 24h). Point out the empty map.
2. Run `python backend/scripts/simulate_attacks.py phishing`. Watch four events arrive on **Live stream**, then the alert feed fill.
3. Run `python backend/scripts/simulate_attacks.py campaign`. Open **Attack paths**: the attacker's row lights up recon, brute force, access and exfiltration in order.
4. Back on **Overview**, click an attacker marker or arc on the map for its location, alert count and severity. Scroll to zoom, drag to pan.
5. Open an alert, click **Explain**, and show the AI assistant's reasoning. Ask the **Assistant** "Summarize recent alerts".
6. Create an **Incident** from the grouped alerts and show the threat-intel panel on the right.
7. Finish with `python backend/scripts/simulate_attacks.py all --delay 0.2` for a burst of every attack type.

## 5. Options

| Flag | Meaning |
|---|---|
| `--list` | Show all scenarios |
| `--delay 0.6` | Seconds between events (lower is faster) |
| `--repeat 3` | Run the chosen scenarios 3 times |
| `--no-noise` | Skip the benign background traffic |
| `--dry-run` | Print the events instead of sending them |
| `--url`, `--email`, `--password` | Point at another backend or account |

You can name several scenarios in one command: `simulate_attacks.py port_scan ssh_brute_force sql_injection --repeat 2`.

For a steady trickle of mixed traffic (useful for leaving the dashboard "alive"), use the replayer:

```bash
python backend/scripts/replay_traffic.py --rate 2
```

## 6. How alerts are decided

Each event goes through two layers:

1. **ML ensemble** (Isolation Forest, Random Forest, XGBoost) scores the flow statistics: ports, packet sizes, SYN counts, failed-login ratio and so on.
2. **Signature rules** (`backend/app/services/rules.py`) match attack types by name and by thresholds, for example phishing, C2 beaconing, exfiltration, or more than 5,000 SYNs. A rule can only **raise** the risk the ML gave, never lower it. When a rule fires, `signature_rules` shows up in the event's model scores.

This hybrid exists because the currently trained model leans heavily on the destination port and misses attacks such as phishing and DDoS on its own. Retraining on UNSW-NB15 or CICIDS2017 (`scripts/run_ml.sh --train ...`) will improve the ML half.

Related events from the same source IP within 10 minutes are grouped into one alert group, and the Attack paths page orders the stages of each attacker's activity.

## 7. Feeding real or custom logs

Send a syslog line from your own device or tool:

```bash
python backend/scripts/syslog_listener.py --port 5514     # then point syslog at udp://<host>:5514
logger -n 127.0.0.1 -P 5514 -d "Nov 19 10:00:00 fw kernel: DROP IN=eth0 SRC=203.0.113.50 DST=10.0.0.5 PROTO=TCP SPT=40000 DPT=22"
```

Or post a JSON event directly. Any field named like a model feature (`syn_count`, `unique_dst_ports`, `failed_auth_ratio`, `bytes_sent`, ...) is passed to the models:

```bash
curl -X POST localhost:8000/api/v1/events/ingest \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"source_format":"json","raw_log":"{\"source_ip\":\"203.0.113.50\",\"dest_ip\":\"10.0.0.5\",\"dest_port\":22,\"protocol\":\"TCP\",\"event_type\":\"ssh_login_failed\"}"}'
```

### Adding your own scenario

In `backend/scripts/simulate_attacks.py`, write a function returning a list of events built with `ev(src, dst, port, proto, event_type, PROFILE)`, then add it to the `SCENARIOS` dict. To get a rule to fire, put a keyword from `KEYWORD_RULES` in the `event_type` (for example `"phish"`, `"c2"`, `"exfil"`, `"ransom"`).

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `Connection refused` | The backend is not running on :8000 (or use `--url`) |
| `HTTP Error 401` at start | The demo users are missing: run `scripts/run_backend.sh --seed` once |
| `HTTP Error 429` | Rate limit hit: raise `--delay` |
| Events show but no alerts | The ML service on :8001 is down, so events stay `failed`. Start it with `scripts/run_ml.sh` |
| Map has no arcs | Attacker IPs are public addresses, and the map places them with a stand-in location (no GeoIP database). Check the time range on Overview |
| Everything feels slow | The database is remote. Each query takes about 0.4 s. Use local Postgres/Redis (`docker compose up -d postgres redis`) |

Only use this against your own Sentinel instance. The simulator sends data to Sentinel's API; it never sends attack traffic to any other host.
