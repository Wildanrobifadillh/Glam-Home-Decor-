import { apiClient } from "../../lib/apiClient";

export const saleApi = {
  getList(params = {}) {
    return apiClient.get("/sales", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/sales/${id}`);
  },

  create(payload) {
    return apiClient.post("/sales", payload);
  },

  pay(id, payload) {
    return apiClient.post(`/sales/${id}/payments`, payload);
  },

  approve(id, payload = {}) {
    return apiClient.patch(`/sales/${id}/approve`, payload);
  },

  reject(id, payload = {}) {
    return apiClient.patch(`/sales/${id}/reject`, payload);
  },

  getInvoicePreview(id) {
    return apiClient.get(`/sales/${id}/invoice-preview`);
  },

  generateInvoice(id) {
    return apiClient.post(`/sales/${id}/generate-invoice`);
  },

  getInvoicePdf(id) {
    return apiClient.get(`/sales/${id}/invoice-pdf`, {
      responseType: "blob",
    });
  },

    getDeliveryOrderPreview(id) {
    return apiClient.get(`/sales/${id}/delivery-order-preview`);
  },

  generateDeliveryOrder(id) {
    return apiClient.post(`/sales/${id}/generate-delivery-order`);
  },

  getDeliveryOrderPdf(id) {
    return apiClient.get(`/sales/${id}/delivery-order-pdf`, {
      responseType: "blob",
    });
  },

  getReport(params = {}) {
    return apiClient.get("/reports/sales", {
      params,
    });
  },

  exportReportExcel(params = {}) {
    return apiClient.get("/reports/sales/export-excel", {
      params,
      responseType: "blob",
    });
  },

  exportReportPdf(params = {}) {
    return apiClient.get("/reports/sales/export-pdf", {
      params,
      responseType: "blob",
    });
  },
};