import apiClient from "./client";

export const login = (email, password) =>
  apiClient.post("/api/v1/auth/login", { email, password }).then((r) => r.data);

export const logout = () => apiClient.post("/api/v1/auth/logout").then((r) => r.data);

export const refresh = (refresh_token) =>
  apiClient.post("/api/v1/auth/refresh", { refresh_token }).then((r) => r.data);

export const me = () => apiClient.get("/api/v1/auth/me").then((r) => r.data);

export const changePassword = (current_password, new_password) =>
  apiClient
    .put("/api/v1/auth/change-password", { current_password, new_password })
    .then((r) => r.data);
