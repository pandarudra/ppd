export default function DataTable({ columns, rows, onRowClick, emptyMessage = "No data" }) {
  if (!rows?.length) {
    return <div className="text-slate-500 text-sm py-8 text-center">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto border border-slate-600 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left font-medium">
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
              className={`border-t border-slate-700 ${onRowClick ? "cursor-pointer hover:bg-slate-800" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-slate-200">
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
