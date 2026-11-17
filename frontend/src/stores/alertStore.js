import { create } from "zustand";

export const useAlertStore = create((set) => ({
  alerts: [],

  setAlerts: (alerts) => set({ alerts }),

  prependAlert: (payload) =>
    set((state) => ({ alerts: [payload, ...state.alerts].slice(0, 50) })),

  updateAlert: (payload) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.alert_id === payload.alert_id ? { ...a, ...payload } : a,
      ),
    })),
}));
