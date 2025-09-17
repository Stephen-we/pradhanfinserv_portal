import React, { useEffect, useState } from "react";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Leads(){ 
  const [state,setState] = useState({ items:[], page:1, pages:1, q:"" });
  const load = ()=> API.get("/leads", { params: { page: state.page, q: state.q } }).then(r=>setState(s=>({ ...s, items:r.data.items, pages:r.data.pages })));
  useEffect(()=>{ load(); },[state.page, state.q]);

  return (<div>
    <header><h1>Leads</h1></header>
    <DataTable
      columns={[
        { header:"Name", accessor:"name" },
        { header:"Mobile", accessor:"mobile", cell:(v)=> v ? <a className="whatsapp" href={`https://wa.me/91${v}?text=Hello%20from%20Pradhan%20Finserv`} target="_blank">WhatsApp {v}</a> : "-" },
        { header:"Email", accessor:"email" },
        { header:"Status", accessor:"status" },
        { header:"Source", accessor:"source" }
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
