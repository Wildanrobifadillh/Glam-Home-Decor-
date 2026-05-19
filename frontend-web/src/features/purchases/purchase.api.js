import { apiClient } from "../../lib/apiClient";

export const purchaseApi = {
  getList(params = {}) {
    return apiClient.get("/purchases", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/purchases/${id}`);
  },

  create(payload) {
    return apiClient.post("/purchases", payload);
  },

  pay(id, payload) {
    return apiClient.post(`/purchases/${id}/payments`, payload);
  },

  getPayables(params = {}) {
    return apiClient.get("/payables", {
      params,
    });
  },

  getPayableSummary() {
    return apiClient.get("/payables/summary");
  },

  getPayableByPurchaseId(purchaseId) {
    return apiClient.get(`/payables/${purchaseId}`);
  },

  getReport(params = {}) {
    return apiClient.get("/reports/purchases", {
      params,
    });
  },

  exportReportPdf(params = {}) {
    return apiClient.get("/reports/purchases/export-pdf", {
      params,
      responseType: "blob",
    });
  },

  exportReportExcel(params = {}) {
    return apiClient.get("/reports/purchases/export-excel", {
      params,
      responseType: "blob",
    });
  },
};