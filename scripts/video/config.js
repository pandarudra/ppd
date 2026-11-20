// Central settings for the Sentinel walkthrough recorder. Everything overridable from the environment.
const path = require("path");
const root = path.resolve(__dirname, "..", "..");

module.exports = {
  baseUrl: process.env.SENTINEL_URL || "http://localhost:5173",
  // Seeded demo analyst (documented in README). Override for any other account.
  email: process.env.SENTINEL_EMAIL || "analyst@sentinel.local",
  password: process.env.SENTINEL_PASSWORD || "analyst123",
  // 1280x720 is plenty for UI footage (~1/3 the pixels of 1080p); Hyperframes scales it up in the composition.
  // Must stay >= 768 px wide: below that the sidebar becomes a hidden drawer (md breakpoint in PageWrapper.jsx).
  viewport: { width: 1280, height: 720 },
  outDir: process.env.VIDEO_OUT || path.join(root, "recordings"), // git-ignored
  shotsDir: process.env.VIDEO_SHOTS || path.join(root, "shots"),   // git-ignored
  // Saved session (contains tokens!) so scenes reuse ONE login instead of one login per scene. Git-ignored.
  authState: process.env.VIDEO_AUTH_STATE || path.join(root, ".auth", "state.json"),
  defaultTimeout: 15000,
  captionPosition: "bottom-right", // stored only; Hyperframes draws the caption
};
