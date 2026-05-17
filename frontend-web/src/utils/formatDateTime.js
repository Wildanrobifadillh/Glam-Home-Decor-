export const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

  const timeLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${dateLabel} • ${timeLabel}`;
};