import React, { useEffect, useState } from "react";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Branches(){ 
  const [state,setState] = useState({ items:[], page:1, pages:1, q:"" });
  const [form,setForm] = useState({ bankName:"", branchName:"", managerNumber:"" });
  const load = ()=> API.get("/branches", { params: { page: state.page, q: state.q } }).then(r=>setState(s=>({ ...s, items:r.data.items, pages:r.data.pages })));
  useEffect(()=>{ load(); },[state.page, state.q]);
  const add = async ()=>{ await API.post("/branches", form); setForm({ bankName:"", branchName:"", managerNumber:"" }); load(); };

  return (<div>
    <header><h1>Bank Branches</h1></header>
    <div className="card">
      <div className="toolbar">
        <input className="input" placeholder="Bank" value={form.bankName} onChange={e=>setForm({...form, bankName:e.target.value})} />
        <input className="input" placeholder="Branch" value={form.branchName} onChange={e=>setForm({...form, branchName:e.target.value})} />
        <input className="input" placeholder="Manager Number" value={form.managerNumber} onChange={e=>setForm({...form, managerNumber:e.target.value})} />
        <button className="btn" onClick={add}>Add Branch</button>
      </div>
    </div>
    <DataTable
      columns={[
        { header:"Branch ID", accessor:"branchId" },
        { header:"Bank Name", accessor:"bankName" },
        { header:"Branch Name", accessor:"branchName" },
        { header:"Branch Manager Number", accessor:"managerNumber" }
      ]}
      rows={state.items}
      page={state.page}
      pages={state.pages}
      onPage={(p)=>setState(s=>({ ...s, page:p }))}
      onSearch={(q)=>setState(s=>({ ...s, q, page:1 }))}
      renderActions={(row)=>(<></>)}
    />
  </div>); 
}
