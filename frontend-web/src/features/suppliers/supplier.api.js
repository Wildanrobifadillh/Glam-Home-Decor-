import { apiClient } from "../../lib/apiClient";

export const supplierApi = {
  getList(params = {}) {
    return apiClient.get("/suppliers", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/suppliers/${id}`);
  },

  create(payload) {
    return apiClient.post("/suppliers", payload);
  },

  update(id, payload) {
    return apiClient.patch(`/suppliers/${id}`, payload);
  },

  deactivate(id) {
    return apiClient.patch(`/suppliers/${id}/deactivate`);
  },

  activate(id) {
    return apiClient.patch(`/suppliers/${id}/activate`);
  },
};