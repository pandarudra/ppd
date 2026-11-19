/** @type {import('tailwindcss').Config} */
// Tokens from plan/DESIGN.md (dark canvas, two accents: green = act, blue = navigate/live).
// Legacy token names are kept so existing components pick up the theme.
// Deviation: `mute` is lighter than DESIGN's faint #53575f, which fails contrast for text on #141415.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#141415",
        surface: "#2e3035",
        "surface-soft": "#2e3035",
        "surface-dark": "#2e3035",
        panel: "#1b1c1f",
        hairline: "#2d2f33",
        "hairline-strong": "#42454c",
        ink: "#f0f2f5",
        charcoal: "#c3c8d3",
        body: "#9aa1b1",
        mute: "#6b7181",
        primary: "#00b24b",
        "primary-press": "#009a40",
        secondary: "#0075ff",
        "on-dark": "#ffffff",
        "on-dark-mute": "rgba(255,255,255,0.7)",
        // Data colors (severity / threat), never used as chrome.
        sev: { critical: "#ff4d4f", high: "#ff8a3d", medium: "#f5c542", low: "#4da3ff", info: "#6b7181" },
      },
      fontFamily: {
        display: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        "display-xl": ["33px", { lineHeight: "1.1", fontWeight: "800" }],
        "display-lg": ["28px", { lineHeight: "1.15", fontWeight: "800" }],
        "heading-lg": ["22px", { lineHeight: "1.2", fontWeight: "800" }],
        "heading-md": ["20px", { lineHeight: "1.2", fontWeight: "800" }],
        "heading-sm": ["16px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-sm": ["13px", { lineHeight: "1.3", fontWeight: "600" }],
        "caption-sm": ["12px", { lineHeight: "1.3", fontWeight: "600" }],
        "button-md": ["14px", { lineHeight: "1", fontWeight: "600" }],
      },
      borderRadius: { xs: "4px", sm: "6px", md: "8px", lg: "10px", xl: "12px", card: "16px" },
      spacing: { section: "64px" },
      maxWidth: { column: "720px", wide: "1440px" },
      keyframes: {
        ping2: { "0%": { transform: "scale(1)", opacity: "0.7" }, "100%": { transform: "scale(3.2)", opacity: "0" } },
        rise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
        flash: { "0%": { backgroundColor: "rgba(0,117,255,0.25)" }, "100%": { backgroundColor: "transparent" } },
      },
      animation: { ping2: "ping2 2.4s ease-out infinite", rise: "rise .5s ease-out both", flash: "flash 1.6s ease-out" },
    },
  },
  plugins: [],
};
