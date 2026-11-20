// Situation captions: timestamped sidecar data, never burned into the recorded video (Hyperframes draws them).
// A caption is { label, status, level, lines: [line1, line2] }. `status` is the small uppercase operational status,
// `level` picks the indicator colour (info | ok | warn | crit). A plain string is also accepted.
class Captions {
  constructor(page, clock) { this.page = page; this.clock = clock; this.items = []; }

  async add(spec, { hold = 4000 } = {}) {
    let s = spec;
    if (typeof spec === "function") { try { s = await spec(this.page); } catch { s = null; } }
    if (!s) return null; // context unavailable: say nothing rather than something false
    if (typeof s === "string") s = { label: "SENTINEL", status: "INFO", level: "info", lines: [s] };
    const now = this.clock();
    // One caption slot (bottom-right): end the previous caption when the next one starts, never overlap.
    const prev = this.items[this.items.length - 1];
    if (prev && prev.tStartMs + prev.holdMs > now) prev.holdMs = Math.max(300, now - prev.tStartMs);
    const item = { tStartMs: now, holdMs: hold, label: s.label, status: s.status, level: s.level || "info", lines: s.lines, text: s.lines.join(" ") };
    this.items.push(item);
    return item;
  }

  toVtt() {
    const f = (ms) => { const s = ms / 1000, h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = (s % 60).toFixed(3).padStart(6, "0");
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${x}`; };
    return "WEBVTT\n\n" + this.items.map((c, i) => `${i + 1}\n${f(c.tStartMs)} --> ${f(c.tStartMs + c.holdMs)} line:90% position:95% align:end\n${c.status}: ${c.lines.join(" ")}\n`).join("\n");
  }
}
module.exports = { Captions };
