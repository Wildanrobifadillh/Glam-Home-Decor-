import { Inbox } from "lucide-react";

function EmptyState({
  title = "Data belum tersedia",
  description = "Belum ada data yang bisa ditampilkan.",
}) {
  return (
    <div className="ui-empty-state">
      <div className="ui-empty-icon">
        <Inbox size={28} />
      </div>

      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default EmptyState;