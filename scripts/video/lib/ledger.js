// Append-only record of every NON-GET backend request the recorder allowed (and every one it blocked).
// It is the source for "database / Redis / Gemini operations performed" in the final report, and it makes the
// "exactly one login" rule enforceable across separate runs (a local file, so it is a guard rail, not a database fact).
const fs = require("fs");
const path = require("path");
const cfg = require("../config");

const file = () => path.join(cfg.outDir, "ledger.jsonl");

function append(entry) {
  fs.mkdirSync(cfg.outDir, { recursive: true });
  fs.appendFileSync(file(), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}
function read() {
  return fs.existsSync(file()) ? fs.readFileSync(file(), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
}
const count = (pred) => read().filter(pred).length;
module.exports = { append, read, count, file };
