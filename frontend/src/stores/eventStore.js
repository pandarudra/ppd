import { create } from "zustand";

const MAX = 300;

export const useEventStore = create((set) => ({
  events: [],
  paused: false,
  prependEvent: (e) =>
    set((s) => (s.paused ? s : { events: [{ ...e, _k: crypto.randomUUID?.() ?? String(Math.random()) }, ...s.events].slice(0, MAX) })),
  setPaused: (paused) => set({ paused }),
  clear: () => set({ events: [] }),
}));
