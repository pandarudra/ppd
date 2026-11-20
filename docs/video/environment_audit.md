# Environment audit: Sentinel walkthrough video

Audited 2026-11-20 on this machine. Everything here was read-only except one throwaway Playwright launch (2 s, written to `/tmp`, deleted afterwards). **No recording was started, nothing was installed or deleted, and the Sentinel app and its dependencies were not modified.**

Legend: ✅ verified by running it · 📖 taken from documentation or file inspection, not run · ⚠️ risk

## 1. Machine

| Resource | Measured | Verdict |
|---|---|---|
| CPU | 8 threads, i5-1135G7 | Fine |
| RAM | 7.5 GB total; **2.7–2.8 GB available** with everything currently open | ⚠️ Tight but workable (see section 6) |
| Swap | 11 GB, 3.3 GB already used | Safety net only; swapping during a render is slow |
| **Disk** | `/` is 468 GB, **100% used, 3.1 GB free** (`/tmp` is on the same disk) | ⚠️ **The real constraint** |
| `/dev/shm` | 3.9 GB | Fine |
| Node / FFmpeg | v24.13.1 / 6.1.1 (system) | ✅ Meets the Hyperframes minimum (Node 22+) |

**Biggest memory users right now:** Docker Desktop's VM (`qemu-system`, about 1.4 GB resident, 5 GB allocated), VS Code (about 1 GB across processes), Brave, and the Sentinel services. Docker is not needed for this workflow.

**Where the disk space is** (reclaimable only by your decision, nothing was touched): `~/Downloads` 31 GB, `~/.local` 7.2 GB, `~/.npm` 7.7 GB (of which `_npx` is 2.3 GB, stale npx caches), `~/.cache` 5.6 GB.

## 2. The Sentinel application (localhost) ✅

| Service | URL | State |
|---|---|---|
| Frontend (Vite) | http://localhost:5173 | 200 |
| Backend | http://localhost:8000/health | 200 |
| ML service | http://localhost:8001/health | 200 |

Logged in through the API as the seeded analyst (`analyst@sentinel.local`) and read counts:

| Data | Value | Implication for the video |
|---|---|---|
| Events (24 h) | 254 | Tables and charts are populated |
| Alerts | 189, all open, 26 critical | Alert queue and map have content |
| **Incidents** | **0** | The incidents page is empty. A scene there needs an incident created, which writes to the database. |
| Threat-intel indicators | 5 | Lookup page has content |
| Model metrics | present for all 3 models; curves for all, feature importance for RF and XGBoost | The model-performance page is fully populated |
| LLM keys | `LLM_PROVIDER=gemini`; Gemini and NVIDIA keys are set (values not read) | The assistant should give real answers, not offline mode. ⚠️ Not exercised, since that would spend API quota. |

**Login page selectors** (read from `frontend/src/pages/Login.jsx`, and confirmed present in the browser): `#email`, `#password`, a button named "Sign in", and a show/hide button with `aria-label`. ✅ The page title is "Sentinel | Security operations".

Not verified: an actual UI login, the WebSocket live stream in a browser, and the geolocation endpoint (the one I called returned an empty body, so check its exact path before a map scene depends on it).

**All 15 routes** (from `App.jsx`): `/`, `/login`, `/dashboard`, `/live`, `/events`, `/alerts`, `/incidents`, `/attack-paths`, `/intelligence`, `/analytics`, `/models`, `/assistant`, `/users` (admin only), `/profile`, `/settings`.

## 3. Browsers (the part that is easy to confuse)

Three unrelated browser sets exist. They do not conflict because each tool resolves its own binary.

| Browser | Version | Location | Used by |
|---|---|---|---|
| Playwright Chromium (full) | 159.0.8154.6 (build 1255) | `~/.cache/ms-playwright/chromium-1255` | Playwright headed mode |
| Playwright headless shell | 159 (build 1255) | `~/.cache/ms-playwright/chromium_headless_shell-1255` | Playwright headless mode ✅ |
| Playwright older build | 1248 (403 MB + 273 MB) | `~/.cache/ms-playwright/*-1248` | Another project on this machine (two project links are registered). Do not delete without checking. |
| System Chrome | 156.0.8078.79 | `/usr/bin/google-chrome` | Hyperframes fallback (screenshot mode) |
| **chrome-headless-shell 158.0.8127.36** | 158 | **`/home/rudra/Desktop/ppd/chrome-headless-shell/`** (283 MB, untracked in the repo) | Hyperframes optimised capture, if pointed to ✅ |
| chrome-headless-shell 152 | 152.0.7977.30 | `~/.cache/hyperframes/chrome/` (261 MB) | Stale: Hyperframes now wants 158 |

## 4. Hyperframes ✅

- Version 0.9.72 (latest), run through `npx` from a temporary cache (`~/.npm/_npx/…`, 141 MB). Nothing is installed globally or in the project.
- **The "optimised capture falls back to screenshot mode" warning is already solvable at no download cost.** The exact pinned shell (158.0.8127.36) is already on disk in the repo root. With `HYPERFRAMES_BROWSER_PATH` pointing at it, `doctor` reports `✓ Chrome env: …/chrome-headless-shell` and the fallback warning no longer prints. I did not run a render with it yet.
- **Skills:** `hyperframes skills check` now reports "✓ 6 current, installed skills are up to date". The "six missing or outdated" result you saw has already been fixed by the update at 11:32. Three skills (`figma`, `remotion-to-hyperframes`, `slideshow`) are available on demand and are not needed.
- Docker is now running (it was not when you ran `doctor`). It is only needed for `render --docker`, which this workflow skips.

## 5. Brag skill ✅📖

Installed at `~/.claude/plugins/marketplaces/brag/skills/brag` (17 MB of bundled music and SFX, so nothing to download).

- It **builds a 15–25 second launch video from the project's source code**, in a chosen tone. It says explicitly that it needs no live URL and no screenshots. It does not record the running app.
- Its workflow is four steps: inspect the project, plan and storyboard, hand a brief to Hyperframes, then validate, render and write share copy. It requires `npx hyperframes check` to pass before rendering.
- **Consequence:** `/brag` fits a short promo with invented motion graphics. A **walkthrough showing the real UI** needs real footage, which `/brag` does not capture. The architecture in `video_architecture.md` records footage with Playwright and composes it with Hyperframes directly, borrowing from the brag skill only its bundled music and SFX if you want them.
- ⚠️ I did not check the license terms of the bundled music (`ende.app` tracks). Check before publishing.

## 6. Playwright and Hyperframes coexistence ✅

- Playwright 1.65.1 (root `package.json`, devDependency only) launched headless Chromium 159 in about 340 ms, loaded `http://localhost:5173/login`, found the form, recorded a WebM (about 0.5 MB for 2 s at 1280×720) and closed cleanly. Free memory dropped by only a few hundred MB.
- Hyperframes resolves its browser separately (environment variable, then its cache, then system Chrome) and uses its own `puppeteer` stack. It never uses Playwright's builds.
- **Rules that keep them from conflicting:** never point Playwright at the Hyperframes shell (Playwright requires its own matching builds), never run them at the same time (RAM), and do not run `playwright install` again, because it would add another 600 MB or more.
- Not verified: an actual Hyperframes render using the 158 shell. That is the first step in `video_architecture.md`, on a tiny test project.

## 7. Issues in the existing `scripts/video/record.js`

It is a stub that stops at the login page. For the real recording:

- `headless: false` with `--start-maximized` conflicts with a fixed viewport, and headed mode costs more memory. Use headless.
- Recording at 1920×1080 is unnecessary. 1280×720 is enough, and the composition can scale up to a 1080p render.
- It needs real selectors for each scene (the login ones are above) and a shorter per-scene structure.
- `recordings/` is not gitignored, and neither is `chrome-headless-shell/`, so both would show up as untracked files.

## 8. Repo state (untracked, created by the video setup, none of the Sentinel code was changed)

`package.json`, `package-lock.json` (root, Playwright only), `node_modules/` (19 MB, ignored by the existing `.gitignore`), `chrome-headless-shell/` (283 MB), `scripts/video/record.js`.
