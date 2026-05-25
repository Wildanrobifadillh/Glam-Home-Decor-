import { apiClient } from "../../lib/apiClient";

export const payableApi = {
  getList(params = {}) {
    return apiClient.get("/payables", {
      params,
    });
  },

  getSummary() {
    return apiClient.get("/payables/summary");
  },

  getByPurchaseId(purchaseId) {
    return apiClient.get(`/payables/${purchaseId}`);
  },

  payPurchase(purchaseId, payload) {
    return apiClient.post(`/purchases/${purchaseId}/payments`, payload);
  },
};