export const ROLES = {
  ADMIN: "admin",
  ANALYST: "analyst",
  VIEWER: "viewer",
  API_CLIENT: "api_client",
};

export const ALERT_STATUSES = [
  "open",
  "acknowledged",
  "in_progress",
  "resolved",
  "false_positive",
  "closed",
];

export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];


// Where the protected network sits on the attack map (override per deployment).
export const HOME = {
  lat: Number(import.meta.env.VITE_HOME_LAT ?? 20.30),
  lon: Number(import.meta.env.VITE_HOME_LON ?? 85.82),
  label: import.meta.env.VITE_HOME_LABEL || "Your network",
};
