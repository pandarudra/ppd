# Video architecture: Sentinel walkthrough

Designed for this machine: **7.5 GB RAM (about 2.7 GB free today), 3.1 GB free disk, no GPU path, no heavyweight AI models.** Nothing in this file has been executed yet except the Playwright smoke test described in `environment_audit.md`.

## 1. Decision: two stages, run one at a time

```
 Stage A  CAPTURE (Playwright)        Stage B  COMPOSE + RENDER (Hyperframes)
 ──────────────────────────────       ───────────────────────────────────────
 Sentinel on localhost                 clips + stills (local files)
   │ headless Chromium 159               │ HTML/GSAP composition
   │ 1280×720, scripted scenes           │ titles, callouts, zoom, captions
   ▼                                     ▼
 recordings/*.webm + shots/*.png  ──▶   lint → check → snapshot → preview
   │ ffmpeg → short H.264 clips          │ render draft → render final
   ▼                                     ▼
 trim per scene, 3–8 s each              walkthrough.mp4 (+ poster.jpg)
```

The two stages never run at the same time. Each is small, but together they would exceed the free RAM.

## 2. Why this shape

- **Why not `/brag` alone:** it invents a 15–25 s promo from source code and does not show the real UI. The walkthrough needs real footage, so Stage A captures it. `/brag` is still fine later for a short teaser.
- **Why Playwright for capture and Hyperframes for composition:** Playwright's `recordVideo` is already installed and proven here. Hyperframes is built to composite and render HTML, not to record a live app.
- **Why short trimmed clips plus stills:** Hyperframes decodes every embedded video into frames in `/tmp/hyperframes-extract-cache-1000`, which is on the nearly full disk. Less footage means less cache. Static screens (map, model page, tables) are better as PNG stills with a gentle zoom, which cost almost nothing.

## 3. Stage A: capture (Playwright, headless)

**Settings**

| Setting | Value | Reason |
|---|---|---|
| Mode | `headless: true` | No display needed and less RAM than headed. Verified. |
| Viewport and video size | 1280×720 | Enough for UI footage and about a third of the pixel cost of 1080p. The composition scales it. |
| `deviceScaleFactor` | 1 (2 only for a few still screenshots) | Keeps video small. |
| Contexts | One context, one page, closed per scene | Frees memory between scenes. |
| Output | `recordings/<scene>.webm` plus `shots/<scene>.png` | Both git-ignored. |
| Network waits | `waitForLoadState("networkidle")` or a visible-element wait | The app polls and has a WebSocket, so avoid fixed sleeps except for pacing. |

**Scene list** (each a separate short recording so any scene can be redone alone; routes and selectors come from the audit):

| # | Scene | Route | Notes |
|---|---|---|---|
| 1 | Landing | `/` | Animated attack map. |
| 2 | Login | `/login` | Type into `#email` and `#password`, click "Sign in". Use the seeded analyst. |
| 3 | Overview | `/dashboard` | KPIs, map click and zoom, time-range toggle. Data already present: 254 events, 189 alerts. |
| 4 | Live stream | `/live` | Needs fresh traffic for motion (see "Live traffic" below). |
| 5 | Alerts | `/alerts` | Open a drawer, press Explain. Gemini key is set, but this spends API quota. |
| 6 | Attack paths | `/attack-paths` | Best after a `campaign` run. |
| 7 | Incidents | `/incidents` | **Empty today.** Creating an incident writes to the database. Decide first. |
| 8 | Threat intel | `/intelligence` | 5 indicators available. |
| 9 | Models | `/models` | Fully populated. Use "Compare all" and the diagnostics. |
| 10 | Assistant | `/assistant` | One question ("Summarize recent alerts"). |

**Live traffic:** scenes 4 and 6 need events arriving during the take. Run `scripts/run_simulation.sh phishing` (or `campaign`) in a second terminal. This adds rows to your database. It is what the simulator is for, but it is a data change, so it is your call.

**Post-processing:** convert each WebM to a short H.264 MP4 with the system FFmpeg (for example `-crf 23 -preset veryfast -threads 2 -an`), trimmed to the useful 3–8 s. Target **40 s or less of total footage** to bound the frame cache.

## 4. Stage B: compose and render (Hyperframes)

**Browser:** set `HYPERFRAMES_BROWSER_PATH` to the existing chrome-headless-shell 158 (see the dependency checklist). This enables the optimised capture path with no download.

**Project:** a new Hyperframes project in `docs/video/composition/` (or a gitignored folder). Hyperframes is run through `npx`, which is already cached, so nothing is added to Sentinel's dependencies.

**Composition:** one root timeline, one sub-composition per scene; the recorded clips and stills are placed as media; title cards, lower-third captions and highlight rings are HTML/CSS. Captions are written text, so no speech tools are needed. Music and SFX, if used, come from files already on disk.

**Quality gates before any real render** (from the CLI skill): `lint`, then `check`, then `snapshot` and look at the PNGs, then `preview`.

**Render plan (memory-safe):**

| Pass | Command shape | Purpose |
|---|---|---|
| 1 | `render --quality draft --workers 1` | Prove it works and measure RAM, time and disk. |
| 2 | `render --quality looks --workers 2` | The real output at 1080p30. |
| Not used | `--docker`, `--gpu`, 60 fps, `--format` other than mp4 | More memory, disk or complexity for no benefit here. |

**Budget (estimates, to be replaced by the pass 1 measurements):**

| Item | Estimate |
|---|---|
| Each Hyperframes worker (Chrome) | about 256 MB (documented) |
| 2 workers + FFmpeg + Node | about 1.3 GB |
| Free RAM today | about 2.7 GB, about 4 GB after quitting Docker Desktop |
| Frame cache for 40 s of footage at 30 fps | unmeasured, plausibly 0.2–1 GB |
| Final MP4 (about 60 s) | about 20–50 MB |

## 5. Sequence and what runs when

1. **Free resources** (your actions): quit Docker Desktop, close heavy browser tabs, and free at least 5 GB of disk.
2. **Stage B smoke test:** one tiny Hyperframes composition rendered at `draft` with the 158 shell. This is the only unverified link in the chain.
3. **Stage A:** capture scenes one by one, checking each file.
4. **Stage B:** compose, run the gates, draft render, then final render.
5. **Cleanup:** `hyperframes clean --dry-run` first, then clean the frame cache; remove intermediate WebM files.

## 6. Failure modes and how the design handles them

| Risk | Handling |
|---|---|
| Disk fills mid-render | Free 5 GB or more first; shorten footage; watch `df` and the cache size during pass 1. |
| Out of memory | Close Docker Desktop and Brave; use `--workers 1` and `--quality draft`; swap exists but is slow. |
| App data changes between takes | Scenes are independent and repeatable; use stills where data must match. |
| Login or session expiry mid-scene | Each scene logs in itself, or reuses a saved `storageState` file kept out of git. |
| Secrets appear on screen | Never show the Settings page env values, the Assistant key, or `.env`. Seed credentials are demo-only but still avoid showing them in the final cut. |
| Hyperframes render fails with the 158 shell | Fall back to system Chrome 156 (screenshot mode). Slower, but it works. |
