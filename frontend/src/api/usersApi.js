import apiClient from "./client";

export const listUsers = (params) => apiClient.get("/api/v1/users", { params }).then((r) => r.data);
export const createUser = (body) => apiClient.post("/api/v1/users", body).then((r) => r.data);
export const updateUser = (id, body) => apiClient.put(`/api/v1/users/${id}`, body).then((r) => r.data);
