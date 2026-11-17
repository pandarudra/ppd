import apiClient from "./client";

export const getDashboard = () =>
  apiClient.get("/api/v1/analytics/dashboard").then((r) => r.data);

export const getTrends = (params) =>
  apiClient.get("/api/v1/analytics/trends", { params }).then((r) => r.data);
