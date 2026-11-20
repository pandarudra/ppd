// Scene registry for the 14-scene storyboard (storyboard.json holds the captions and the phase of each scene).
// Selectors are role/label/text based and were written against the frontend SOURCE. Only 02-landing has been run;
// every authenticated scene is STATIC-REVIEW ONLY until Phase A is approved and they are runtime-validated.
//
// needs:  login (Phase A) | writes (Phase B) | llm (Phase C) | traffic (looks best with simulator traffic)
//         freshLogin = records the real login form; once = refuse a second run
// allow:  the ONLY non-GET backend requests this scene may make (enforced in the browser by lib/guard.js)
const cfg = require("../config");
const { heading, login, open, settle, dwell } = require("../lib/helpers");

const REFRESH = { id: "refresh", method: "POST", path: /^\/api\/v1\/auth\/refresh$/, max: 3 }; // only after the 15-min token expires; ledgered
const ALERT_TITLE = process.env.VIDEO_ALERT_TITLE || ""; // REQUIRED for the Phase B incident scene: the approved demo alert

const rows = (page) => page.getByRole("main").getByRole("row");               // row 0 is the header row
const firstRow = (page) => rows(page).nth(1);
const dialog = (page, name) => page.getByRole("dialog", { name });
const group = (page, name) => page.getByRole("group", { name });
async function press(page, groupName, label) { // segmented/chip button; verify it registered
  const b = group(page, groupName).getByRole("button", { name: label, exact: true });
  await b.click();
  await page.waitForFunction((el) => el.getAttribute("aria-pressed") === "true", await b.elementHandle());
  return b;
}

const scenes = [
  { id: "02-landing", title: "Platform landing page", needs: {}, allow: [],
    async run(c) {
      const { page } = c;
      await page.goto(`${cfg.baseUrl}/`, { waitUntil: "domcontentloaded" });
      await heading(page, "See every attack. Stop it faster.").waitFor();
      await settle(page, 1500);
      await c.cue("hero", { hold: 5500 });
      await dwell(c, 7000);
      await page.getByRole("heading", { level: 2, name: "Everything an analyst reaches for" }).scrollIntoViewIfNeeded();
      await c.cue("capabilities", { hold: 5000 });
      await dwell(c, 6000);
      await page.getByRole("heading", { level: 2, name: "From log line to response" }).scrollIntoViewIfNeeded();
      await dwell(c, 6000);
    } },

  { id: "03-auth", title: "Authentication (the ONE login)", needs: { login: true, freshLogin: true }, saveSession: true,
    allow: [{ id: "login", method: "POST", path: /^\/api\/v1\/auth\/login$/, max: 1 }],
    async run(c) {
      await login(c);                                  // fills the form, cue "signin", submits
      await heading(c.page, "Overview").waitFor();     // success is verified BEFORE the caption claims it
      await c.cue("signedin", { hold: 4500 });
      await settle(c.page, 1500);
      await dwell(c, 6500);
    } },

  { id: "04-dashboard", title: "SOC dashboard", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/dashboard");
      await page.getByText("Events (24h)", { exact: true }).waitFor();
      await page.waitForFunction(() => ![...document.querySelectorAll("div")].some((n) => n.children.length === 0 && n.textContent.trim() === "…"), null, { timeout: 12000 });
      await settle(page, 1500);
      await c.cue("posture", { hold: 5500 });
      await dwell(c, 8500);
      await page.getByRole("heading", { level: 2, name: "Attack origins" }).scrollIntoViewIfNeeded();
      await c.cue("map", { hold: 5500 });
      await dwell(c, 10000);
      await page.getByText("Live alert feed", { exact: true }).scrollIntoViewIfNeeded();
      await dwell(c, 8000);
      await page.getByRole("heading", { level: 1, name: "Overview" }).scrollIntoViewIfNeeded();
      await press(page, "Mode", "History");
      await press(page, "Time range", "7d");
      await c.cue("history", { hold: 6500 });
      await dwell(c, 9000);
    } },

  { id: "05a-events", title: "Security events table", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/events");
      await firstRow(page).waitFor();
      await c.cue("table", { hold: 5500 });
      await dwell(c, 6000);
      // Filter by the source IP of the first existing row (read from the page, not invented). GET only.
      const ip = (await firstRow(page).getByRole("cell").nth(1).innerText()).trim();
      if (ip && ip !== "—") {
        await page.getByLabel("Source IP", { exact: true }).fill(ip);
        await firstRow(page).waitFor();
        await dwell(c, 2500);
        await page.getByRole("button", { name: "Clear", exact: true }).click();
        await firstRow(page).waitFor();
      }
      await firstRow(page).click();
      const d = dialog(page, "Event detail");
      await d.getByText(/raw log/i).first().waitFor();   // the card title is upper-cased by CSS, so match case-insensitively
      await c.cue("detail", { hold: 5500 });
      await dwell(c, 8000);                           // NEVER press "Explain & next steps" (Gemini)
      await d.getByRole("button", { name: "Close", exact: true }).click();
      const next = page.getByRole("button", { name: "Next page", exact: true });
      if (await next.isEnabled()) { await next.click(); await dwell(c, 2000); await page.getByRole("button", { name: "Previous page", exact: true }).click(); }
      await dwell(c, 1500);
    } },

  { id: "05b-live", title: "Live event stream", needs: { login: true, traffic: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/live");
      await dwell(c, 9000);                           // listen for WebSocket events
      const n = await page.getByRole("main").locator("tbody tr").count();
      c.mark("live-rows", { rows: n });
      await c.cue(n ? "live" : "standby", { hold: 6000 }); // 'LIVE TELEMETRY' only if rows really arrived
      await dwell(c, 7000);
    } },

  { id: "06-alerts", title: "Alert investigation", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/alerts");
      await firstRow(page).waitFor();
      await c.cue("queue", { hold: 6500 });
      await dwell(c, 8000);
      const sev = await press(page, "Severity", "critical");  // filters are read-only
      await dwell(c, 6000);
      await sev.click();                                      // clicking the active chip clears it
      const high = await press(page, "Severity", "high");
      await dwell(c, 4000);
      await high.click();
      const st = await press(page, "Status", "open");
      await dwell(c, 6000);
      await st.click();
      await firstRow(page).waitFor();
      await firstRow(page).click();                           // a table ROW, not a chip
      const d = dialog(page, "Alert detail");
      await d.getByRole("heading", { level: 3 }).first().waitFor();
      await c.cue("detail", { hold: 7000 });
      await dwell(c, 14000);                                   // NEVER: Status, Assign, Comment, Open incident, Explain with AI
      await d.getByRole("button", { name: "Close", exact: true }).click();
    } },

  { id: "07-incident", title: "Incident management", needs: { login: true, writes: true, once: true },
    allow: [REFRESH,
      // creation is allowed exactly once, and NOT AT ALL when resuming with an existing incident (VIDEO_INCIDENT_ID)
      { id: "create-incident", method: "POST", path: /^\/api\/v1\/incidents$/, max: process.env.VIDEO_INCIDENT_ID ? 0 : 1 },
      // the ONE status change may only target the approved incident UUID
      { id: "update-incident", method: "PUT", path: /^\/api\/v1\/incidents\/[0-9a-f-]{36}$/, max: 1, when: (p, st) => !!st.incidentId && p === `/api/v1/incidents/${st.incidentId}` }],
    async run(c) {
      const { page, state } = c;
      const resume = process.env.VIDEO_INCIDENT_ID || "";
      let alertTitle = null;
      if (resume) {
        // RESUME: the incident was already created in an earlier run; never create another. Only the approved UUID may be changed.
        state.incidentId = resume;
        await open(c, "/incidents");
      } else {
        // The approved demo alert: an exact title (VIDEO_ALERT_TITLE, must match exactly one row), or, only with the explicit
        // VIDEO_USE_FIRST_ALERT=1 (local disposable data, where titles repeat), the newest alert at the top of the list.
        if (!ALERT_TITLE && process.env.VIDEO_USE_FIRST_ALERT !== "1") throw new Error("Phase B needs VIDEO_ALERT_TITLE (exact title) or VIDEO_USE_FIRST_ALERT=1");
        await open(c, "/alerts");
        await firstRow(page).waitFor();
        if (ALERT_TITLE) {
          const row = rows(page).filter({ hasText: ALERT_TITLE });
          if (await row.count() !== 1) throw new Error(`expected exactly 1 alert row matching the approved title, found ${await row.count()}`);
          await row.first().click();
        } else {
          await firstRow(page).click();
        }
        const d = dialog(page, "Alert detail");
        alertTitle = (await d.getByRole("heading", { level: 3 }).first().innerText()).trim();
        await c.cue("open", { hold: 4000 });
        await dwell(c, 3500);
        await d.getByRole("button", { name: "Open incident", exact: true }).click();                 // WRITE 1 of 2
        await d.getByRole("button", { name: "Linked to incident", exact: true }).waitFor();
        if (!state.incidentId) throw new Error("incident created but its UUID was not captured: STOP, do not retry");
        c.mark("incident-created", { incidentId: state.incidentId });
        await dwell(c, 2000);
        await d.getByRole("button", { name: "Close", exact: true }).click();
        await open(c, "/incidents");
      }
      // Select the incident and VERIFY it is the approved UUID (from the request the workspace makes) before anything is changed.
      const list = page.getByRole("main").locator("button[aria-current]");
      await list.first().waitFor();
      const item = alertTitle ? list.filter({ hasText: `Incident: ${alertTitle}` }).first() : list.first();
      const opened = page.waitForRequest((r) => /\/api\/v1\/incidents\/[0-9a-f-]{36}$/.test(new URL(r.url()).pathname));
      await item.click();
      const openedId = new URL((await opened).url()).pathname.split("/").pop();
      if (openedId !== state.incidentId) throw new Error(`opened incident ${openedId} is not the approved ${state.incidentId}: STOP`);
      c.mark("incident-verified", { incidentId: openedId });
      await page.locator("#incident-status").waitFor();
      if (resume) await c.cue("open", { hold: 4500 });
      await dwell(c, 3000);
      await page.getByRole("tab", { name: "Timeline", exact: true }).click();
      await page.getByText("Incident created from", { exact: false }).waitFor();
      await c.cue("timeline", { hold: 5500 });
      await dwell(c, 7000);
      await page.locator("#incident-status").selectOption("investigating");                       // WRITE 2 of 2 (guard checks the UUID)
      await page.getByText("Status changed from open to investigating", { exact: false }).waitFor();
      await c.cue("status", { hold: 5500 });              // only AFTER the timeline shows the change
      await dwell(c, 7000);
    } },

  { id: "08-attack-paths", title: "Attack path and kill chain", needs: { login: true, traffic: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/attack-paths");
      await page.getByRole("heading", { level: 2, name: "Attacker kill chains" }).waitFor();
      await settle(page, 1500);
      if (await page.getByText("No attackers in this window.").count()) {
        await press(page, "Time range", "7d"); await settle(page, 1500);
        if (await page.getByText("No attackers in this window.").count()) throw new Error("no attack-path data in 24h or 7d: omit this scene or record it after Phase B");
      }
      await c.cue("flow", { hold: 7000 });
      await dwell(c, 10000);
      await press(page, "Time range", "7d"); await settle(page, 1500); await dwell(c, 5000);
      await page.getByRole("heading", { level: 2, name: "Attacker kill chains" }).scrollIntoViewIfNeeded();
      await dwell(c, 9000);
    } },

  { id: "09-intel", title: "Threat intelligence", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/intelligence");
      await firstRow(page).waitFor();
      await c.cue("list", { hold: 6000 });
      await dwell(c, 8000);
      // Look up the first EXISTING indicator (columns: Type, Indicator). Read-only GET. NEVER use "Add indicator".
      const cells = firstRow(page).getByRole("cell");
      const type = (await cells.nth(0).innerText()).trim().toLowerCase();
      const value = (await cells.nth(1).innerText()).trim();
      await page.getByLabel("Indicator type", { exact: true }).selectOption(type);
      await page.getByLabel("Indicator", { exact: true }).fill(value);
      await page.getByRole("button", { name: "Look up", exact: true }).click();
      await page.getByRole("status").filter({ hasText: /Known threat|Not found/ }).waitFor();
      await c.cue("lookup", { hold: 5500 });
      await dwell(c, 8000);
      await rows(page).last().scrollIntoViewIfNeeded(); await dwell(c, 3000);
      await page.getByRole("heading", { level: 1, name: "Threat intelligence" }).scrollIntoViewIfNeeded(); await dwell(c, 2000);
    } },

  { id: "10-analytics", title: "Analytics", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/analytics");
      await page.getByText("Trend:", { exact: false }).waitFor();
      await settle(page, 1200);
      await c.cue("trends", { hold: 6500 });
      await dwell(c, 6500);
      await press(page, "Metric", "Events"); await page.getByText("Trend:", { exact: false }).waitFor(); await dwell(c, 5000);
      await press(page, "Period", "14d"); await dwell(c, 4000);
      await press(page, "Period", "30d"); await dwell(c, 8000);
    } },

  { id: "11-models", title: "ML models", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/models");
      await page.getByRole("heading", { level: 2, name: "Diagnostics" }).waitFor();
      await settle(page, 1500);
      await c.cue("metrics", { hold: 6500 });
      await dwell(c, 8500);
      await press(page, "Model", "Compare all");               // required: fails loudly if curves are missing
      await c.cue("compare", { hold: 6500 });
      await dwell(c, 10000);
      await page.getByRole("heading", { level: 3, name: "Feature importance" }).scrollIntoViewIfNeeded(); await dwell(c, 5000);
      await page.getByRole("heading", { level: 2, name: "Diagnostics" }).scrollIntoViewIfNeeded();
      await press(page, "Model", "random forest"); await dwell(c, 6000);
      // Client-side PNG export: builds a file in the browser, sends nothing to the backend.
      const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Evaluation figure", exact: true }).click()]);
      c.mark("figure-downloaded", { file: dl.suggestedFilename() });
      await c.cue("export", { hold: 4500 });
      await dwell(c, 5000);
    } },

  { id: "12-assistant", title: "Assistant (view only)", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/assistant");
      await page.getByLabel("Question", { exact: true }).waitFor();
      await c.cue("view", { hold: 5000 });
      await dwell(c, 9000);                                    // NEVER click a suggestion chip
    } },

  { id: "12b-assistant-ask", title: "Assistant (one approved request)", needs: { login: true, llm: true },
    allow: [REFRESH, { id: "assistant-analyze", method: "POST", path: /^\/api\/v1\/assistant\/analyze$/, max: 1 }],
    async run(c) {
      const { page } = c;
      await open(c, "/assistant");
      const box = page.getByLabel("Question", { exact: true });
      await box.fill("Summarize recent alerts");
      await c.cue("ask", { hold: 3500 });
      const [res] = await Promise.all([page.waitForResponse((r) => r.url().endsWith("/api/v1/assistant/analyze"), { timeout: 90000 }), box.press("Enter")]);
      const body = await res.json();
      c.mark("assistant-response", { status: res.status(), model_used: body.model_used });
      if (res.status() !== 200 || body.model_used === "offline" || String(body.analysis).startsWith("[OFFLINE MODE]")) throw new Error("assistant returned the offline fallback or an error: scene must be omitted");
      await dwell(c, 13000);                                   // time to read the answer
    } },

  { id: "13a-users", title: "User administration (admin, view only)", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/users");
      await firstRow(page).waitFor();
      // identifiers are blurred in the composition; fail loudly if none can be located
      const emails = page.getByRole("main").locator("tbody tr td:nth-child(2)");
      const names = page.getByRole("main").locator("tbody tr td:nth-child(1)");
      let n = 0;
      for (const loc of [emails, names]) for (let i = 0; i < await loc.count(); i++) { await c.mask(loc.nth(i), `users-${n++}`); }
      if (!n) throw new Error("no user cells found to mask");
      await c.cue("users", { hold: 5500 });
      await dwell(c, 11000);                                   // NEVER: New user form, role selects, Deactivate/Activate
      c.unmask("users");
    } },

  { id: "13-profile-settings", title: "Profile and settings", needs: { login: true }, allow: [REFRESH],
    async run(c) {
      const { page } = c;
      await open(c, "/profile");
      await page.getByText("Your account and security settings.", { exact: false }).waitFor();
      // Identifiers are blurred in the composition, so record where they are. Fail loudly if none are found:
      // an unmasked e-mail or API URL must never reach the final video.
      const maskRows = async (labels, tag) => {
        let n = 0;
        for (const label of labels) { const r = page.getByRole("main").locator("li").filter({ hasText: new RegExp(`^${label}`) }); if (await r.count()) { await c.mask(r.first(), `${tag}-${label}`); n++; } }
        if (!n) throw new Error(`could not locate any sensitive row to mask on ${tag}`);
      };
      await maskRows(["Email", "Role"], "profile");
      await c.cue("profile", { hold: 5000 });
      await dwell(c, 10000);                                   // NEVER: Sign out, Update password
      c.unmask("profile");                                     // stop blurring before the next page
      await open(c, "/settings");
      await maskRows(["Name", "Email", "API"], "settings");
      await c.cue("settings", { hold: 5000 });
      await dwell(c, 10000);                                   // NEVER: "Detect again" (browser location + third-party IP lookup)
    } },
];
module.exports = { scenes };
