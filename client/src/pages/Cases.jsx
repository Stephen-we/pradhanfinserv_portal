import React, { useEffect, useState } from "react";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Cases(){ 
  const [state,setState] = useState({ items:[], page:1, pages:1, q:"" });
  const load = ()=> API.get("/cases", { params: { page: state.page, q: state.q } }).then(r=>setState(s=>({ ...s, items:r.data.items, pages:r.data.pages })));
  useEffect(()=>{ load(); },[state.page, state.q]);

  const changeStatus = async (row)=>{
    const status = prompt("New status (in-progress, pending-documents, approved, rejected, disbursed)", row.status);
    if (status){ await API.put(`/cases/${row._id}`, {...row, status}); load(); }
  };
  const comment = async (row)=>{
    const c = prompt("Comment");
    if (c){ await API.post(`/cases/${row._id}/comment`, { comment: c }); alert("Comment added"); }
  };
  const viewAudit = async (row)=>{
    const { data } = await API.get(`/cases/${row._id}/audit`);
    alert(data.map(a=>`${new Date(a.createdAt).toLocaleString()} - ${a.action}${a.fromStatus?` ${a.fromStatus}→${a.toStatus}`:""} ${a.comment?`- ${a.comment}`:""} by ${a.actor?.name||""}`).join("\n") || "No logs");
  };

  return (<div>
    <header><h1>Loan Cases</h1></header>
    <DataTable
      columns={[
        { header:"Case ID", accessor:"caseId" },
        { header:"Loan Type", accessor:"loanType" },
        { header:"Status", accessor:"status" },
        { header:"Task", accessor:"task" },
        { header:"Disbursed Amount", accessor:"disbursedAmount" }
      ]}
      rows={state.items}
      page={state.page}
      pages={state.pages}
      onPage={(p)=>setState(s=>({ ...s, page:p }))}
      onSearch={(q)=>setState(s=>({ ...s, q, page:1 }))}
      renderActions={(row)=>(<div style={{display:"flex", gap:6}}>
        <button className="btn" onClick={()=>changeStatus(row)}>Change Status</button>
        <button className="btn secondary" onClick={()=>comment(row)}>Comment</button>
        <button className="btn" onClick={()=>viewAudit(row)}>View Audit</button>
      </div>)}
    />
  </div>); 
}
