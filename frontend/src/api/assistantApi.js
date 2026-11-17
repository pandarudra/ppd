import apiClient from "./client";

export const analyze = (payload) =>
  apiClient.post("/api/v1/assistant/analyze", payload).then((r) => r.data);

export const explainAlert = (alertId) =>
  apiClient.post(`/api/v1/assistant/explain/${alertId}`).then((r) => r.data);

export const recommendForIncident = (incidentId) =>
  apiClient.post(`/api/v1/assistant/recommend/${incidentId}`).then((r) => r.data);
