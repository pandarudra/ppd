#!/usr/bin/env node
// Builds the Hyperframes composition (and the SRT) from storyboard.json + recordings/<scene>/manifest.json.
// Recording and composition stay separate: this never opens a browser against Sentinel.
//
//   node scripts/video/compose.js --plan                          # which scenes exist / are missing
//   node scripts/video/compose.js --build [--only a,b] [--render draft|looks] [--name test]
// Needs:  source scripts/video/env.sh   (browser path for Hyperframes)
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const cfg = require("./config");
const sb = require("./storyboard.json");

const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const has = (f) => args.includes(f);
const only = opt("--only") ? opt("--only").split(",") : null;
const name = opt("--name", "Sentinel_Enterprise_Walkthrough");
const WORK = path.join(cfg.outDir, "_work"), PROJ = path.join(cfg.outDir, "_composition");
const SCALE = sb.output.width / cfg.viewport.width; // 1280 -> 1920 = 1.5
const CAPTION_OFFSET_MS = 0; // add a small constant here if captions look early/late after measuring skew
const sh = (cmd, a, o = {}) => { const r = spawnSync(cmd, a, { encoding: "utf8", ...o }); if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || "").slice(-400)}`); return r.stdout; };
// Run the Hyperframes CLI straight from its npx cache folder: `npx --offline hyperframes` stopped resolving after the npm
// metadata cache was cleaned, and a direct `node <bin>` needs no registry access. HF_BIN overrides the search.
function findHf() {
  if (process.env.HF_BIN) return process.env.HF_BIN;
  const root = path.join(require("os").homedir(), ".npm", "_npx");
  const hits = (fs.existsSync(root) ? fs.readdirSync(root) : []).map((d) => path.join(root, d, "node_modules", "hyperframes", "bin", "hyperframes.mjs")).filter(fs.existsSync);
  if (!hits.length) throw new Error("Hyperframes CLI not found in ~/.npm/_npx (set HF_BIN). It would need a network install.");
  return hits[0];
}
const HF = [process.execPath, findHf()];
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function inventory() {
  return sb.scenes.filter((s) => !only || only.includes(s.id)).map((s) => {
    if (s.kind === "composed") return { ...s, state: "composed" };
    const mf = path.join(cfg.outDir, s.id, "manifest.json");
    if (!fs.existsSync(mf)) return { ...s, state: "missing" };
    const m = JSON.parse(fs.readFileSync(mf));
    return { ...s, state: m.ok ? "recorded" : "failed", manifest: m };
  });
}

if (has("--plan")) {
  for (const s of inventory()) console.log(`${s.id.padEnd(20)} ${s.kind.padEnd(9)} phase ${s.phase.padEnd(4)} ${s.state}`);
  process.exit(0);
}
if (!has("--build")) { console.log("Use --plan or --build."); process.exit(0); }

// ---- 1. normalise each usable recording (trimmed to the scene clock: the WebM carries a static tail of a few seconds
//         while the recorder finalises, which is not part of the scene)
// (original comment:) normalise each usable recording to 1280x720 30 fps H.264 (ffmpeg, 2 threads, no audio)
fs.mkdirSync(WORK, { recursive: true });
const items = inventory().filter((s) => s.state === "recorded" || s.state === "composed");
const usable = new Set(items.map((s) => s.id));
const omitted = inventory().filter((s) => !usable.has(s.id)).map((s) => ({ id: s.id, why: s.state }));
for (const s of items.filter((x) => x.kind === "recorded")) {
  const src = path.join(cfg.outDir, s.manifest.video), dst = path.join(WORK, `${s.id}.mp4`);
  sh("ffmpeg", ["-v", "error", "-y", "-i", src, "-t", (s.manifest.durationMs / 1000 + 0.3).toFixed(2), "-vf", `fps=${sb.output.fps},scale=${cfg.viewport.width}:${cfg.viewport.height}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-an", "-threads", "2", dst]);
  s.mp4 = dst;
  s.dur = parseFloat(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", dst]));
}

// ---- 2. timeline: scenes back to back
let t = 0; const placed = [];
for (const s of items) {
  const dur = s.kind === "composed" ? (s.seconds[0] + s.seconds[1]) / 2 : s.dur;
  placed.push({ ...s, start: t, dur }); t += dur;
}
const total = t;
const dashboard = placed.find((p) => p.id === "04-dashboard");

// ---- 3. SRT + HTML
const ts = (sec) => { const ms = Math.round(sec * 1000), p = (n, w = 2) => String(n).padStart(w, "0"); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
const caps = []; // {start, dur, level, label, status, lines}
for (const p of placed) {
  if (p.kind === "composed") { const c = p.captions[0]; caps.push({ start: p.start + 1.5, dur: p.dur - 3, ...c }); continue; }
  for (const c of p.manifest.captions) {
    const start = p.start + (c.tStartMs + CAPTION_OFFSET_MS) / 1000, dur = Math.min(c.holdMs / 1000, p.start + p.dur - start - 0.2);
    if (dur > 0.5) caps.push({ start, dur, level: c.level, label: c.label, status: c.status, lines: c.lines });
  }
}
const srt = caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.start + c.dur)}\n${c.status}: ${c.lines[0]}\n${c.lines[1] || ""}`.trimEnd() + "\n").join("\n");
fs.writeFileSync(path.join(WORK, `${name}.srt`), srt);

const L = sb.levels;
let clips = "", masksHtml = "", capHtml = "", js = "";
placed.forEach((p, i) => {
  if (p.kind === "recorded") {
    clips += `<video id="v${i}" class="clip" src="media/${p.id}.mp4" muted playsinline data-start="${p.start.toFixed(3)}" data-duration="${p.dur.toFixed(3)}" data-track-index="0" style="position:absolute;left:0;top:0;width:1920px;height:1080px;object-fit:cover"></video>\n`;
    (p.manifest.masks || []).forEach((m, k) => {
      const st = p.start + m.tStartMs / 1000, en = m.tEndMs ? p.start + m.tEndMs / 1000 : p.start + p.dur;
      if (en - st > 0.2) masksHtml += `<div id="m${i}_${k}" class="clip mask" data-start="${st.toFixed(3)}" data-duration="${(en - st).toFixed(3)}" data-track-index="${20 + i * 10 + k}" style="left:${Math.round(m.x * SCALE) - 8}px;top:${Math.round(m.y * SCALE) - 6}px;width:${Math.round(m.w * SCALE) + 16}px;height:${Math.round(m.h * SCALE) + 12}px"></div>\n`;
    });
  }
});
// opening / closing title cards
const open = placed.find((p) => p.id === "01-opening"), close = placed.find((p) => p.id === "14-closing");
if (open) clips += `<div id="open" class="clip card" data-start="${open.start}" data-duration="${open.dur}" data-track-index="1"><div class="grid"></div><div class="dots" id="dots"></div><div class="brand" id="o-brand">SENTINEL</div><div class="tag" id="o-tag">Intelligent Threat Detection. Unified Security Operations.</div></div>\n`;
if (close) {
  if (dashboard) clips += `<video id="cv" class="clip" src="media/04-dashboard.mp4" muted playsinline data-start="${close.start}" data-duration="${close.dur}" data-media-start="${Math.max(0, dashboard.dur - close.dur).toFixed(2)}" data-track-index="1" style="position:absolute;left:0;top:0;width:1920px;height:1080px;object-fit:cover"></video>\n`;
  clips += `<div id="close" class="clip card ${dashboard ? "over" : ""}" data-start="${close.start}" data-duration="${close.dur}" data-track-index="2"><div class="brand" id="c-brand">SENTINEL</div><div class="tag" id="c-tag">From threat visibility to security response.</div></div>\n`;
}
caps.forEach((c, i) => {
  capHtml += `<div id="cap${i}" class="clip cap" data-start="${c.start.toFixed(3)}" data-duration="${c.dur.toFixed(3)}" data-track-index="3"><div class="st"><span class="dot" style="background:${L[c.level] || L.info}"></span>${esc(c.label)} <span class="sep">/</span> ${esc(c.status)}</div><div class="l1">${esc(c.lines[0])}</div><div class="l2">${esc(c.lines[1] || "")}</div></div>\n`;
  js += `tl.fromTo("#cap${i}",{opacity:0,y:14},{opacity:1,y:0,duration:0.45,ease:"power3.out"},${c.start.toFixed(3)});tl.to("#cap${i}",{opacity:0,y:-6,duration:0.4,ease:"power2.in"},${(c.start + c.dur - 0.4).toFixed(3)});\n`;
});
if (open) js += `tl.fromTo("#o-brand",{opacity:0,scale:1.08},{opacity:1,scale:1,duration:2.2,ease:"power3.out"},${open.start + 1});tl.fromTo("#o-tag",{opacity:0,y:12},{opacity:1,y:0,duration:1.2,ease:"power2.out"},${open.start + 3});tl.fromTo(".dots i",{opacity:0},{opacity:0.9,duration:1.5,stagger:0.03},${open.start + 0.3});tl.to("#open",{opacity:0,duration:0.8},${open.start + open.dur - 0.8});\n`;
if (close && dashboard) js += `tl.to("#cv",{opacity:0,duration:1.2,ease:"power1.in"},${close.start + close.dur - 1.2});\n`; // fade the footage out with the card, not under it
if (close) js += `tl.fromTo("#c-brand",{opacity:0,y:10},{opacity:1,y:0,duration:1.2},${close.start + 1.5});tl.fromTo("#c-tag",{opacity:0},{opacity:1,duration:1.2},${close.start + 2.7});tl.to("#close",{opacity:0,duration:1.2},${close.start + close.dur - 1.2});\n`;
// deterministic "global threat" dots for the opening (no randomness at render time)
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const dots = Array.from({ length: 70 }, () => `<i style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;background:${rnd() > 0.85 ? L.crit : rnd() > 0.5 ? L.info : L.ok}"></i>`).join("");

const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=1920, height=1080"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden;background:#0a0e18}
#root{position:relative;width:1920px;height:1080px;background:#0a0e18;font-family:Inter,"DejaVu Sans",system-ui,sans-serif}
.card{position:absolute;inset:0;background:radial-gradient(1200px 700px at 50% 45%,#13213a 0%,#0a0e18 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f0f2f5}
.card.over{background:rgba(6,10,20,.72)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(77,163,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(77,163,255,.07) 1px,transparent 1px);background-size:80px 80px}
.dots{position:absolute;inset:0}.dots i{position:absolute;width:7px;height:7px;border-radius:50%;box-shadow:0 0 14px currentColor;opacity:0}
.brand{font-size:132px;font-weight:800;letter-spacing:.32em;padding-left:.32em;position:relative}
.tag{font-size:34px;color:#9aa1b1;margin-top:26px;position:relative}
.cap{position:absolute;right:56px;bottom:48px;max-width:760px;padding:18px 24px;border-radius:16px;background:rgba(10,14,24,.84);border:1px solid rgba(255,255,255,.12);color:#f0f2f5;box-shadow:0 10px 40px rgba(0,0,0,.45)}
.cap .st{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9aa1b1}
.cap .sep{opacity:.5}.cap .dot{width:10px;height:10px;border-radius:50%;box-shadow:0 0 10px currentColor}
.cap .l1{font-size:28px;font-weight:700;margin-top:10px;line-height:1.25}.cap .l2{font-size:22px;color:#c3c8d3;margin-top:4px;line-height:1.3}
.mask{position:absolute;border-radius:8px;background:rgba(10,14,24,.55);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total.toFixed(3)}" data-width="1920" data-height="1080">
${clips}${masksHtml}${capHtml}</div>
<script>
const tl = gsap.timeline({ paused: true });
document.getElementById("dots") && (document.getElementById("dots").innerHTML = ${JSON.stringify(dots)});
${js}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body></html>`;

// ---- 4. project
if (!fs.existsSync(path.join(PROJ, "hyperframes.json"))) {
  fs.mkdirSync(path.dirname(PROJ), { recursive: true });
  sh(HF[0], [HF[1], "init", path.basename(PROJ), "--example", "blank", "--skip-skills", "--non-interactive", "--resolution", "1080p"], { cwd: path.dirname(PROJ) });
}
fs.mkdirSync(path.join(PROJ, "media"), { recursive: true });
for (const p of placed.filter((x) => x.mp4)) fs.copyFileSync(p.mp4, path.join(PROJ, "media", `${p.id}.mp4`));
fs.writeFileSync(path.join(PROJ, "index.html"), html);
fs.writeFileSync(path.join(WORK, `${name}.plan.json`), JSON.stringify({ totalSeconds: +total.toFixed(2), scenes: placed.map((p) => ({ id: p.id, start: +p.start.toFixed(2), dur: +p.dur.toFixed(2) })), omitted, captions: caps.length }, null, 2));
console.log(`composition: ${PROJ}\nscenes: ${placed.map((p) => p.id).join(", ")}\nomitted: ${omitted.map((o) => o.id + "(" + o.why + ")").join(", ") || "none"}\nduration: ${total.toFixed(1)} s, captions: ${caps.length}\nsrt: ${path.join(WORK, name + ".srt")}`);

const q = opt("--render");
if (q) {
  const out = path.join(WORK, `${name}.mp4`);
  console.log(sh(HF[0], [HF[1], "lint"], { cwd: PROJ }).split("\n").slice(-3).join("\n"));
  const r = spawnSync(HF[0], [HF[1], "render", "--quality", q, "--workers", opt("--workers", "1"), "-o", out], { cwd: PROJ, encoding: "utf8", env: process.env });
  console.log((r.stdout || "").split("\n").filter((l) => /rendered in|capture|Render complete|Error|✗/.test(l)).join("\n"));
  if (r.status !== 0) { console.error((r.stderr || "").slice(-600)); process.exit(1); }
  console.log("rendered:", out);
}
