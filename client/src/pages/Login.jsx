import React, { useState } from "react";
import API from "../services/api";

export default function Login(){
  const [email,setEmail] = useState("admin@dsa.local");
  const [password,setPassword] = useState("Admin@123");
  const [error,setError] = useState("");

  const submit = async (e)=>{
    e.preventDefault();
    try{
      const { data } = await API.post("/auth/login",{email,password});
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      location.href = "/dashboard";
    }catch(err){
      setError(err.response?.data?.message || "Login failed");
    }
  };
  return (
    <div style={{maxWidth:360, margin:"10% auto"}} className="card">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <label>Email</label>
        <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div style={{color:"red"}}>{error}</div>}
        <div style={{display:"flex", gap:8, marginTop:12}}>
          <button className="btn" type="submit">Login</button>
        </div>
      </form>
    </div>
  );
}
