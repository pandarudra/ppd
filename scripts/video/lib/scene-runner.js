// Runs ONE scene in its own browser context (fresh video file; memory freed afterwards) and writes a manifest.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const cfg = require("../config");
const { Captions } = require("./captions");
const { installGuard } = require("./guard");
const storyboard = require("../storyboard.json");

// Browsers we launched, so Ctrl-C / kill never leaves a Chromium behind.
const live = new Set();
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { await Promise.all([...live].map((b) => b.close().catch(() => {}))); process.exit(130); });

const cuesFor = (id) => Object.fromEntries(((storyboard.scenes.find((s) => s.id === id) || {}).captions || []).map((c) => [c.key, c]));

async function runScene(scene, { outDir = cfg.outDir, shotsDir = cfg.shotsDir, storageState } = {}) {
  const dir = path.join(outDir, scene.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(shotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true }); // headless: less RAM, no display needed
  live.add(browser);
  let manifest;
  try {
    const context = await browser.newContext({
      viewport: cfg.viewport, deviceScaleFactor: 1,
      recordVideo: { dir, size: cfg.viewport },
      permissions: [], // never prompt for location/notifications
      acceptDownloads: true,
      ...(storageState ? { storageState } : {}),
    });
    // "Your network" on the map: PageWrapper asks the browser for location, then falls back to a third-party IP lookup
    // (ipwho.is) that would expose this machine's public IP. Mark detection as already attempted so the app uses its
    // configured default. (zustand persist key: "sentinel-home")
    await context.addInitScript(() => {
      try { if (!localStorage.getItem("sentinel-home")) localStorage.setItem("sentinel-home", JSON.stringify({ state: { attempted: true }, version: 0 })); } catch {}
    });
    // The dev server mounts the "agentation" feedback toolbar (main.jsx, DEV only) bottom-right, where captions go.
    // Remove it in the recording only; the app is untouched. (Observe `document`: documentElement may not exist yet.)
    await context.addInitScript(() => {
      const kill = () => document.querySelectorAll("agentation-toolbar").forEach((n) => {
        const host = n.parentElement;
        (host && host.parentElement === document.body && host.children.length === 1 ? host : n).remove();
      });
      new MutationObserver(kill).observe(document, { childList: true, subtree: true });
      kill();
    });

    const state = {}; // e.g. state.incidentId, filled from the guarded response
    const guard = await installGuard(context, { sceneId: scene.id, allow: scene.allow || [], state });

    const page = await context.newPage();
    const t0 = Date.now(); // video t=0 is page creation; encoder skew is ~100-300 ms (see manifest.note)
    const clock = () => Date.now() - t0;
    page.setDefaultTimeout(cfg.defaultTimeout);
    const errors = [];
    page.on("pageerror", (e) => errors.push({ tMs: clock(), message: e.message }));
    page.on("requestfailed", (r) => { if (!/blockedbyclient/.test(r.failure()?.errorText || "")) errors.push({ tMs: clock(), message: `requestfailed ${new URL(r.url()).pathname}` }); });

    const captions = new Captions(page, clock);
    const cues = cuesFor(scene.id);
    const events = [], masks = [];
    let shotN = 0;
    const ctx = {
      page, context, state, clock,
      caption: (spec, o) => captions.add(spec, o),
      // Emit a storyboard caption by key. Call it only AFTER the thing it describes is verifiably on screen.
      cue: (key, o) => { if (!cues[key]) throw new Error(`no storyboard caption "${key}" for ${scene.id}`); return captions.add(cues[key], o); },
      mark: (name, extra) => events.push({ tMs: clock(), name, ...extra }),
      // Region to blur in the composition (e.g. an e-mail row). Valid from now to the end of the scene.
      mask: async (locator, label) => { const b = await locator.boundingBox(); if (b) masks.push({ tStartMs: clock(), tEndMs: null, label, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }); },
      unmask: (prefix) => masks.forEach((m) => { if (m.tEndMs === null && m.label.startsWith(prefix)) m.tEndMs = clock(); }), // call before leaving the page
      shot: async (label = "") => {
        const f = path.join(shotsDir, `${scene.id}-${String(++shotN).padStart(2, "0")}${label ? "-" + label : ""}.png`);
        await page.screenshot({ path: f }); return f;
      },
    };

    let ok = true, failure = null;
    try { await scene.run(ctx); await page.waitForTimeout(600); }
    catch (e) { ok = false; failure = e.message.split("\n")[0]; try { await ctx.shot("FAILED"); } catch {} }
    if (guard.blocked.length) { ok = false; failure = failure || `blocked ${guard.blocked.length} unapproved request(s): ${guard.blocked.map((b) => b.method + " " + b.path).join(", ")}`; }

    const durationMs = clock();
    if (ok && scene.saveSession) { // the single login scene stores its session for every later scene
      fs.mkdirSync(path.dirname(cfg.authState), { recursive: true });
      await context.storageState({ path: cfg.authState });
      fs.chmodSync(cfg.authState, 0o600);
    }
    const video = page.video();
    await context.close(); // finalises the WebM
    let videoFile = null;
    if (video) { const raw = await video.path(); videoFile = path.join(dir, `${scene.id}.webm`); fs.renameSync(raw, videoFile); }

    manifest = {
      scene: scene.id, title: scene.title, ok, failure, durationMs,
      video: videoFile && path.relative(outDir, videoFile),
      viewport: cfg.viewport, captionPosition: cfg.captionPosition,
      note: "tStartMs is relative to page creation (video t=0). Add a small constant offset in the composition if captions look early.",
      incidentId: state.incidentId || null,
      requests: guard, events, captions: captions.items, masks, pageErrors: errors,
    };
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(dir, "captions.vtt"), captions.toVtt());
  } finally {
    live.delete(browser);
    await browser.close().catch(() => {});
  }
  return manifest;
}
module.exports = { runScene };
