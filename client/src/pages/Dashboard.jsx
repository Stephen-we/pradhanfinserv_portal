import React, { useEffect, useState } from "react";
import API from "../services/api";
import { PieChart, Pie, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, ResponsiveContainer } from "recharts";

export default function Dashboard(){
  const [data,setData] = useState(null);
  const [cases,setCases] = useState([]);
  useEffect(()=>{ 
    API.get("/dashboard").then(r=>setData(r.data)); 
    API.get("/cases", { params: { limit: 100 } }).then(r=>setCases(r.data.items||[]));
  },[]);
  const k = data?.kpis || {};

  const loanTypeDist = Object.entries(cases.reduce((acc,c)=>{ acc[c.loanType]=(acc[c.loanType]||0)+1; return acc; },{}))
    .map(([name,value])=>({name,value}));

  const userPerf = Object.entries(cases.reduce((acc,c)=>{ const key = (c.assignedTo && c.assignedTo.name) || "Unassigned"; acc[key]=(acc[key]||0)+1; return acc; },{}))
    .map(([name,count])=>({name,count}));

  const disbTrend = cases.filter(c=>c.disbursedAmount>0).map(c=>({ name: (new Date(c.date)).toLocaleDateString(), amount: c.disbursedAmount }));

  return (
    <div>
      <header><h1>Dashboard</h1></header>
      <div className="kpi">
        <div className="card"><b>Total Leads</b><span>{k.totalLeads ?? "-"}</span></div>
        <div className="card"><b>Free Pool</b><span>{k.freePool ?? "-"}</span></div>
        <div className="card"><b>Archived</b><span>{k.archived ?? "-"}</span></div>
        <div className="card"><b>Deleted</b><span>{k.deleted ?? "-"}</span></div>
        <div className="card"><b>Active Loan Cases</b><span>{k.activeCases ?? "-"}</span></div>
        <div className="card"><b>Approved</b><span>{k.approved ?? "-"}</span></div>
        <div className="card"><b>Disbursed Amount</b><span>₹ {k.disbursedAmount ?? 0}</span></div>
      </div>

      <div className="card">
        <h3>Loan Type Distribution</h3>
        <div style={{width:"100%", height:300}}>
          <ResponsiveContainer>
            <PieChart>
              <Pie dataKey="value" isAnimationActive data={loanTypeDist} outerRadius={120} label />
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Performance by User</h3>
        <div style={{width:"100%", height:300}}>
          <ResponsiveContainer>
            <BarChart data={userPerf}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis/><Tooltip/><Legend/>
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Disbursement Trend</h3>
        <div style={{width:"100%", height:300}}>
          <ResponsiveContainer>
            <LineChart data={disbTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis/><Tooltip/>
              <Line type="monotone" dataKey="amount" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
