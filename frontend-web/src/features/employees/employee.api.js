import { apiClient } from "../../lib/apiClient";

export const employeeApi = {
  getList(params = {}) {
    return apiClient.get("/employees", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/employees/${id}`);
  },

  create(payload) {
    return apiClient.post("/employees", payload);
  },

  update(id, payload) {
    return apiClient.patch(`/employees/${id}`, payload);
  },

  deactivate(id) {
    return apiClient.patch(`/employees/${id}/deactivate`);
  },

  activate(id) {
    return apiClient.patch(`/employees/${id}/activate`);
  },
};