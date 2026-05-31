import { apiClient } from "../../lib/apiClient";

export const dashboardApi = {
  getOwnerDashboard(params = {}) {
    return apiClient.get("/dashboard/owner", {
      params,
    });
  },
};