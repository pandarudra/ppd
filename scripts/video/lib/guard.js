// Browser-level request guard. Everything the page sends to the backend API is checked here, BEFORE it leaves the browser:
//   GET/HEAD/OPTIONS  -> allowed (reads)
//   anything else     -> allowed only if a rule in the scene's `allow` list matches, within its `max` count
//   otherwise         -> aborted, recorded as a violation (the scene then fails)
// This is what makes "read-only", "exactly one login", "exactly one incident" and "exactly one Gemini request" enforceable
// even if a selector goes wrong. It does not replace the approvals: a rule only exists if that phase was approved.
const ledger = require("./ledger");

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

async function installGuard(context, { sceneId, allow = [], state }) {
  const used = {};
  const report = { allowed: [], blocked: [] };

  await context.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const method = req.method();
    const pathname = new URL(req.url()).pathname;
    if (SAFE.has(method)) return route.continue();

    const rule = allow.find((r) => r.method === method && r.path.test(pathname) && (!r.when || r.when(pathname, state)));
    const n = rule ? (used[rule.id] = (used[rule.id] || 0) + 1) : 0;
    if (rule && (rule.max === undefined || n <= rule.max)) {
      report.allowed.push({ rule: rule.id, method, path: pathname });
      ledger.append({ scene: sceneId, event: "allowed", rule: rule.id, method, path: pathname });
      return route.continue();
    }
    report.blocked.push({ method, path: pathname, reason: rule ? `rule "${rule.id}" max ${rule.max} exceeded` : "no matching allow rule" });
    ledger.append({ scene: sceneId, event: "BLOCKED", method, path: pathname, reason: rule ? "max exceeded" : "not allowed" });
    return route.abort("blockedbyclient");
  });

  // Log the outcome (status only, never bodies or tokens) of requests that were allowed through.
  context.on("response", async (res) => {
    const req = res.request();
    if (SAFE.has(req.method()) || !/\/api\/v1\//.test(req.url())) return;
    const pathname = new URL(req.url()).pathname;
    ledger.append({ scene: sceneId, event: "response", method: req.method(), path: pathname, status: res.status() });
    if (req.method() === "POST" && pathname === "/api/v1/incidents" && res.status() === 201 && state) {
      try { state.incidentId = (await res.json()).incident_id; ledger.append({ scene: sceneId, event: "incident-created", incident_id: state.incidentId }); } catch {}
    }
  });
  return report;
}
module.exports = { installGuard };
