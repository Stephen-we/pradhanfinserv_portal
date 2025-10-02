// client/src/components/DataTable.jsx
import React from "react";
import * as XLSX from "xlsx";

export default function DataTable({
  columns = [],
  rows = [],
  page,
  pages,
  onPage,
  onSearch,
  extraToolbar,
}) {
  const exportExcel = () => {
    const data = rows.map((r, i) => {
      const obj = {};
      columns.forEach((c) => {
        if (typeof c.accessor === "function") {
          obj[c.header] = c.accessor(r, i, true); // ✅ pass exportMode = true
        } else {
          obj[c.header] = r[c.accessor];
        }
      });
      return obj;
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "export.xlsx");
  };

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="input"
          placeholder="Search..."
          onChange={(e) => onSearch?.(e.target.value)}
        />
        <button className="btn secondary" onClick={exportExcel}>
          Export Excel
        </button>
        {extraToolbar}
      </div>

      {/* Table */}
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id || i}>
              {columns.map((col) => (
                <td key={col.header}>
              {col.cell
                ? col.cell(r[col.accessor], r, i) // ✅ custom JSX cell
                : typeof col.accessor === "function"
                ? col.accessor(r, i, false)
                : r[col.accessor]}
            </td>

              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pager */}
      <div className="pager">
        <button
          className="icon-btn"
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          ◀
        </button>
        <span>
          Page {page} / {pages || 1}
        </span>
        <button
          className="icon-btn"
          onClick={() => onPage((pages || 1) > page ? page + 1 : page)}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
