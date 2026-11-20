# Dependency checklist: Sentinel walkthrough video

Status as of the audit (2026-11-20). ✅ present and verified · ⚠️ present but needs a decision · ➖ not needed, skip · ❌ missing and required.

## A. Required, and already satisfied

| Dependency | Status | Evidence |
|---|---|---|
| Sentinel frontend, backend, ML service running | ✅ | 200 on 5173, 8000 and 8001 |
| Seeded analyst login | ✅ | API login returned a token |
| Node.js 22+ | ✅ | v24.13.1 |
| FFmpeg and FFprobe | ✅ | 6.1.1 at `/usr/bin` |
| Playwright 1.65.1 | ✅ | Root `package.json` devDependency; headless launch and `recordVideo` tested |
| Playwright Chromium headless shell (build 1255) | ✅ | Launched, 2 s WebM written |
| Hyperframes CLI 0.9.72 | ✅ | Runs via `npx`, no install needed |
| Hyperframes skills | ✅ | `skills check`: 6 current, up to date |
| Browser for Hyperframes | ✅ | chrome-headless-shell 158 already on disk; `doctor` accepts it via env var |

## B. Required steps that remain (all zero or near-zero download)

| # | Step | Size or cost | Needed? |
|---|---|---|---|
| 1 | **Free disk space (at least 5 GB; 3.1 GB free is too tight)** | Your decision which files; candidates are `~/.npm/_npx` (2.3 GB, stale), `~/.npm` cache, `~/Downloads` (31 GB) | **Required** |
| 2 | **Quit Docker Desktop** | Frees about 1.4 GB resident RAM | **Required in practice** for a comfortable render |
| 3 | Export `HYPERFRAMES_BROWSER_PATH` to the 158 shell (path below) | No download | **Required** for the optimised path; otherwise it falls back to slower screenshot mode |
| 4 | Create a Hyperframes project and run one tiny `draft` render | Small | **Required** (the only unverified link) |
| 5 | Rewrite `scripts/video/record.js` into per-scene capture scripts | Code only | **Required** |
| 6 | Add `recordings/`, `shots/`, and `chrome-headless-shell/` to `.gitignore` | One edit | Recommended (otherwise they appear as untracked) |

The path for step 3:

```
/home/rudra/Desktop/ppd/chrome-headless-shell/linux-158.0.8127.36/chrome-headless-shell-linux64/chrome-headless-shell
```

## C. Optional, safe to skip

| Dependency | Why skip | Cost if installed |
|---|---|---|
| **whisper-cpp** (transcription) | Captions are written text, not transcribed from audio | Build tools plus a model download |
| **Kokoro TTS** (`pip install kokoro-onnx`) | Only for narration. No voice-over planned. | Hundreds of MB |
| **MusicGen** (`pip install transformers torch …`) | Only for generated music. The brag skill ships local tracks. | **Several GB, which would not fit on this disk** |
| `onnxruntime-node`, `@google/genai` | Install on first use, only for features this workflow does not call | Hundreds of MB |
| Docker (`render --docker`) | Reproducible container renders are not needed. Docker Desktop also costs RAM. | RAM |
| GPU encoding (`--gpu`, `--browser-gpu`) | No usable GPU path here; adds failure modes | None |
| On-demand skills `figma`, `slideshow`, `remotion-to-hyperframes` | Unrelated to this video | Small |
| Another `playwright install` | Would add 600 MB or more of a duplicate browser | Large |
| `/brag` skill workflow | Produces a promo from source code, not a UI walkthrough. Optional as a separate short teaser. | None |
| Bundled brag music and SFX | Optional. Already on disk. Check the license before publishing. | None |

## D. Optional clean-up (your call, nothing has been done)

| Item | Size | Safe? |
|---|---|---|
| `~/.cache/hyperframes/chrome/…/linux-152…` | 261 MB | Stale, since Hyperframes now wants 158. Safe once 158 is confirmed working. |
| `~/.npm/_npx/*` except the Hyperframes one (`702923228c2ce1e6`) | about 2.2 GB | Caches only; they re-download on demand. |
| `~/.cache/ms-playwright/*-1248` | 676 MB | **Not safe to assume**: two other projects are registered against Playwright builds. Check first. |
| `/tmp/hyperframes-extract-cache-1000` | grows during renders | Clean after each render with `hyperframes clean --dry-run` first. |

## E. Conflict check

| Question | Answer |
|---|---|
| Do Playwright and Hyperframes use the same browser? | No. Playwright uses `ms-playwright/…-1255` (v159). Hyperframes uses the 158 shell (or system Chrome 156). |
| Can they coexist? | Yes, provided they run one at a time and Playwright is never pointed at the Hyperframes shell. Verified for Playwright; the Hyperframes render itself is step B4. |
| Does any step modify Sentinel's code or dependencies? | No. The video tooling lives in the repo root (`package.json` with Playwright only) and `scripts/video/`. Sentinel's `frontend`, `backend` and `ml_service` packages are unchanged. |

## F. Which remaining steps are necessary and which are optional

**Necessary:** B1 free disk space, B2 quit Docker Desktop, B3 set the browser path, B4 one tiny test render, B5 write the capture scripts.

**Optional:** B6 gitignore, all of section C, all of section D, a `/brag` teaser, music and SFX, narration.

**Needs your decision before recording:** whether the recording may add data to your database (simulator traffic and an incident), and whether to spend Gemini quota on the Assistant and Explain scenes.
