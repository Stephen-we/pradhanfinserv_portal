// client/src/pages/Partners.jsx
import React, { useEffect, useState } from "react";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Partners(){ 
  const [state,setState] = useState({ items:[], page:1, pages:1, q:"" });
  const [form,setForm] = useState({ name:"", contactNumber:"", products:[], commission:0 });
  const load = ()=> API.get("/partners", { params: { page: state.page, q: state.q } }).then(r=>setState(s=>({ ...s, items:r.data.items, pages:r.data.pages })));
  useEffect(()=>{ load(); },[state.page, state.q]);
  const add = async ()=>{ await API.post("/partners", form); setForm({ name:"", contactNumber:"", products:[], commission:0 }); load(); };

  return (<div>
    <header><h1>Channel Partners</h1></header>
    <div className="card">
      <div className="toolbar">
        <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <input className="input" placeholder="Contact Number" value={form.contactNumber} onChange={e=>setForm({...form, contactNumber:e.target.value})} />
        <input className="input" placeholder="Products (comma separated)" value={(form.products||[]).join(",")} onChange={e=>setForm({...form, products:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} />
        <input className="input" placeholder="Commission %" value={form.commission} onChange={e=>setForm({...form, commission:Number(e.target.value||0)})} />
        <button className="btn" onClick={add}>Add Partner</button>
      </div>
    </div>
    <DataTable
      columns={[
        { header:"Partner ID", accessor:"partnerId" },
        { header:"Name", accessor:"name" },
        { header:"Products", accessor:"products", cell:(v)=> (v||[]).join(", ") },
        { header:"Commission %", accessor:"commission" },
        { header:"Contact", accessor:"contactNumber", cell:(v)=> v ? <a className="whatsapp" href={`https://wa.me/91${v}`} target="_blank">{v}</a> : "-" }
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
