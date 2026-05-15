import { apiClient } from "../../lib/apiClient";

export const categoryApi = {
  getList(params = {}) {
    return apiClient.get("/categories", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/categories/${id}`);
  },

  create(payload) {
    return apiClient.post("/categories", payload);
  },

  update(id, payload) {
    return apiClient.patch(`/categories/${id}`, payload);
  },

  deactivate(id) {
    return apiClient.patch(`/categories/${id}/deactivate`);
  },

  activate(id) {
    return apiClient.patch(`/categories/${id}/activate`);
  },
};