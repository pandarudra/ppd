// Offline test of the request guard against a throwaway LOCAL mock API (127.0.0.1:5999). Never touches Sentinel's backend.
//   VIDEO_OUT=$(mktemp -d) node scripts/video/test/guard.test.js
const http = require("http");
const assert = require("assert");
if (!process.env.VIDEO_OUT) { console.error("Set VIDEO_OUT to a temp dir so the real ledger is untouched."); process.exit(2); }
const { runScene } = require("../lib/scene-runner");
const ledger = require("../lib/ledger");
const cfg = require("../config");

const hits = [];
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Headers", "*"); res.setHeader("Access-Control-Allow-Methods", "*");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  hits.push(`${req.method} ${req.url}`);
  res.writeHead(req.url.endsWith("/incidents") ? 201 : 200, { "content-type": "application/json" });
  res.end(JSON.stringify({ incident_id: "11111111-2222-3333-4444-555555555555", ok: true }));
});

server.listen(5999, "127.0.0.1", async () => {
  const call = (page, method, path) => page.evaluate(async ([m, p]) => { try { const r = await fetch(`http://127.0.0.1:5999${p}`, { method: m, headers: { "content-type": "application/json" }, body: m === "GET" ? undefined : "{}" }); return r.status; } catch { return "blocked"; } }, [method, path]);
  const UUID = "11111111-2222-3333-4444-555555555555";
  const scene = {
    id: "guardtest", title: "guard test", needs: {},
    allow: [
      { id: "login", method: "POST", path: /^\/api\/v1\/auth\/login$/, max: 1 },
      { id: "create-incident", method: "POST", path: /^\/api\/v1\/incidents$/, max: 1 },
      { id: "update-incident", method: "PUT", path: /^\/api\/v1\/incidents\/[0-9a-f-]{36}$/, max: 1, when: (p, st) => !!st.incidentId && p === `/api/v1/incidents/${st.incidentId}` },
    ],
    async run(c) {
      await c.page.goto(`${cfg.baseUrl}/`, { waitUntil: "domcontentloaded" });
      const r = {};
      r.get = await call(c.page, "GET", "/api/v1/alerts");
      r.login1 = await call(c.page, "POST", "/api/v1/auth/login");
      r.login2 = await call(c.page, "POST", "/api/v1/auth/login");                     // 2nd login must be blocked
      r.assistant = await call(c.page, "POST", "/api/v1/assistant/analyze");           // no rule: blocked
      r.putEarly = await call(c.page, "PUT", `/api/v1/incidents/${UUID}`);             // before creation: blocked
      r.create = await call(c.page, "POST", "/api/v1/incidents");
      await c.page.waitForTimeout(300);
      r.putOther = await call(c.page, "PUT", "/api/v1/incidents/99999999-2222-3333-4444-555555555555"); // wrong UUID: blocked
      r.putRight = await call(c.page, "PUT", `/api/v1/incidents/${UUID}`);             // the created UUID: allowed once
      r.putAgain = await call(c.page, "PUT", `/api/v1/incidents/${UUID}`);             // 2nd change: blocked
      r.del = await call(c.page, "DELETE", `/api/v1/incidents/${UUID}`);               // never allowed
      c.mark("results", r);
    },
  };
  const m = await runScene(scene);
  server.close();
  const r = m.events.find((e) => e.name === "results");
  console.log(JSON.stringify(r, null, 2));
  assert.strictEqual(r.get, 200); assert.strictEqual(r.login1, 200); assert.strictEqual(r.login2, "blocked");
  assert.strictEqual(r.assistant, "blocked"); assert.strictEqual(r.putEarly, "blocked"); assert.strictEqual(r.create, 201);
  assert.strictEqual(r.putOther, "blocked"); assert.strictEqual(r.putRight, 200); assert.strictEqual(r.putAgain, "blocked"); assert.strictEqual(r.del, "blocked");
  assert.strictEqual(m.incidentId, UUID, "incident UUID captured from the guarded response");
  assert.strictEqual(m.ok, false, "scene must be marked failed when unapproved requests were blocked");
  assert.deepStrictEqual(hits.filter((h) => !h.startsWith("GET")), ["POST /api/v1/auth/login", "POST /api/v1/incidents", "PUT /api/v1/incidents/" + UUID], "only the allowed writes reached the server");
  assert.strictEqual(ledger.count((e) => e.rule === "login" && e.event === "allowed"), 1);
  console.log("GUARD TEST PASSED: blocked =", m.requests.blocked.length, "| allowed =", m.requests.allowed.map((a) => a.rule).join(","));
});
