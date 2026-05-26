import { apiClient } from "../../lib/apiClient";

export const accountApi = {
  getList(params = {}) {
    return apiClient.get("/accounts", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/accounts/${id}`);
  },

  create(payload) {
    return apiClient.post("/accounts", payload);
  },

  update(id, payload) {
    return apiClient.patch(`/accounts/${id}`, payload);
  },

  deactivate(id) {
    return apiClient.patch(`/accounts/${id}/deactivate`);
  },
};