import { apiClient } from "../../lib/apiClient";

export const settingsApi = {
  getStoreProfile() {
    return apiClient.get("/settings/store-profile");
  },

  updateStoreProfile(payload) {
    return apiClient.put("/settings/store-profile", payload);
  },

  getStoreBankAccounts() {
    return apiClient.get("/settings/store-bank-accounts");
  },

  getStoreBankAccountById(id) {
    return apiClient.get(`/settings/store-bank-accounts/${id}`);
  },

  createStoreBankAccount(payload) {
    return apiClient.post("/settings/store-bank-accounts", payload);
  },

  updateStoreBankAccount(id, payload) {
    return apiClient.put(`/settings/store-bank-accounts/${id}`, payload);
  },

  setDefaultStoreBankAccount(id) {
    return apiClient.patch(`/settings/store-bank-accounts/${id}/default`);
  },

  updateStoreBankAccountStatus(id, status) {
    return apiClient.patch(`/settings/store-bank-accounts/${id}/status`, {
      status,
    });
  },

  getOperationalPreferences() {
    return apiClient.get("/settings/operational-preferences");
  },

  updateOperationalPreferences(payload) {
    return apiClient.put("/settings/operational-preferences", payload);
  },

  getDocumentSetting() {
    return apiClient.get("/settings/document");
  },

  updateDocumentSetting(payload) {
    return apiClient.put("/settings/document", payload);
  },
    getModules() {
    return apiClient.get("/settings/modules");
  },

  getAllRolePermissions() {
    return apiClient.get("/settings/role-permissions");
  },

  getRolePermissionsByRole(role) {
    return apiClient.get(`/settings/role-permissions/${role}`);
  },

  getMyPermissions() {
    return apiClient.get("/settings/my-permissions");
  },

  updateRolePermissions(role, moduleKeys) {
    return apiClient.put(`/settings/role-permissions/${role}`, {
      moduleKeys,
    });
  },

  getUsers() {
  return apiClient.get("/settings/users");
},

getUserById(id) {
  return apiClient.get(`/settings/users/${id}`);
},

createUser(payload) {
  return apiClient.post("/settings/users", payload);
},

updateUser(id, payload) {
  return apiClient.put(`/settings/users/${id}`, payload);
},

updateUserRole(id, role) {
  return apiClient.patch(`/settings/users/${id}/role`, {
    role,
  });
},

updateUserStatus(id, status) {
  return apiClient.patch(`/settings/users/${id}/status`, {
    status,
  });
},

resetUserPassword(id, password) {
  return apiClient.patch(`/settings/users/${id}/reset-password`, {
    password,
  });
},
};