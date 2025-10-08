// client/src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
// import API from "../services/api";
import { mockData } from "../mock/dashboardMock";

import {
  PieChart, Pie, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Legend, LineChart, Line, ResponsiveContainer
} from "recharts";
import { FiUsers, FiTrendingUp, FiClock, FiDatabase, FiCheckCircle } from "react-icons/fi";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cases, setCases] = useState([]);
  const [filters, setFilters] = useState({ year: "", loanType: "", user: "" });


  // temporarly
  useEffect(() => {
  setData({ kpis: mockData.kpis });
  setCases(mockData.cases);
  }, []);

  const k = data?.kpis || {};

  // ====== Charts Data ======
  const loanTypeDist = useMemo(() =>
    Object.entries(cases.reduce((acc, c) => {
      acc[c.loanType] = (acc[c.loanType] || 0) + 1;
      return acc;
    }, {})).map(([name, value]) => ({ name, value })), [cases]);

  const userPerf = useMemo(() =>
    Object.entries(cases.reduce((acc, c) => {
      const key = (c.assignedTo && c.assignedTo.name) || "Unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([name, count]) => ({ name, count })), [cases]);

  const disbTrend = useMemo(() =>
    cases
      .filter(c => c.disbursedAmount > 0)
      .map(c => ({
        name: new Date(c.date).toLocaleDateString(),
        amount: c.disbursedAmount
      })), [cases]);

  // ====== Aging Calculation ======
  const avgAging = useMemo(() => {
    const handled = cases.filter(c => c.createdAt && c.updatedAt);
    if (!handled.length) return "-";
    const totalMs = handled.reduce(
      (sum, c) => sum + (new Date(c.updatedAt) - new Date(c.createdAt)),
      0
    );
    return `${Math.round(totalMs / handled.length / (1000 * 60 * 60 * 24))} days`;
  }, [cases]);

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>📊 DSA Performance Dashboard</h1>
        <div className="filters">
          <select onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
            <option value="">All Years</option>
            <option value="2023">FY 2023–24</option>
            <option value="2024">FY 2024–25</option>
          </select>
          <select onChange={(e) => setFilters({ ...filters, loanType: e.target.value })}>
            <option value="">All Loans</option>
            {loanTypeDist.map((t) => <option key={t.name}>{t.name}</option>)}
          </select>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid">
        <div className="kpi-card"><FiDatabase /><div><h3>Total Leads</h3><p>{k.totalLeads ?? 0}</p></div></div>
        <div className="kpi-card"><FiUsers /><div><h3>Free Pool</h3><p>{k.freePool ?? 0}</p></div></div>
        <div className="kpi-card"><FiClock /><div><h3>Avg. Handling Time</h3><p>{avgAging}</p></div></div>
        <div className="kpi-card"><FiTrendingUp /><div><h3>Total Disbursement</h3><p>₹ {k.disbursedAmount ?? 0}</p></div></div>
        <div className="kpi-card"><FiCheckCircle /><div><h3>1% Sales</h3><p>₹ {((k.disbursedAmount || 0) * 0.01).toFixed(2)}</p></div></div>
      </section>

      {/* Charts Section */}
      <section className="charts-grid">
        <div className="chart-card">
          <h3>Loan Type Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie dataKey="value" data={loanTypeDist} outerRadius={110} label />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Performance by User</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={userPerf}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="count" fill="#5b21b6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card wide">
          <h3>Disbursement Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={disbTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis /><Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
