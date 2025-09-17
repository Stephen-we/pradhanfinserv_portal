import React, { useEffect, useState, useRef } from "react";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Customers(){
  const [state,setState] = useState({ items:[], page:1, pages:1, q:"" });
  const [form,setForm] = useState({ name:"", mobile:"", email:"" });
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === 'admin';
  const fileRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  const load = ()=> API.get("/customers", { params: { page: state.page, q: state.q } }).then(r=>setState(s=>({ ...s, items:r.data.items, pages:r.data.pages })));
  useEffect(()=>{ load(); },[state.page, state.q]);

  const create = async ()=>{ await API.post("/customers", form); setForm({ name:"", mobile:"", email:"" }); load(); };
  const uploadKyc = async (id, label)=>{
    const file = fileRef.current.files[0];
    if (!file) return alert("Choose file");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("label", label);
    await API.post(`/customers/${id}/kyc/upload`, fd);
    fileRef.current.value = "";
    setActiveId(null);
    load();
  };

  return (
    <div>
      <header><h1>Customer Management</h1></header>
      <div className="card">
        <div className="toolbar">
          <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="input" placeholder="Mobile" value={form.mobile} onChange={e=>setForm({...form, mobile:e.target.value})} />
          <input className="input" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <button className="btn" onClick={create}>Add Customer</button>
          <small>Everyone can view & add. Only admin can edit & delete.</small>
          <input type="file" ref={fileRef} />
        </div>
        <DataTable
          columns={[
            { header:"Customer ID", accessor:"customerId" },
            { header:"Name", accessor:"name" },
            { header:"Mobile", accessor:"mobile", cell:(v)=> v ? <a className="whatsapp" href={`https://wa.me/91${v}?text=Hello%20from%20Pradhan%20Finserv`} target="_blank">WhatsApp {v}</a> : "-" },
            { header:"Email", accessor:"email" }
          ]}
          rows={state.items}
          page={state.page}
          pages={state.pages}
          onPage={(p)=>setState(s=>({ ...s, page:p }))}
          onSearch={(q)=>setState(s=>({ ...s, q, page:1 }))}
          renderActions={(row)=>(<div style={{display:"flex", gap:6}}>
            <button className="btn secondary" disabled={!isAdmin} onClick={()=>setActiveId(row._id)}>Upload KYC</button>
            {activeId===row._id && <>
              <button className="btn" onClick={()=>uploadKyc(row._id,"PAN")}>Upload PAN</button>
              <button className="btn" onClick={()=>uploadKyc(row._id,"AADHAAR")}>Upload Aadhaar</button>
            </>}
            <button className="btn danger" disabled={!isAdmin} onClick={async()=>{ await API.delete(`/customers/${row._id}`); load(); }}>Delete</button>
          </div>)}
        />
      </div>
    </div>
  );
}
