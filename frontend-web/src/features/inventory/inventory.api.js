import { apiClient } from "../../lib/apiClient";

export const inventoryApi = {
  getStockHistories(params = {}) {
    return apiClient.get("/inventory/stock-histories", {
      params,
    });
  },

  stockIn(payload) {
    return apiClient.post("/inventory/stock-in", payload);
  },

  stockOut(payload) {
    return apiClient.post("/inventory/stock-out", payload);
  },

  stockAdjustment(payload) {
    return apiClient.post("/inventory/stock-adjustment", payload);
  },

  damagedStock(payload) {
    return apiClient.post("/inventory/damaged-stock", payload);
  },
};