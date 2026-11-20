#!/usr/bin/env node
// Sentinel walkthrough recorder: one scene = one WebM + manifest.json + captions.vtt. It does NOT compose the film
// (see compose.js). Every non-GET backend request is checked by a browser-level guard and ledgered (lib/guard.js).
//
//   node scripts/video/record.js --list
//   node scripts/video/record.js --selftest                     # 3 s of the public login page, OS temp dir
//   node scripts/video/record.js --scene 02-landing             # SAFE: public page, no login, no backend call
//   node scripts/video/record.js --all --dry-run                # what would run / be refused
//   --- Phase A (needs written approval): ONE login, then read-only pages ---
//   node scripts/video/record.js --scene 03-auth --allow-login  # the ONE login; saves .auth/state.json
//   node scripts/video/record.js --scene 04-dashboard --allow-login     # reuses the saved session, never logs in
//   --- Phase B / C (each needs its own written approval) ---
//   VIDEO_ALERT_TITLE="<exact title>" node scripts/video/record.js --scene 07-incident --allow-login --allow-writes
//   node scripts/video/record.js --scene 12b-assistant-ask --allow-login --allow-llm
const fs = require("fs");
const os = require("os");
const path = require("path");
const cfg = require("./config");
const { scenes } = require("./scenes");
const storyboard = require("./storyboard.json");
const { runScene } = require("./lib/scene-runner");
const ledger = require("./lib/ledger");

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const picked = args.flatMap((a, i) => (a === "--scene" ? [args[i + 1]] : []));
const phaseOf = (id) => (storyboard.scenes.find((s) => s.id === id) || {}).phase || "?";

function plan() {
  const unknown = picked.filter((id) => !scenes.some((s) => s.id === id));
  if (unknown.length) throw new Error(`Unknown scene(s): ${unknown.join(", ")} (see --list)`);
  const chosen = has("--all") ? scenes : scenes.filter((s) => picked.includes(s.id));
  const haveSession = fs.existsSync(cfg.authState);
  const loginsDone = ledger.count((e) => e.rule === "login" && e.event === "allowed");
  const run = [], skipped = [];
  for (const s of chosen) {
    const n = s.needs, prev = path.join(cfg.outDir, s.id, "manifest.json");
    if (n.login && new URL(cfg.baseUrl).port === "5173" && !has("--allow-hosted")) skipped.push([s.id, "SENTINEL_URL is the default :5173 frontend, which is wired to the HOSTED backend. Use the local stack (source scripts/video/local.env.sh) or pass --allow-hosted"]);
    else if (n.login && !has("--allow-login")) skipped.push([s.id, `Phase ${phaseOf(s.id)}: contacts the backend database; needs --allow-login (and written approval)`]);
    else if (n.freshLogin && loginsDone >= 1 && !has("--allow-relogin")) skipped.push([s.id, `the ONE login was already made (${loginsDone} in the ledger); a second login needs renewed approval (--allow-relogin)`]);
    else if (n.login && !n.freshLogin && !haveSession) skipped.push([s.id, "no saved session: record 03-auth first; this scene never logs in"]);
    else if (n.writes && !has("--allow-writes")) skipped.push([s.id, "Phase B: writes data; needs --allow-writes (and written approval)"]);
    else if (n.llm && !has("--allow-llm")) skipped.push([s.id, "Phase C: spends LLM quota; needs --allow-llm (and written approval)"]);
    else if (n.once && !has("--force") && fs.existsSync(prev) && JSON.parse(fs.readFileSync(prev)).ok) skipped.push([s.id, "already recorded; re-running would create a second record (--force)"]);
    else if (n.once && ledger.read().some((e) => e.event === "incident-created") && !ledger.read().some((e) => e.event === "incident-created" && e.incident_id === process.env.VIDEO_INCIDENT_ID)) skipped.push([s.id, "an incident was already created in an earlier run (UUID in recordings/ledger.jsonl): never create a second. Resume with VIDEO_INCIDENT_ID=<that UUID>"]);
    else run.push(s);
  }
  return { run, skipped };
}

(async () => {
  if (has("--auth-setup")) { console.error("--auth-setup was removed: the single login is the 03-auth scene (so there is exactly one login)."); process.exitCode = 1; return; }
  if (has("--list")) {
    for (const s of scenes) console.log(`${s.id.padEnd(20)} phase ${phaseOf(s.id).padEnd(4)} ${s.title}  [${Object.keys(s.needs).join(", ") || "public"}]`);
    return;
  }
  if (has("--selftest")) {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "sentinel-selftest-"));
    const m = await runScene({ id: "selftest", title: "Plumbing check (public login page, GET only)", needs: {}, allow: [],
      async run(c) {
        await c.page.goto(`${cfg.baseUrl}/login`, { waitUntil: "domcontentloaded" });
        await c.caption({ label: "SELFTEST", status: "OK", level: "info", lines: ["Self-test caption 1", "Second line"] }, { hold: 1000 });
        await c.page.waitForTimeout(1200);
        await c.caption(async (p) => ({ label: "SELFTEST", status: "CONTEXT", level: "ok", lines: [`Page title is "${await p.title()}"`, "Read from the page"] }), { hold: 1000 });
        await c.page.waitForTimeout(1200);
      } }, { outDir: out, shotsDir: path.join(out, "shots") });
    const vid = m.video && path.join(out, m.video);
    console.log(JSON.stringify({ ok: m.ok, out, video: vid, bytes: vid && fs.statSync(vid).size, captions: m.captions.length, durationMs: m.durationMs }, null, 2));
    process.exitCode = m.ok ? 0 : 1; return;
  }
  const { run, skipped } = plan();
  if (!run.length && !skipped.length) { console.log("Nothing selected. Use --list, --selftest, --scene <id> or --all."); return; }
  skipped.forEach(([id, why]) => console.log(`SKIP ${id}: ${why}`));
  if (has("--dry-run")) { console.log("Would record:", run.map((s) => s.id).join(", ") || "(none)"); return; }
  let failed = 0;
  for (const s of run) { // sequential on purpose: one Chromium at a time keeps RAM low
    console.log(`REC  ${s.id} ...`);
    const state = s.needs.login && !s.needs.freshLogin ? cfg.authState : undefined;
    const m = await runScene(s, { storageState: state });
    if (!m.ok) failed++;
    console.log(`${m.ok ? "OK  " : "FAIL"} ${s.id}  ${(m.durationMs / 1000).toFixed(1)} s  captions:${m.captions.length}${m.failure ? "  " + m.failure : ""}`);
    if (!m.ok) { console.log("Stopping after the first failure (no automatic retries)."); break; }
  }
  process.exitCode = failed ? 1 : 0;
})().catch((e) => { console.error(e.message); process.exit(1); });
