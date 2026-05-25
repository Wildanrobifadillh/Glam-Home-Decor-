import { apiClient } from "../../lib/apiClient";

export const receivableApi = {
  getList(params = {}) {
    return apiClient.get("/receivables", {
      params,
    });
  },

  getSummary() {
    return apiClient.get("/receivables/summary");
  },

  getBySaleId(saleId) {
    return apiClient.get(`/receivables/${saleId}`);
  },

  paySale(saleId, payload) {
    return apiClient.post(`/sales/${saleId}/payments`, payload);
  },
};