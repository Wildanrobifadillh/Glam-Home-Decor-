import { apiClient } from "../../lib/apiClient";

export const journalEntryApi = {
  getList(params = {}) {
    return apiClient.get("/journal-entries", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/journal-entries/${id}`);
  },

  create(payload) {
    return apiClient.post("/journal-entries", payload);
  },

  reverse(id, payload = {}) {
    return apiClient.post(`/journal-entries/${id}/reverse`, payload);
  },
};