import { storage } from "../../lib/storage";

export const authStore = {
  setAuth({ token, user }) {
    storage.setToken(token);

    if (user) {
      storage.setUser(user);
    }
  },

  getToken() {
    return storage.getToken();
  },

  getUser() {
    return storage.getUser();
  },

  isAuthenticated() {
    return Boolean(storage.getToken());
  },

  logout() {
    storage.clearAuth();
  },
};