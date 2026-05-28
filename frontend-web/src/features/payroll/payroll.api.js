import { apiClient } from "../../lib/apiClient";

export const payrollApi = {
  getList(params = {}) {
    return apiClient.get("/payrolls", {
      params,
    });
  },

  getSummary(params = {}) {
    return apiClient.get("/payrolls/summary", {
      params,
    });
  },

  getById(id) {
    return apiClient.get(`/payrolls/${id}`);
  },

  create(payload) {
    return apiClient.post("/payrolls", payload);
  },

  getSlipPreview(id) {
    return apiClient.get(`/payrolls/${id}/slip-preview`);
  },

  getSlipPdf(id) {
    return apiClient.get(`/payrolls/${id}/slip-pdf`, {
      responseType: "blob",
    });
  },

  exportReportExcel(params = {}) {
    return apiClient.get("/reports/payrolls/export-excel", {
      params,
      responseType: "blob",
    });
  },

  exportReportPdf(params = {}) {
    return apiClient.get("/reports/payrolls/export-pdf", {
      params,
      responseType: "blob",
    });
  },
};

export function openPayrollPdfResponse(response) {
  const blob = new Blob([response.data], {
    type: "application/pdf",
  });

  const objectUrl = window.URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 60000);
}

export function downloadPayrollBlobResponse(response, fallbackFileName) {
  const blob = new Blob([response.data], {
    type: response.headers?.["content-type"] || "application/octet-stream",
  });

  const contentDisposition = response.headers?.["content-disposition"];
  const matchedFileName = contentDisposition?.match(/filename="?([^"]+)"?/i);
  const fileName = matchedFileName?.[1] || fallbackFileName;

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(objectUrl);
}