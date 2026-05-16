import { apiClient } from "../../lib/apiClient";

export const customerApi = {
  getList(params = {}) {
    return apiClient.get("/customers", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/customers/${id}`);
  },

  create(payload) {
    return apiClient.post("/customers", payload);
  },

  update(id, payload) {
    return apiClient.patch(`/customers/${id}`, payload);
  },

  deactivate(id) {
    return apiClient.patch(`/customers/${id}/deactivate`);
  },

  activate(id) {
    return apiClient.patch(`/customers/${id}/activate`);
  },
};