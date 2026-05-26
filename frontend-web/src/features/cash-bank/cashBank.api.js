import { apiClient } from "../../lib/apiClient";

export const cashBankApi = {
  getList(params = {}) {
    return apiClient.get("/cash-bank-accounts", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/cash-bank-accounts/${id}`);
  },

  create(payload) {
    return apiClient.post("/cash-bank-accounts", payload);
  },

  update(id, payload) {
    return apiClient.patch(`/cash-bank-accounts/${id}`, payload);
  },

  deactivate(id) {
    return apiClient.patch(`/cash-bank-accounts/${id}/deactivate`);
  },
};