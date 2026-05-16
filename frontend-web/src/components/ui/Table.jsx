import clsx from "clsx";
import EmptyState from "./EmptyState";
import Loading from "./Loading";

function Table({
  columns = [],
  data = [],
  isLoading = false,
  emptyTitle = "Data belum tersedia",
  emptyDescription = "Belum ada data yang bisa ditampilkan.",
  className = "",
}) {
  if (isLoading && !data.length) {
    return (
      <div className="ui-table-wrapper">
        <Loading />
      </div>
    );
  }

  if (!isLoading && !data.length) {
    return (
      <div className="ui-table-wrapper">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

return (
  <div className={clsx("ui-table-wrapper", isLoading && "is-fetching", className)}>
    <table className="ui-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              style={{ width: column.width }}
              className={getAlignClassName(column.align)}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={row.id || rowIndex}>
            {columns.map((column) => (
              <td
                key={column.key}
                className={getAlignClassName(column.align)}
              >
                {column.render
                  ? column.render(row, rowIndex)
                  : row[column.key] || "-"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
}

function getAlignClassName(align) {
  if (align === "right") {
    return "is-right";
  }

  if (align === "center") {
    return "is-center";
  }

  return "";
}

export default Table;