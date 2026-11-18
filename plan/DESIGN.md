---
version: alpha
name: Kaspersky Clean Security
description: A light, trustworthy marketing system with strong teal accents, airy spacing, and disciplined editorial typography.
colors:
  primary: "#00836f"
  secondary: "#1d1d1b"
  tertiary: "#444444"
  neutral: "#ffffff"
  surface: "#f7f7f7"
  on-surface: "#1d1d1b"
  muted: "#6f6f6f"
  border: "#d9d9d9"
  accent-soft: "#bfe9e1"
  error: "#d64545"
typography:
  headline-display:
    fontFamily: KasperskySansDisplay
    fontSize: 40px
    fontWeight: 300
    lineHeight: 48px
    letterSpacing: 0px
  headline-lg:
    fontFamily: KasperskySansDisplay
    fontSize: 32px
    fontWeight: 300
    lineHeight: 48px
    letterSpacing: 0px
  headline-md:
    fontFamily: KasperskySansDisplay
    fontSize: 25px
    fontWeight: 300
    lineHeight: 25px
    letterSpacing: 0px
  headline-sm:
    fontFamily: KasperskySansDisplay
    fontSize: 20px
    fontWeight: 300
    lineHeight: 24px
    letterSpacing: 0px
  body-lg:
    fontFamily: KasperskySansDisplay
    fontSize: 18px
    fontWeight: 300
    lineHeight: 28px
    letterSpacing: 0px
  body-md:
    fontFamily: KasperskySansDisplay
    fontSize: 16px
    fontWeight: 300
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: KasperskySansDisplay
    fontSize: 14px
    fontWeight: 300
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: KasperskySansDisplay
    fontSize: 24px
    fontWeight: 400
    lineHeight: 32px
    letterSpacing: 0px
  label-md:
    fontFamily: KasperskySansDisplay
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  label-sm:
    fontFamily: KasperskySansDisplay
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  nav:
    fontFamily: KasperskySansDisplay
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  eyebrow:
    fontFamily: KasperskySansDisplay
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  xs: 8px
  sm: 24px
  md: 40px
  lg: 56px
  xl: 120px
  gutter: 32px
  section: 80px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: 24px 32px
    size: 240px
    height: 64px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: 24px 32px
    size: 240px
    height: 64px
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.tertiary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 0px
    height: 24px
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 0px 16px
  tab-active:
    backgroundColor: "#2aa7f6"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 12px 24px
  tab-inactive:
    backgroundColor: "#b7dcf4"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 12px 24px
  top-nav:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.tertiary}"
    typography: "{typography.nav}"
    height: 64px
---

# Kaspersky Clean Security

## Overview

Kaspersky’s interface feels bright, restrained, and highly credible, with a marketing-led presentation that prioritizes reassurance over flash. The visual tone is professional and approachable: plenty of white space, a calm teal accent, and large editorial headlines give the site a confident but friendly voice. The layout is spacious and airy, allowing imagery and copy to breathe while keeping the messaging easy to scan.

## Colors

- **Primary (#00836f):** The brand teal used for core CTAs, active states, highlights, and links that need to feel trustworthy and decisive.
- **Secondary (#1d1d1b):** A near-black ink used for major headlines, strong body text, and structural UI elements that need maximum contrast.
- **Tertiary (#444444):** The main paragraph text color and subdued UI text; softer than the headline black but still highly readable.
- **Neutral (#ffffff):** The dominant background color, creating the clean, open canvas that defines the page.
- **Surface (#f7f7f7):** A very light off-white supporting panels, subtle sections, or low-emphasis blocks when separation is needed without heavy framing.
- **On-surface (#1d1d1b):** The text color for content placed on white cards, tabs, and other light surfaces.
- **Muted (#6f6f6f):** Secondary metadata and low-emphasis interface copy, such as supporting labels or compatibility text.
- **Border (#d9d9d9):** A soft divider tone for understated rules, separators, and structural boundaries.
- **Accent-soft (#bfe9e1):** A pale teal tint for inactive pills, soft backgrounds, and subtle branded emphasis.
- **Error (#d64545):** Reserved for validation and destructive states; not visually dominant in the observed marketing screens.

## Typography

Kaspersky Sans Display is the primary voice across the UI, with a light weight for headlines and body copy to keep the system refined and modern. Headlines are set in large, clean display sizes with generous line heights, giving the page its editorial feel; the biggest titles use `headline-display` at 40px/48px, while supporting section titles step down through `headline-lg`, `headline-md`, and `headline-sm`. Body text remains calm and highly readable in `body-md` and `body-sm`, while labels and navigation use `label-md`, `label-lg`, and `nav` with regular weight for clarity.

Letter spacing is mostly neutral, but small uppercase-style utility labels and compact interface text may benefit from slight spacing only when needed for legibility. The overall typographic rhythm is smooth and low-contrast rather than bold or condensed, which reinforces the brand’s measured, reassuring tone.

## Layout

The composition uses a wide, desktop-first marketing grid with generous margins and large content blocks anchored left and right. Sections feel centered within a broad canvas rather than constrained to a narrow column, and whitespace is used as a structural element to separate hero content, imagery, and award messaging.

Spacing follows a clear modular rhythm based on 8px increments, with larger jumps at 24px, 40px, 56px, and 120px for major section breaks. Cards and callouts stay minimally padded, while hero text blocks rely more on vertical breathing room than on boxed containers. The result is spacious and uncluttered, with strong hierarchy achieved through distance instead of dense framing.

## Elevation & Depth

Depth is subtle and mostly created through soft shadows, tonal contrast, and image masking rather than heavy material layering. The page uses a light shadow language for cards and top navigation, but most elements remain flat to preserve clarity and trust.

Shadow treatment should stay understated: `sm` for small UI lift, `lg` for larger content cards, and `md` for broader ambient separation when needed. Avoid deep or dramatic elevation; the design leans on white space, crisp edges, and imagery to create focus.

## Shapes

The shape language is soft but disciplined, with small radii on most interactive surfaces and stronger rounding used only for pill-style tabs. Buttons and cards favor `rounded.sm` for a precise, technical feel, while tabs use `rounded.full` to read as friendly capsules.

Overall, the system balances security and approachability: rounded enough to feel modern, but not so soft that it loses authority. Large media blocks can use custom clipping or masks, but the underlying component radius should remain modest.

## Components

Buttons are prominent and generously sized. Use `button-primary` for the main action: solid teal background, white text, 240px minimum width, 64px height, and 24px/32px padding. `button-secondary` is an outlined alternative with transparent fill and dark text/border, matching the same size and weight as the primary button. `button-link` is reserved for inline actions such as renewals or contextual navigation; it should remain text-only, underlined, and visually quiet.

Tabs and segmented controls should use `tab-active` and `tab-inactive`. Active tabs are saturated blue-teal with dark text; inactive tabs are a lighter soft blue with the same pill shape. Keep tab labels large and legible, with enough horizontal padding to feel touch-friendly.

Cards should use the `card` token: white surface, subtle shadow, and small radius. They should avoid ornamental borders unless separation is required, and internal padding should remain minimal for a clean content-led presentation.

Top navigation should use `top-nav` on a white background with compact, readable text. Utility icons and account controls should be lightweight and unobtrusive, with teal reserved for the most important account or action area.

Inputs are not prominent in the observed screen, but if added they should follow the same visual language: white or surface backgrounds, modest borders, and square-to-soft rounding rather than fully pill-shaped fields. Keep focus states clear and brand-consistent, using teal outlines or fills rather than heavy shadows.

## Do's and Don'ts

- Do keep layouts airy and image-led, with substantial whitespace around major content blocks.
- Do use the teal primary color sparingly for actions, active states, and strategic emphasis.
- Do maintain light typography weights and generous line heights for the editorial feel.
- Do prefer small radii on core UI and reserve full rounding for tabs or chips.
- Don't introduce dark backgrounds or high-contrast dramatic gradients that fight the calm brand tone.
- Don't overuse heavy shadows, thick borders, or dense card grids.
- Don't make buttons overly small or overly decorative; they should stay clear, large, and functional.
- Don't switch to a condensed or highly geometric font style; keep Kaspersky Sans Display feeling open and readable.
