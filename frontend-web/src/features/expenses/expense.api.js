import { apiClient } from "../../lib/apiClient";

export const expenseApi = {
  getList(params = {}) {
    return apiClient.get("/expenses", {
      params,
    });
  },

  getSummary(params = {}) {
    return apiClient.get("/expenses/summary", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/expenses/${id}`);
  },

  create(payload) {
    return apiClient.post("/expenses", payload);
  },
};