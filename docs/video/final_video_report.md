# Sentinel walkthrough: final report

## Deliverables

| File | Notes |
|---|---|
| `recordings/Sentinel_Enterprise_Walkthrough.mp4` | 6:37.9, 1920x1080, 30 fps, H.264 High, yuv420p, 11,937 frames, 30.7 MB, **no audio stream** |
| `recordings/Sentinel_Enterprise_Walkthrough.srt` | 29 captions |
| `recordings/manifest.json` | Scenes, timings, captions, masks, and every write the recorder allowed |
| `recordings/ledger.jsonl` | Append-only log of allowed and blocked non-GET requests (statuses only, no bodies or tokens) |
| Source footage | `recordings/<scene>/` (WebM, manifest, VTT) kept; composition in `recordings/_composition/` |

## Environment actually used

The recording ran against a **local, disposable stack**, not the hosted Supabase and Upstash: Docker `postgres:16` and `redis:7`, a second backend on :8100 and a second frontend on :5174. The backend's only TCP peers were 127.0.0.1:5432 and 127.0.0.1:6379. Your original :5173/:8000 stack was not touched. Account: the seeded `admin@sentinel.local`. The three simulator runs used the seeded analyst account so the admin session was not replaced.

## Scenes

Recorded and used (16): 02 landing, 03 auth, 04 dashboard, 05a events, 05b live stream, 06 alerts, 07 incident, 08 attack paths, 09 threat intelligence, 10 analytics, 11 ML models, 12 assistant (view), 12b assistant (one request), 13a users, 13 profile and settings. Composed title cards: 01 opening, 14 closing (closing fades the last dashboard footage). **Omitted: none.**

All authenticated selectors were **runtime-validated on the local stack** (each scene recorded successfully with no page errors and no blocked requests). Scene lengths are within the storyboard targets except 07 (18.8 s against 35 to 45 s, see below).

## Operations performed

| Target | Operation |
|---|---|
| Hosted Supabase / Upstash | **None** |
| Local database (recorder) | 2 admin logins (the first recording of 03-auth, then a re-record), **1 incident created**, **1 status change** on that incident (open to investigating) |
| Local database (simulator, not the recorder) | 3 runs as the analyst: `all campaign` (121 events; the simulator ignores `campaign` when `all` is given), a separate `campaign` (25 events), and `phishing` + `port_scan` during the live-stream scene (14 events). End state: 160 events, 114 alerts, 18 alert groups, 1 incident, 2 history rows, 168 audit rows, 2 users |
| Redis (local) | Rate-limit keys, refresh keys, dashboard cache; no flush or delete |
| Gemini | **1 request** (`POST /assistant/analyze`, "Summarize recent alerts"), returned HTTP 200 with a real model answer (not the offline fallback). Context sent: the 15 newest locally simulated alerts |
| Browser guard | Blocked requests: **0**. Allowed: login x2, create-incident x1, update-incident x1 (the approved UUID), assistant/analyze x1. No token refresh was needed |

Not run: `pytest`, migrations or seed against the hosted database, `pg_dump`, Redis flush or delete, the Explain, Recommend or suggestion-chip buttons, user create, role change, deactivate, Sign out, Update password, Detect again, Add indicator.

## Things to know

- **The incident creation moment is not in the film.** The first run of scene 07 created the incident (UUID `322b2cbc-0cff-4bea-8c0c-4ba6cc5079e6`) and then failed in my own check (it looked for the list item before the list had loaded), leaving about 1 s of footage. I did not create a second incident. Scene 07 was re-recorded in a resume mode that can only act on that UUID (it verifies the UUID from the request the page makes before the one status change). The film therefore shows the incident workspace, timeline and status change, but not the click on "Open incident". To show it, a second incident would have to be created (or this one deleted first), which needs your decision.
- **The incident title in the app reads "Port Scan Detected Detected from …".** That is the app's own title builder; it is visible in the film.
- **Analytics shows a nearly empty trend** (one data point), because all local data was created on the same day.
- **No audio.** The walkthrough is caption-led. The bundled brag music has no documented licence, so it was not used here.
- **Visible identifiers:** the login page shows the email being typed (`admin@sentinel.local`; the password stays masked). Name and email cells on Users and Profile/Settings are blurred in the composition. **Settings still shows the configured network location "Bhubaneswar, Odisha" (20.30, 85.82).**
- **The landing and login maps use the app's bundled demo data**, and the captions say "illustrative". The dashboard map's locations are placeholders (a deterministic stand-in, not real geolocation); the caption says so.
- **Detection accuracy is not claimed anywhere.** The models page shows what the app computes (UNSW-NB15 held-out split).
- **Rendering stayed in screenshot mode** (the optimised capture never engaged): the 397.9 s film took 11 min 37 s at "looks" quality.
- **Housekeeping:** `.auth/state.json` (admin session tokens) was deleted after recording. The logout implementation does not revoke the refresh token, so the local Redis still holds one for admin until it expires or the stack is stopped.

## Verification

Full decode with no errors; no black or frozen segments detected; frames checked for the title card, login (password masked), dashboard, Users and Settings (blurred), and closing (fades to dark); captions bottom-right, one at a time, matching the on-screen action within about 0.1 s. Not reviewed: the film was not watched end to end in a player.
