/** @type {import('tailwindcss').Config} */
// Tokens from plan/DESIGN.md
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        "ink-deep": "#090909",
        canvas: "#ffffff",
        "surface-soft": "#fafafa",
        "surface-dark": "#171717",
        hairline: "#e5e5e5",
        "hairline-strong": "#d4d4d4",
        ink: "#000000",
        charcoal: "#525252",
        body: "#737373",
        mute: "#a3a3a3",
        "on-dark": "#ffffff",
        "on-dark-mute": "rgba(255,255,255,0.7)",
        "terminal-red": "#ff5f56",
        "terminal-yellow": "#ffbd2e",
        "terminal-green": "#27c93f",
      },
      fontFamily: {
        display: ["ui-rounded", '"SF Pro Rounded"', "Nunito", "system-ui", "-apple-system", "sans-serif"],
        sans: ["ui-sans-serif", "system-ui", "sans-serif", '"Apple Color Emoji"', '"Segoe UI Emoji"'],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        "display-xl": ["36px", { lineHeight: "1.11", fontWeight: "500" }],
        "display-lg": ["30px", { lineHeight: "1.2", fontWeight: "500" }],
        "heading-lg": ["24px", { lineHeight: "1.33", fontWeight: "600" }],
        "heading-md": ["20px", { lineHeight: "1.4", fontWeight: "500" }],
        "heading-sm": ["18px", { lineHeight: "1.56", fontWeight: "500" }],
        "body-md": ["16px", { lineHeight: "1.5" }],
        "body-sm": ["14px", { lineHeight: "1.43" }],
        "caption-sm": ["12px", { lineHeight: "1.33" }],
        "button-md": ["14px", { lineHeight: "1", fontWeight: "500" }],
      },
      borderRadius: { sm: "6px", md: "8px", lg: "12px" },
      spacing: { section: "88px" },
      maxWidth: { column: "720px", wide: "960px" },
    },
  },
  plugins: [],
};
