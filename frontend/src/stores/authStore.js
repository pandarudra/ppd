import { create } from "zustand";
import { login as loginApi } from "../api/authApi";

export const useAuthStore = create((set) => ({
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
}));
