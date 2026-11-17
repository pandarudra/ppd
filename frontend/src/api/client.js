import axios from "axios";
import { useAuthStore } from "../stores/authStore";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const refreshToken = useAuthStore.getState().refreshToken;

    if (response?.status === 401 && !config._retried && refreshToken) {
      config._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${apiClient.defaults.baseURL}/api/v1/auth/refresh`, {
              refresh_token: refreshToken,
            })
            .then((r) => r.data)
            .finally(() => {
              refreshPromise = null;
            });
        }
        const data = await refreshPromise;
        useAuthStore.getState().setToken(data.access_token);
        config.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(config);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
