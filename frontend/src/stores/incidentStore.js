import { create } from "zustand";

export const useIncidentStore = create((set) => ({
  incidents: [],

  setIncidents: (incidents) => set({ incidents }),

  addIncident: (payload) => set((state) => ({ incidents: [payload, ...state.incidents] })),

  updateIncident: (payload) =>
    set((state) => ({
      incidents: state.incidents.map((i) =>
        i.incident_id === payload.incident_id ? { ...i, ...payload } : i,
      ),
    })),
}));
