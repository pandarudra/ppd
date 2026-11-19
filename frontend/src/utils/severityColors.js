// Severity is data, not chrome: it gets its own tinted chip + hex for charts/map.
const SEVERITY_CHIP = {
  CRITICAL: "bg-sev-critical/15 text-sev-critical",
  HIGH: "bg-sev-high/15 text-sev-high",
  MEDIUM: "bg-sev-medium/15 text-sev-medium",
  LOW: "bg-sev-low/15 text-sev-low",
  INFO: "bg-surface text-body",
};

export function severityChipClass(severity) {
  return SEVERITY_CHIP[severity] || "bg-surface text-body";
}

export const SEVERITY_HEX = {
  CRITICAL: "#ff4d4f",
  HIGH: "#ff8a3d",
  MEDIUM: "#f5c542",
  LOW: "#4da3ff",
  INFO: "#6b7181",
};
