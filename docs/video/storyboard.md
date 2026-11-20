# Sentinel walkthrough: production plan (Stage 1)

Status: **Stage 1 complete. No hosted operation has been performed.** This document is the storyboard, scene manifest and recording plan. Machine-readable version: [`scripts/video/storyboard.json`](../../scripts/video/storyboard.json). Earlier documents still apply: [`selector_validation.md`](selector_validation.md), [`hosted_environment_preflight.md`](hosted_environment_preflight.md).

## 1. Where things stand

| Item | State |
|---|---|
| Recorder (`scripts/video/record.js`, `lib/`, `scenes/`) | Rewritten for the 14-scene storyboard. **Only `02-landing` (public) has been run.** |
| Composition (`scripts/video/compose.js`) | New. Builds the Hyperframes project and the SRT from the storyboard and the scene manifests. **Tested on a 40 s proof (title card + the real landing recording) rendered to 1080p30 H.264.** |
| Browser-level request guard (`lib/guard.js`) | New. **Tested offline against a local mock API** (see section 6). |
| Authenticated selectors | Source-verified only. **Not runtime-tested.** |
| Hosted Supabase and Upstash | **Untouched.** R1 (isolation) is still unconfirmed. |

## 2. Scene plan

Durations are targets; the recorder's pauses are tuned to hit them but only the landing scene has been measured (22.1 s against a 20–25 s target). Totals: **5:53 minimum, 7:40 maximum**; aim for the lower half to land near 6:30.

| # | Scene | Phase | Target | Source | Data it needs |
|---|---|---|---|---|---|
| 01 | Opening title | none | 15–20 s | Hyperframes title card (grid, deterministic dots, wordmark). No app footage, no fabricated UI. | none |
| 02 | Landing page | none | 20–25 s | **Recorded** (done once) | none (map uses the app's bundled **demo** data; caption says so) |
| 03 | Authentication | **A** | 15–20 s | Recorded; **the one login**, saves the session | analyst account |
| 04 | Dashboard | A | 35–45 s | Recorded | existing alerts and events |
| 05a | Events table (filter, detail drawer, pagination) | A | 18–24 s | Recorded | existing events |
| 05b | Live stream | A | 10–16 s | Recorded | **WebSocket traffic only**; empty without Phase B traffic. A "live telemetry" caption is emitted only if rows really arrive; otherwise a neutral "standby" caption. |
| 06 | Alert investigation | A | 40–45 s | Recorded | existing alerts |
| 07 | Incident management | **B** | 35–45 s | Recorded | one approved demo alert |
| 08 | Attack paths | A (richer after B) | 25–35 s | Recorded | attackers in the 24 h or 7 d window; **fails loudly if there are none** |
| 09 | Threat intelligence | A | 25–35 s | Recorded | existing indicators |
| 10 | Analytics | A | 25–30 s | Recorded | existing data |
| 11 | ML models | A | 35–45 s | Recorded | model metrics (present) |
| 12 | Assistant (view only) | A | 8–12 s | Recorded | none |
| 12b | Assistant (one request) | **C** | 12–18 s | Recorded | Gemini quota |
| 13 | Profile and settings | A | 20–25 s | Recorded; identifiers blurred in the composition | none |
| 14 | Closing | none | 15–20 s | Last frames of scene 04 under a Hyperframes title | scene 04 |

### Differences from the brief (and why)

- **User administration is omitted.** `/users` is admin-only and the analyst is redirected to the dashboard. Showing it needs a second (admin) login, which is not authorised.
- **Scene 10 (Analytics)** has only Alerts or Events volume trends over 7, 14 or 30 days. The **severity breakdown and threat distribution are on the Dashboard** ("Alerts by severity, 7 days"), so the film shows them in scene 04.
- **Scene 07** shows only what the UI supports: open an incident from an alert, view its timeline, one status change. There are **no screens for proposing or approving response actions**, and none are shown or claimed.
- **Scene 05** is two scenes: the Events page holds search, pagination and the detail drawer; the Live stream is a separate WebSocket-only page.
- **Landing and login maps use demo data** bundled in the frontend, not real attackers, and the dashboard map's locations are placeholders. The captions say "illustrative".
- **Scene 12b** is skipped unless Phase C is approved and the answer is genuine.

## 3. Contextual captions

Captions are **sidecar data in each scene manifest, not part of the app and not baked into the recording**. `compose.js` draws them in Hyperframes at the bottom-right: a dark translucent rounded panel with a coloured status dot, an uppercase `LABEL / STATUS` line, then two lines of text, fading in and out. A new caption always ends the previous one, so they never overlap.

Rules enforced in the scenes:
- A caption is emitted **only after** the thing it describes is verifiably on screen (for example "status moved to investigating" waits for the timeline entry "Status changed from open to investigating").
- Text comes from `storyboard.json`, so wording is reviewed in one place.
- Measured on the landing recording: caption and scroll timing matched the video within about 0.1 s.
- The WebM carries a **static tail of about 6 s** while the recorder finalises. `compose.js` trims every clip to the scene clock, so that tail never reaches the film.

## 4. Privacy and safety measures already built into the recorder

| Concern | Measure |
|---|---|
| Browser location prompt and the third-party IP lookup (`ipwho.is`) that would show this machine's location | Disabled for every scene; verified on a public page. The map uses the app's configured default. |
| Dev-only "agentation" toolbar in the bottom-right corner | Removed from the recording only; verified on a decoded frame. |
| Login | **Exactly one login**, performed by `03-auth`; the password field stays masked. `--auth-setup` was removed. Every other scene reuses `.auth/state.json` and **never logs in**: a bounce to `/login` stops the scene with an error. A second login also needs `--allow-relogin` and a ledger check. |
| Unintended writes | **Browser-level guard**: every non-GET request to the backend is blocked unless the scene's allow list names it, with a maximum count. The only allowances are: login (once, scene 03), token refresh (max 3, only if the 15-minute token expires), create-incident (once) and update that same incident UUID (once), and `assistant/analyze` (once, scene 12b). Any block fails the scene. |
| Ledger | Every allowed or blocked write is appended to `recordings/ledger.jsonl` (method, path, status, never bodies or tokens). It feeds the final report and blocks a second login across runs. |
| Account email, name, API URL on Profile and Settings | Located at runtime and **blurred in the composition**. The scene **fails if it cannot find a row to mask**. |
| Never pressed anywhere | Sign out, Update password, "Detect again", Explain with AI, Explain & next steps, Recommend, suggestion chips, Add indicator, alert Status/Assign/Comment. |
| Credentials in logs | None printed. `.auth/` and `recordings/` are git-ignored. |

Open privacy question for you: the dashboard map labels "your network" with the configured default, **"Bhubaneswar, Odisha"** (frontend `.env`). It is a city-level label, not a private address. Tell me if you want it blurred too.

## 5. Approvals needed before each stage

| Stage | What it needs from you | Why |
|---|---|---|
| **2. Environment** | **Written confirmation that Supabase project `rwprwoyrzvayjvtynmnt` and Upstash `set-jawfish-205399` are isolated development resources that you own or control**, or a decision to use local services | R1: not inferable from the code |
| **3. Phase A** | Explicit approval: one analyst login as `analyst@sentinel.local`, then read-only pages | Expected effects: 1 update to the user's row (`last_login`), 1 audit row, 1 Redis refresh key, plus about 300 to 500 rate-limit and cache commands; no other writes |
| **4. Phase B** | Explicit approval, **after Phase A**: scenario list and event cap, simulator account, one demo alert title, baseline capture | About 31 events and about 130 rows for `phishing` + `campaign`; correlation can touch older open alerts from the same IP within 10 minutes |
| **5. Phase C** | Explicit approval, **after Phase B**: the question text, quota confirmation | One Gemini request; the answer is stored in `audit_logs` |

Each approval is separate; none implies another.

**If R1 stays unconfirmed**, the local alternative is: start Docker, run the repo's `postgres:16` and `redis:7`, create the tables locally, and start a second backend on the local stores. It needs your approval for starting Docker, about 550 MB of images (disk now has 11 GB free), stopping the backend that is currently running against the hosted stores, and starting another with the local connection strings passed as environment variables, so no config file changes. The video would then be recorded entirely against local data, which contains none of the hosted database's existing alerts.

## 6. What was verified in Stage 1, and what was not

**Verified by running it (public or offline only):**
- `02-landing` recording: 22.1 s, 2 captions, no page errors, no browser left running, no backend request.
- Request guard against a local mock API: GET allowed; second login blocked; Gemini endpoint blocked with no rule; update before creation blocked; update of a different UUID blocked; the created incident's UUID captured from the response and the one update allowed; second update and DELETE blocked; only the three allowed writes reached the mock server; ledger and failure marking correct.
- Caption compositing, 1080p30 render, SRT generation, trim to scene clock, title card, in a 39.9 s proof: 1197 frames, H.264, full-stream decode clean; caption position and text checked on decoded frames.
- Dry runs: every login scene is refused without `--allow-login`; no session means no scene runs; a second login is refused.

**Not verified:**
- Every authenticated selector and every scene duration except the landing page.
- Mask positions, caption timing on authenticated scenes, and the `once` and refresh behaviour against the real backend.
- BeginFrame (optimised) capture still does not engage, so renders use screenshot mode (the 39.9 s proof rendered in 98 s at draft quality, about 2.5 times real time, so a 6.5-minute film is roughly 16 minutes at draft and longer at final quality).
- Audio: none planned yet. The film is caption-led; background music would need a track whose licence I can confirm.

## 7. Resources

Free disk 11 GB (was 3.3 GB), free RAM about 3 GB, Docker Desktop stopped, no browser processes running. The Hyperframes extract cache used 56 MB for 22 s of 720p footage, so about 1 GB is expected for the full film.

**Hyperframes note:** `npx --offline hyperframes` no longer resolves because the npm metadata cache was cleared (it worked before). `compose.js` runs the CLI directly from `~/.npm/_npx/…/hyperframes/bin/hyperframes.mjs` (override with `HF_BIN`). If that folder is also removed, a network install would be needed.

## 8. Files

`scripts/video/`: `storyboard.json`, `record.js`, `compose.js`, `config.js`, `env.sh`, `lib/{captions,guard,helpers,ledger,scene-runner}.js`, `scenes/index.js`, `test/guard.test.js`. Git-ignored outputs: `recordings/` (including `_work/` and `_composition/`), `shots/`, `.auth/`, `chrome-headless-shell/`. Prototype artefacts: `recordings/_work/captiontest.*` (proof only, not a deliverable); `recordings/01-landing/` is the earlier landing recording and is superseded by `02-landing/`.

Final deliverables (not yet produced): `recordings/Sentinel_Enterprise_Walkthrough.mp4`, `.srt`, `recordings/manifest.json`, `docs/video/final_video_report.md`.
