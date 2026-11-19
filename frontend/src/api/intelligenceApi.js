import apiClient from "./client";

export const lookupIoc = (ioc, type) =>
  apiClient.get("/api/v1/intelligence/lookup", { params: { ioc, type } }).then((r) => r.data);
export const listIocs = (params) =>
  apiClient.get("/api/v1/intelligence/iocs", { params }).then((r) => r.data);
export const addIoc = (body) => apiClient.post("/api/v1/intelligence/iocs", body).then((r) => r.data);
