// plan/UI_UX_DESIGN.md §9.1 severity palette
export const SEVERITY_BG = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
  INFO: "bg-blue-500",
};

export const SEVERITY_TEXT = {
  CRITICAL: "text-red-500",
  HIGH: "text-orange-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-green-400",
  INFO: "text-blue-400",
};

export function severityBgClass(severity) {
  return SEVERITY_BG[severity] || "bg-slate-500";
}

export function severityTextClass(severity) {
  return SEVERITY_TEXT[severity] || "text-slate-400";
}

export const SEVERITY_HEX = {
  CRITICAL: "#DC2626",
  HIGH: "#F97316",
  MEDIUM: "#EAB308",
  LOW: "#22C55E",
  INFO: "#3B82F6",
};
