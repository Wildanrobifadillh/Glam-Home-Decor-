import { apiClient } from "../../lib/apiClient";

export const stockOpnameApi = {
  getList(params = {}) {
    return apiClient.get("/stock-opnames", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/stock-opnames/${id}`);
  },

  create(payload) {
    return apiClient.post("/stock-opnames", payload);
  },
};