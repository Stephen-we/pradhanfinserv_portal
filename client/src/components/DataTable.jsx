import React from "react";
import * as XLSX from "xlsx";

export default function DataTable({ columns=[], rows=[], page, pages, onPage, onSearch, onExport, extraToolbar, renderActions }){
  const exportExcel = ()=>{
    const data = rows.map(r=>{
      const obj = {};
      columns.forEach(c=> obj[c.header] = c.cell ? c.cell(r[c.accessor], r, true) : r[c.accessor]);
      return obj;
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "export.xlsx");
  };
  return (
    <div className="card">
      <div className="toolbar">
        <input className="input" placeholder="Search..." onChange={e=>onSearch?.(e.target.value)} />
        <button className="btn secondary" onClick={exportExcel}>Export Excel</button>
        {extraToolbar}
      </div>
      <table className="table">
        <thead>
          <tr>
            {columns.map(col => <th key={col.header}>{col.header}</th>)}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r._id}>
              {columns.map(col => <td key={col.header}>{col.cell? col.cell(r[col.accessor], r) : r[col.accessor]}</td>)}
              <td>{renderActions?.(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pager">
        <button className="icon-btn" onClick={()=>onPage(Math.max(1, page-1))}>◀</button>
        <span>Page {page} / {pages || 1}</span>
        <button className="icon-btn" onClick={()=>onPage((pages||1)>page? page+1 : page)}>▶</button>
      </div>
    </div>
  );
}
