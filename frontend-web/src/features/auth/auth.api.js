import { apiClient } from "../../lib/apiClient";

export const authApi = {
  login(payload) {
    return apiClient.post("/auth/login", payload);
  },
};