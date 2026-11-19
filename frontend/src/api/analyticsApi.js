import apiClient from "./client";

const get = (url, params) => apiClient.get(`/api/v1/analytics${url}`, { params }).then((r) => r.data);

export const getDashboard = () => get("/dashboard");
export const getTrends = (params) => get("/trends", params);
export const getModels = () => get("/models");
export const getGeo = (hours) => get("/geo", { hours });
export const getTopSources = (hours) => get("/top-sources", { hours });
export const getTopTargets = (hours) => get("/top-targets", { hours });
export const getAttackPaths = (hours) => get("/attack-paths", { hours });
