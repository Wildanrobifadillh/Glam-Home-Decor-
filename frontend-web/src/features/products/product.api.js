import { apiClient } from "../../lib/apiClient";

export const productApi = {
  getList(params = {}) {
    return apiClient.get("/products", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/products/${id}`);
  },

  create(payload) {
    return apiClient.post("/products", payload);
  },

  update(id, payload) {
    return apiClient.patch(`/products/${id}`, payload);
  },

  deactivate(id) {
    return apiClient.patch(`/products/${id}/deactivate`);
  },

  activate(id) {
    return apiClient.patch(`/products/${id}/activate`);
  },
};