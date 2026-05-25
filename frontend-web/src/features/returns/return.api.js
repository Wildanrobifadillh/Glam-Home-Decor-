import { apiClient } from "../../lib/apiClient";

export const saleReturnApi = {
  getList(params = {}) {
    return apiClient.get("/sale-returns", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/sale-returns/${id}`);
  },

  create(payload) {
    return apiClient.post("/sale-returns", payload);
  },
};

export const purchaseReturnApi = {
  getList(params = {}) {
    return apiClient.get("/purchase-returns", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/purchase-returns/${id}`);
  },

  create(payload) {
    return apiClient.post("/purchase-returns", payload);
  },
};