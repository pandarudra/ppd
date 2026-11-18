// plan/DESIGN.md has no semantic palette: severity is carried by ink weight + the label text.
const SEVERITY_CHIP = {
  CRITICAL: "bg-primary text-on-dark",
  HIGH: "bg-canvas text-ink border border-ink",
  MEDIUM: "bg-canvas text-charcoal border border-hairline-strong",
  LOW: "bg-surface-soft text-body",
  INFO: "bg-surface-soft text-mute",
};

export function severityChipClass(severity) {
  return SEVERITY_CHIP[severity] || "bg-surface-soft text-mute";
}

export const SEVERITY_HEX = {
  CRITICAL: "#000000",
  HIGH: "#525252",
  MEDIUM: "#737373",
  LOW: "#a3a3a3",
  INFO: "#d4d4d4",
};
