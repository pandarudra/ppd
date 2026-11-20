const cfg = require("../config");

// Sidebar link label and page <h1>, taken from navLinks.js and each page's <PageHeader title>.
const ROUTES = {
  "/dashboard": { nav: "Overview", h1: "Overview" },
  "/live": { nav: "Live stream", h1: "Live stream" },
  "/alerts": { nav: "Alerts", h1: "Alerts" },
  "/incidents": { nav: "Incidents", h1: "Incidents" },
  "/attack-paths": { nav: "Attack paths", h1: "Attack paths" },
  "/intelligence": { nav: "Threat intel", h1: "Threat intelligence" },
  "/models": { nav: "Models", h1: "Model performance" },
  "/events": { nav: "Events", h1: "Events" },
  "/analytics": { nav: "Analytics", h1: "Analytics" },
  "/assistant": { nav: "Assistant", h1: "Assistant" },
  "/users": { nav: "Users", h1: "Users" },
  "/settings": { nav: "Settings", h1: "Settings" },
  "/profile": { link: /^Profile:/, h1: "Profile" }, // reached from the header avatar link, not the sidebar
};

// Value shown on a MetricCard: the label <div> is immediately followed by the value <div> (MetricCard.jsx).
async function cardValue(page, label) {
  return page.evaluate((l) => {
    const el = [...document.querySelectorAll("div")].find((n) => n.children.length === 0 && n.textContent.trim() === l);
    const v = el && el.nextElementSibling;
    const t = v ? v.textContent.trim() : "";
    return t && t !== "…" ? t : null; // "…" = still loading
  }, label);
}

const heading = (page, name) => page.getByRole("heading", { level: 1, name, exact: true });

// Form login (labels from Login.jsx). Used ONLY by the 03-auth scene: the one analyst login. The password field stays masked.
async function login(ctx) {
  const { page } = ctx;
  await page.goto(`${cfg.baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").waitFor();
  await page.waitForTimeout(2500);                                   // let the viewer see the real login page first
  await page.getByLabel("Email").fill(cfg.email);
  await page.getByLabel("Password", { exact: true }).fill(cfg.password); // type=password: dots only, never revealed
  await ctx.cue("signin", { hold: 3200 });
  await page.waitForTimeout(3200);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard", { timeout: 20000 });
}

// Go to a protected page and PROVE we are on it (its <h1>), so a bounce to /login fails loudly instead of recording the wrong screen.
// Uses the sidebar (SPA navigation: keeps the WebSocket and the live event buffer) when it is on screen, else a full load.
// NEVER logs in: a missing or expired session stops the scene (a second login needs renewed approval).
async function open(ctx, route) {
  const { page } = ctx, r = ROUTES[route];
  const side = page.getByRole("navigation", { name: "Main" });
  if (r.link && await page.getByRole("link", { name: r.link }).count()) await page.getByRole("link", { name: r.link }).click();
  else if (r.nav && await side.count()) await side.getByRole("link", { name: r.nav, exact: true }).click();
  else await page.goto(`${cfg.baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  if (!(await heading(page, r.h1).waitFor({ state: "visible", timeout: 10000 }).then(() => true, () => false))) { // (isVisible() does not wait)
    if (page.url().includes("/login")) throw new Error("No valid saved session (bounced to /login). Not logging in again: renewed approval required.");
    throw new Error(`Expected <h1> "${r.h1}" on ${route}, got ${new URL(page.url()).pathname}`);
  }
}

// Short pacing pause after the page's network goes quiet (the app keeps a WebSocket open, so cap the wait).
async function settle(page, pace = 800) {
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(pace);
}

const dwell = (ctx, ms) => ctx.page.waitForTimeout(ms);
module.exports = { ROUTES, cardValue, heading, login, open, settle, dwell };
