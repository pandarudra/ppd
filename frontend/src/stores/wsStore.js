import { create } from "zustand";

export const useWsStore = create((set) => ({
  connected: false,
  health: null,

  setConnected: (connected) => set({ connected }),
  setHealth: (health) => set({ health }),
}));
