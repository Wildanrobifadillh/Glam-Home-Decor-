export const downloadFile = ({ blob, fileName }) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName || "download";
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getFileNameFromContentDisposition = (contentDisposition) => {
  if (!contentDisposition) {
    return null;
  }

  const match = contentDisposition.match(/filename="?([^"]+)"?/);

  return match ? match[1] : null;
};