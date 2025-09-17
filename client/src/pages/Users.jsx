import React, { useEffect, useState } from "react";
import API from "../services/api";

export default function Users(){
  const [items,setItems] = useState([]);
  const [form,setForm] = useState({ name:"", email:"", password:"", role:"officer" });
  const load = ()=> API.get("/users").then(r=>setItems(r.data));
  useEffect(()=>{ load(); },[]);
  const create = async ()=>{ await API.post("/auth/admin/create", form); setForm({ name:"", email:"", password:"", role:"officer" }); load(); };
  const setRole = async (id, role)=>{ await API.patch(`/users/${id}/role`, { role }); load(); };
  const setActive = async (id, isActive)=>{ await API.patch(`/users/${id}/active`, { isActive }); load(); };
  const resetPass = async (id)=>{ const p = prompt("New password"); if (p){ await API.patch(`/users/${id}/password`, { password: p }); alert("Password updated"); } };
  return (
    <div>
      <header><h1>User Management</h1></header>
      <div className="card">
        <div className="toolbar">
          <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="input" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <input className="input" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
          <select className="input" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
            <option>admin</option><option>manager</option><option>officer</option><option>viewer</option>
          </select>
          <button className="btn" onClick={create}>Create User</button>
        </div>
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(u => <tr key={u._id}>
              <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.isActive?'Active':'Disabled'}</td>
              <td style={{display:'flex', gap:6}}>
                <select className="input" value={u.role} onChange={e=>setRole(u._id, e.target.value)}>
                  <option>admin</option><option>manager</option><option>officer</option><option>viewer</option>
                </select>
                <button className="btn secondary" onClick={()=>setActive(u._id, !u.isActive)}>{u.isActive?'Disable':'Enable'}</button>
                <button className="btn" onClick={()=>resetPass(u._id)}>Reset Password</button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
