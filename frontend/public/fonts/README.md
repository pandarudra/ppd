# Fonts

UI text uses **Gilroy** (free pack: Light 300 for body text, ExtraBold 800 for headings and buttons), falling back to Inter.

The font files live in `gilroy-font/Gilroy-FREE/` and are git-ignored: the Radomir Tinkov free EULA allows web use via
@font-face but forbids making the font available to third parties, so don't commit them to a public repo.

To get a SemiBold/Regular/Bold weight you would need the full commercial Gilroy family; add `@font-face` rules in
`src/index.css` for the extra weights.

The "Sentinel" wordmark uses Agrave Pro (`src/assets/fonts/`), and the landing headline uses Shantell Sans (npm package).
