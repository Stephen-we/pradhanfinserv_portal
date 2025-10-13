// client/src/components/DataTable.jsx
import React from "react";

export default function DataTable({
  columns = [],
  rows = [],
  page,
  pages,
  onPage,
  onSearch,
  extraToolbar,
}) {
  return (
    <div className="card">
      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="input"
          placeholder="Search..."
          onChange={(e) => onSearch?.(e.target.value)}
        />
        {/* 🧹 Removed old unprotected Export button */}
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: 20 }}>
                No records found
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r._id || i}>
                {columns.map((col) => (
                  <td key={col.header}>
                    {col.cell
                      ? col.cell(r[col.accessor], r, i)
                      : typeof col.accessor === "function"
                      ? col.accessor(r, i, false)
                      : r[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
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
