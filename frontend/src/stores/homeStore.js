import { create } from "zustand";
import { persist } from "zustand/middleware";
import { HOME as DEFAULT_HOME } from "../utils/constants";

const fromBrowser = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Your location", source: "browser" }),
      reject,
      { timeout: 8000, maximumAge: 24 * 3600 * 1000 },
    );
  });

// Fallback: locate the network's public IP. This sends the request from the user's browser, so that
// third party (ipwho.is, free, no key) sees their public IP. Used only when browser location is refused.
const fromNetwork = async () => {
  const r = await fetch("https://ipwho.is/");
  const d = await r.json();
  if (!d.success) throw new Error("ip lookup failed");
  return { lat: d.latitude, lon: d.longitude, label: [d.city, d.region].filter(Boolean).join(", "), source: "network" };
};

/** Where "your network" sits on the attack map: browser location, else IP lookup, else the configured default. */
export const useHomeStore = create(
  persist(
    (set) => ({
      home: { ...DEFAULT_HOME, source: "default" },
      attempted: false, // auto-detect runs once per browser; Settings can re-run it

      setHome: (home) => set({ home }),

      detect: async () => {
        set({ attempted: true });
        for (const method of [fromBrowser, fromNetwork]) {
          try {
            set({ home: await method() });
            return true;
          } catch {
            /* denied, timed out or offline: try the next source */
          }
        }
        return false;
      },
    }),
    { name: "sentinel-home" },
  ),
);
