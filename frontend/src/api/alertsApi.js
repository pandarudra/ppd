import apiClient from "./client";

export const listAlerts = (params) =>
  apiClient.get("/api/v1/alerts", { params }).then((r) => r.data);

export const getAlert = (alertId) =>
  apiClient.get(`/api/v1/alerts/${alertId}`).then((r) => r.data);

export const updateAlertStatus = (alertId, status, note) =>
  apiClient.put(`/api/v1/alerts/${alertId}/status`, { status, note }).then((r) => r.data);

export const assignAlert = (alertId, assign_to_user_id) =>
  apiClient
    .put(`/api/v1/alerts/${alertId}/assign`, { assign_to_user_id })
    .then((r) => r.data);

export const commentOnAlert = (alertId, comment) =>
  apiClient.post(`/api/v1/alerts/${alertId}/comment`, { comment }).then((r) => r.data);
