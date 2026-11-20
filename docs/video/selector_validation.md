# Recorder validation: selectors, flow, safety

Scope: `scripts/video/` (rewritten from the original `record.js` stub). Audited against the frontend **source code** (`frontend/src`). Constraints honoured: no simulation scripts run; no incident, alert, user or threat-intel record created, changed or deleted; no Assistant or Explain endpoint called; no application or database configuration changed; **no login to the hosted Supabase-backed app**.

**Evidence levels used below**
- ✅ **Runtime-tested**: actually executed against the running frontend, public pages only.
- 📖 **Source-verified only**: checked against the source code. **Not run.** Every authenticated scene is in this group.

## 1. What I ran (all unauthenticated, nothing sent to the backend)

| Test | Result |
|---|---|
| `node --check` on every file | ✅ pass |
| `record.js --list`, `--all --dry-run`, `--auth-setup` without flag | ✅ every login-requiring scene is refused without `--allow-login`; exit code 1 for `--auth-setup` |
| `record.js --scene 01-landing` (real recording, 11 s) | ✅ ok, 2 captions, no page errors, `recordings/01-landing/` written, no Chromium left running |
| Landing page network | ✅ it contacts **no host other than localhost** |
| Init script that stops the public-IP lookup | ✅ writes `sentinel-home={"state":{"attempted":true},"version":0}` on load |
| Hiding the dev toolbar | ✅ confirmed on a decoded video frame (see bug 7) |

## 2. Bugs found in the original `record.js` and fixed

| # | Problem (verified in the source) | Effect if left | Fix |
|---|---|---|---|
| 1 | Alerts page uses `DataTable` (`<tr onClick>`), and the original `main button … .first()` selector hits the first **severity filter chip** (`ChipGroup`) | Scene 05 filters the list instead of opening an alert. Scene 07 then fails looking for "Open incident". | Row selector via `getByRole("main").getByRole("row").nth(1)` (row 0 is the header); optional `VIDEO_ALERT_TITLE` to pick a specific generated alert |
| 2 | Scene 03 read a card labelled "Alerts". The real labels are "Events (24h)", "Open alerts", "Critical alerts", "Open incidents". | Caption silently dropped | Uses the real labels; value read from the label's next sibling (`MetricCard.jsx`) and ignores the "…" loading placeholder |
| 3 | Optional steps used `.catch(() => {})`, so required steps failed silently | A scene could record the wrong screen and report OK | Required steps now fail loudly. Every page navigation asserts the page's `<h1>`, so a bounce to `/login` is caught. |
| 4 | `page.goto()` between pages does a full reload, which clears the in-memory live-event store and WebSocket buffer | Live stream and attack-path scenes start empty | Navigation uses the sidebar links (SPA navigation) when available |
| 5 | **Privacy:** `PageWrapper` asks for browser location, then falls back to a third-party IP lookup (`ipwho.is`). Every scene uses a fresh browser, so every scene would do it. | The video would show this machine's real location as "your network" and send its public IP to a third party | Init script marks detection as already attempted, and `permissions: []` stops the location prompt. The map uses the app's default. |
| 6 | One login per scene (8 or more logins) | More writes to the backend database | `--auth-setup` logs in once and saves `.auth/state.json` (git-ignored, mode 600, **contains tokens**); scenes reuse it. Only `02-login` records the real form. |
| 7 | The dev-only `agentation` feedback toolbar (`main.jsx`, DEV only) sits bottom-right, exactly where captions go | Captions collide with a stray button in every scene | Removed in the recording only. The first attempt used CSS and then an init script that threw on `document.documentElement`; the final version observes `document`. |
| 8 | Assistant page has suggestion chips; **each chip sends a prompt immediately** | Clicking one spends Gemini quota | Scene 10 is view-only and never clicks them. A separate `10b-assistant-ask` sends one question and is gated by `--allow-llm`. |
| 9 | Captions could overlap in the single caption slot | Two captions on top of each other | A new caption ends the previous one |
| 10 | Browser not closed if the scene threw outside the `try`; the exit code ignored failures; no Ctrl-C cleanup | Orphan Chromium and a false "success" | `try/finally` around the browser, a SIGINT/SIGTERM handler, exit code 1 when any scene fails |
| 11 | `getByRole("status")` is ambiguous on the Intelligence page (`Spinner` also has `role="status"`) | Strict-mode error | Filtered on the result text ("Known threat" or "Not found") |
| 12 | Scene 07 could be run twice and create two incidents | Duplicate records | `once` guard: refuses to run again unless `--force` |

## 3. Scene-by-scene validation

Gates: **L** = needs `--allow-login`, **W** = needs `--allow-writes`, **M** = needs `--allow-llm`.

| Scene | Route and flow | Key selectors | Evidence | Notes and risks |
|---|---|---|---|---|
| `01-landing` | `/`, scroll to two sections | h1 "See every attack. Stop it faster."; h2 "Everything an analyst reaches for"; h2 "From log line to response" | ✅ runtime | Public. No backend contact. |
| `02-login` (L) | `/login`, fill, submit, wait for `/dashboard` | `getByLabel("Email")`, `getByLabel("Password",{exact})`, button "Sign in" | 📖 | Starts with no saved session. Wrong credentials show an error on the page, and the scene then fails at `waitForURL`. |
| `03-overview` (L) | `/dashboard`, read KPIs, click History | text "Events (24h)"; group "Mode" → button "History" | 📖 | Cards show "…" until loaded; handled. |
| `04-live` (L) | `/dashboard` then sidebar "Live stream" | link "Live stream" in nav "Main"; `main tbody tr` | 📖 | **Empty without traffic**: the page only shows events received over WebSocket while open. Needs simulator traffic during the take. |
| `05-alerts` (L) | `/alerts`, click first row, open and close drawer | `main` rows; dialog "Alert detail"; its h3; button "Close" | 📖 | Does not press "Explain with AI", status or comment. |
| `06-attack-paths` (L) | sidebar "Attack paths" | h2 "Attacker kill chains" | 📖 | Caption is skipped when the page says "No attackers in this window." |
| `07-incidents` (L, W) | `/alerts` → drawer → "Open incident" → `/incidents` → Timeline tab → status "investigating" | button "Open incident" → "Linked to incident"; `main button[aria-current]` filtered by `Incident: <title>`; `#incident-status`; tab "Timeline" | 📖 | Writes exactly one incident and one status change. No UI exists for response proposal or approval. The "recommend" button (LLM) is not used. |
| `08-intel` (L) | `/intelligence`, lookup | labels "Indicator", button "Look up"; status text | 📖 | Lookup is a GET (`intelligenceApi.js`). "Add indicator" form never touched. Value from `VIDEO_IOC` (default is the app's own placeholder). |
| `09-models` (L) | `/models`, Compare all | h2 "Diagnostics"; button "Compare all" | 📖 | "Compare all" only exists when at least two models have curves (true today: all three have curves). |
| `10-assistant` (L) | `/assistant`, view only | label "Question" | 📖 | Nothing is sent. Never click the suggestion chips. |
| `10b-assistant-ask` (L, M) | type and Enter | label "Question" | 📖 | Sends one prompt to Gemini: **not to be run now**. |

## 4. Selectors that need runtime validation (after login is authorised)

Everything in scenes 02 to 10b is source-verified only. Highest risk first:

1. `getByRole("main").getByRole("row").nth(1)` on `/alerts`: confirms the table has rows and that row 0 is the header.
2. `getByRole("dialog",{name:"Alert detail"})` and its `getByRole("heading",{level:3})`: the drawer has an h2 title and an h3 alert title; confirm the h3 is the first one.
3. `getByRole("group",{name:"Mode"}).getByRole("button",{name:"History"})` on the Overview page.
4. Sidebar link names at 1280 px width, and that only one `nav "Main"` is in the DOM (the mobile drawer is not rendered at this size).
5. `main button[aria-current]` on `/incidents`: confirm React renders `aria-current="false"` as an attribute so non-active items still match.
6. Incident title text equals `Incident: <alert title>` exactly (the list truncates visually only).
7. `#incident-status` exists after selecting an incident, and `selectOption("investigating")` matches an option value.
8. `getByLabel("Indicator",{exact:true})` is not confused with "Indicator type" on the lookup form.
9. The Overview "…" loading wait and that all three KPI labels return values.
10. The saved-session path: `storageState` restores `localStorage["sentinel-auth"]`, and `open()` does not bounce to `/login`.
11. Caption timing against the real video: `tStartMs` is measured from page creation, and encoder skew is not measured yet. It was not checked for the landing recording either, so it stays a runtime item.

## 5. Exact commands for a safe landing-page recording test

All of these are public and unauthenticated. No backend or database contact.

```bash
cd /home/rudra/Desktop/ppd
source scripts/video/env.sh                      # browser path for later Hyperframes steps (harmless here)

node scripts/video/record.js --list              # no browser
node scripts/video/record.js --all --dry-run     # shows what is refused: every login scene is skipped
node scripts/video/record.js --selftest          # 3 s of the public login page into the OS temp dir (no login, no submit)
node scripts/video/record.js --scene 01-landing  # 11 s, writes recordings/01-landing/ (video, manifest.json, captions.vtt)

# inspect the result
ls -la recordings/01-landing
python3 -c "import json;m=json.load(open('recordings/01-landing/manifest.json'));print(m['ok'],m['durationMs'],m['captions'],m['pageErrors'])"
ffmpeg -v error -y -ss 8.5 -i recordings/01-landing/01-landing.webm -frames:v 1 /tmp/landing_frame.png
```

I ran the last three recording commands above, and they passed. The video and manifest for `01-landing` are in `recordings/01-landing/` (git-ignored).

## 6. Actions that need your authorisation about the database

None of these have been run. Every one of them contacts the **hosted Supabase and Upstash backend** configured in `backend/.env`, so each needs your decision first.

| Action | Why it needs authorisation | Flags |
|---|---|---|
| Any login (`--auth-setup`, or scenes 02 to 10b) | A login can update last-login or session data on the hosted database. Also sends credentials to the backend. | `--allow-login` |
| Opening any authenticated page | Reads alerts, events and incidents from the hosted database | `--allow-login` |
| `07-incidents` | Creates exactly one incident and changes its status | `--allow-login --allow-writes` |
| Running `scripts/run_simulation.sh` (phishing, campaign) for scenes 04 and 06 | Inserts events and alerts into the hosted database | Separate from the recorder; not a flag |
| `10b-assistant-ask` | Spends Gemini quota (and sends platform data to the provider) | `--allow-login --allow-llm` |
| Taking the database backup you asked for | Needs credentials and `pg_dump` against the hosted database | Not scripted |

A cleaner alternative for all of the above is a **local** Postgres and Redis (the repo's `docker-compose.yml`), which you have not approved yet.

## 7. Files

`scripts/video/`: `record.js` (CLI and gating), `config.js`, `lib/{helpers,captions,scene-runner}.js`, `scenes/index.js`, `env.sh`. Git-ignored outputs: `recordings/`, `shots/`, `.auth/`, `chrome-headless-shell/`.
