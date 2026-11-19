// Illustrative attack origins for the marketing/login maps only; the console shows real data.
const mk = (rows) =>
  rows.map(([city, country, lat, lon, severity], i) => ({
    ip: `demo-${i}`, alert_count: 3 + i, severity, geo: { city, country, lat, lon },
  }));

export const DEMO_WORLD = mk([
  ["Moscow", "RU", 55.75, 37.62, "CRITICAL"], ["Beijing", "CN", 39.9, 116.4, "HIGH"],
  ["Sao Paulo", "BR", -23.55, -46.63, "MEDIUM"], ["Lagos", "NG", 6.52, 3.38, "HIGH"],
  ["Frankfurt", "DE", 50.11, 8.68, "MEDIUM"], ["New York", "US", 40.71, -74.01, "LOW"],
  ["Tehran", "IR", 35.69, 51.39, "CRITICAL"], ["Singapore", "SG", 1.35, 103.82, "MEDIUM"],
  ["Sydney", "AU", -33.87, 151.21, "LOW"],
]);

// Eurasia/Africa only: matches the cropped login panel.
export const DEMO_EURASIA = mk([
  ["Moscow", "RU", 55.75, 37.62, "CRITICAL"], ["Beijing", "CN", 39.9, 116.4, "HIGH"],
  ["Lagos", "NG", 6.52, 3.38, "HIGH"], ["Frankfurt", "DE", 50.11, 8.68, "MEDIUM"],
  ["Tehran", "IR", 35.69, 51.39, "CRITICAL"], ["Singapore", "SG", 1.35, 103.82, "MEDIUM"],
  ["Johannesburg", "ZA", -26.2, 28.05, "LOW"], ["Istanbul", "TR", 41.01, 28.98, "HIGH"],
  ["Tokyo", "JP", 35.68, 139.69, "MEDIUM"], ["Cairo", "EG", 30.04, 31.24, "LOW"],
  ["Jakarta", "ID", -6.21, 106.85, "MEDIUM"],
]);
