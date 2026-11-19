import { create } from "zustand";
import { persist } from "zustand/middleware";
import { login as loginApi } from "../api/authApi";

// Persisted so a refresh keeps you signed in. Tokens live in localStorage (XSS-readable);
// the 15-minute access token limits exposure, and a 401 triggers the refresh flow in api/client.js.
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const data = await loginApi(email, password);
        set({
          token: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
          isAuthenticated: true,
        });
        return data;
      },

      setToken: (token) => set({ token, isAuthenticated: !!token }),

      logout: () => set({ token: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "sentinel-auth",
      partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
