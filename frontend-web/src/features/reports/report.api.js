import { apiClient } from "../../lib/apiClient";

export const reportApi = {
  getProfitLoss(params = {}) {
    return apiClient.get("/reports/profit-loss", {
      params,
    });
  },

  getCashFlow(params = {}) {
    return apiClient.get("/reports/cash-flow", {
      params,
    });
  },

  getBalanceSheet(params = {}) {
    return apiClient.get("/reports/balance-sheet", {
      params,
    });
  },

  getOwnerSummary(params = {}) {
    return apiClient.get("/reports/owner-summary", {
      params,
    });
  },

  getGeneralLedger(accountId, params = {}) {
    return apiClient.get(`/reports/general-ledger/${accountId}`, {
      params,
    });
  },

  exportProfitLossExcel(params = {}) {
    return apiClient.get("/reports/profit-loss/export-excel", {
      params,
      responseType: "blob",
    });
  },

  exportProfitLossPdf(params = {}) {
    return apiClient.get("/reports/profit-loss/export-pdf", {
      params,
      responseType: "blob",
    });
  },

  exportCashFlowExcel(params = {}) {
    return apiClient.get("/reports/cash-flow/export-excel", {
      params,
      responseType: "blob",
    });
  },

  exportCashFlowPdf(params = {}) {
    return apiClient.get("/reports/cash-flow/export-pdf", {
      params,
      responseType: "blob",
    });
  },

  exportBalanceSheetExcel(params = {}) {
    return apiClient.get("/reports/balance-sheet/export-excel", {
      params,
      responseType: "blob",
    });
  },

  exportBalanceSheetPdf(params = {}) {
    return apiClient.get("/reports/balance-sheet/export-pdf", {
      params,
      responseType: "blob",
    });
  },
};

export function downloadBlobResponse(response, fallbackFileName) {
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

export function openPdfBlobResponse(response) {
  const blob = new Blob([response.data], {
    type: "application/pdf",
  });

  const objectUrl = window.URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 60000);
}