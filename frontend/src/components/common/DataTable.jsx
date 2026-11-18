export default function DataTable({ columns, rows, onRowClick, emptyMessage = "No data" }) {
  if (!rows?.length) {
    return <p className="py-12 text-center text-body">{emptyMessage}</p>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-3 text-left font-medium text-body">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              onClick={() => onRowClick?.(row)}
              className={`border-t border-hairline ${onRowClick ? "cursor-pointer hover:bg-surface-soft" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-4 py-3 text-ink">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
