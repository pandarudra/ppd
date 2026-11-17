import apiClient from "./client";

export const listIncidents = (params) =>
  apiClient.get("/api/v1/incidents", { params }).then((r) => r.data);

export const getIncident = (incidentId) =>
  apiClient.get(`/api/v1/incidents/${incidentId}`).then((r) => r.data);

export const createIncident = (payload) =>
  apiClient.post("/api/v1/incidents", payload).then((r) => r.data);

export const updateIncident = (incidentId, payload) =>
  apiClient.put(`/api/v1/incidents/${incidentId}`, payload).then((r) => r.data);

export const linkAlerts = (incidentId, alert_ids) =>
  apiClient.post(`/api/v1/incidents/${incidentId}/alerts`, { alert_ids }).then((r) => r.data);

export const getTimeline = (incidentId) =>
  apiClient.get(`/api/v1/incidents/${incidentId}/timeline`).then((r) => r.data);
