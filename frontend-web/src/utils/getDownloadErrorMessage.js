import { getErrorMessage } from "./getErrorMessage";

export const getDownloadErrorMessage = async (error) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();

      if (text) {
        try {
          const parsed = JSON.parse(text);

          if (parsed?.message) {
            return parsed.message;
          }

          if (parsed?.error) {
            return parsed.error;
          }
        } catch {
          return text;
        }
      }
    } catch {
      // Jika Blob tidak dapat dibaca, gunakan fallback error biasa.
    }
  }

  return getErrorMessage(error);
};