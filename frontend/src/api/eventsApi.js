import apiClient from "./client";

export const ingestEvent = (payload) =>
  apiClient.post("/api/v1/events/ingest", payload).then((r) => r.data);

export const listEvents = (params) =>
  apiClient.get("/api/v1/events", { params }).then((r) => r.data);

export const getEvent = (eventId) =>
  apiClient.get(`/api/v1/events/${eventId}`).then((r) => r.data);

export const getEventDetection = (eventId) =>
  apiClient.get(`/api/v1/events/${eventId}/detection`).then((r) => r.data);

export const getEventStatus = (eventId) =>
  apiClient.get(`/api/v1/events/status/${eventId}`).then((r) => r.data);
