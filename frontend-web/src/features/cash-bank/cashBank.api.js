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
};