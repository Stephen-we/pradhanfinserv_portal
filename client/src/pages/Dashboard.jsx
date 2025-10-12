import React, { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import {
  PieChart, Pie, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Legend, LineChart, Line, ResponsiveContainer
} from "recharts";
import {
  FiUsers, FiTrendingUp, FiClock, FiDatabase, FiCheckCircle,
  FiFilter, FiActivity, FiX
} from "react-icons/fi";
import "../styles/Dashboard.css";

const fmtINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [showSlicer, setShowSlicer] = useState(false);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    partner: "",
    bank: "",
    leadType: "",
    subType: ""
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/metrics/overview", { params: filters });
      setMetrics(data);
    } catch (e) {
      console.error("📉 Dashboard load failed:", e);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const k = metrics?.kpis || {};
  const breakdowns = metrics?.breakdowns || {};
  const series = metrics?.series || {};
  const funnel = metrics?.funnel || { leads: 0, cases: 0, customers: 0 };

  // ====== Helpers ======
  const toNameValue = (arr, label = "_id", value = "count") =>
    (arr || []).filter(r => r[label]).map(r => ({ name: String(r[label]), value: r[value] || 0 }));

  const toMonthSeries = (arr, key = "count") =>
    (arr || []).map(r => ({
      name: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      value: r[key] || 0
    }));

  // ====== Derived Metrics ======
  const leadTypeDist = useMemo(() => toNameValue(breakdowns.leadType), [metrics]);
  const subTypeDist = useMemo(() => toNameValue(breakdowns.subType), [metrics]);
  const bankDist = useMemo(() => toNameValue(breakdowns.banks), [metrics]);
  const partnerDist = useMemo(() => toNameValue(breakdowns.partners), [metrics]);
  const statusDist = useMemo(() => toNameValue(breakdowns.caseStatus), [metrics]);

  const leadsMonthly = useMemo(() => toMonthSeries(series.leads, "count"), [metrics]);
  const casesMonthly = useMemo(() => toMonthSeries(series.cases, "count"), [metrics]);
  const disbMonthly = useMemo(() => toMonthSeries(series.disbursements, "total"), [metrics]);
  const reqMonthly = useMemo(() => toMonthSeries(series.requirements, "total"), [metrics]);

  const gapPct = useMemo(() => {
    const req = k.totalRequirement || 0;
    const disb = k.totalDisbursed || 0;
    return req > 0 ? Math.round((disb / req) * 100) : 0;
  }, [k]);

  const handleChange = (e) => setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  const applyFilters = () => { setShowSlicer(false); load(); };
  const resetFilters = () => setFilters({ from: "", to: "", partner: "", bank: "", leadType: "", subType: "" });

  // =====================================================================
  return (
    <div className="dashboard">
      {/* ===== Header ===== */}
      <header className="dash-header">
        <h1>📊 DSA Performance Dashboard</h1>
        <button className="btn slicer-btn" onClick={() => setShowSlicer(true)}>
          <FiFilter /> Slicer
        </button>
      </header>

      {/* ===== Loading / No Data ===== */}
      {loading ? (
        <div className="card" style={{ textAlign: "center" }}>Loading…</div>
      ) : !metrics ? (
        <div className="card" style={{ textAlign: "center" }}>No data available</div>
      ) : (
        <>
          {/* ===== KPI CARDS ===== */}
          <section className="kpi-grid">
            <div className="kpi-card"><FiDatabase /><div><h3>Total Leads</h3><p>{k.leadsTotal ?? 0}</p></div></div>
            <div className="kpi-card"><FiUsers /><div><h3>Archived Leads</h3><p>{k.leadsArchived ?? 0}</p></div></div>
            <div className="kpi-card"><FiDatabase /><div><h3>Total Cases</h3><p>{k.casesTotal ?? 0}</p></div></div>
            <div className="kpi-card"><FiUsers /><div><h3>Customers (Open)</h3><p>{k.customersOpen ?? 0}</p></div></div>
            <div className="kpi-card"><FiUsers /><div><h3>Customers (Close)</h3><p>{k.customersClose ?? 0}</p></div></div>
            <div className="kpi-card"><FiTrendingUp /><div><h3>Total Requirement</h3><p>{fmtINR(k.totalRequirement)}</p></div></div>
            <div className="kpi-card"><FiTrendingUp /><div><h3>Total Disbursed</h3><p>{fmtINR(k.totalDisbursed)}</p></div></div>
            <div className="kpi-card"><FiCheckCircle /><div><h3>1% Sales</h3><p>{fmtINR((k.totalDisbursed || 0) * 0.01)}</p></div></div>
            <div className="kpi-card"><FiClock /><div><h3>Lead → Case</h3><p>{k.avgLeadToCaseDays} days</p></div></div>
            <div className="kpi-card"><FiClock /><div><h3>Case → Disb</h3><p>{k.avgCaseToDisbDays} days</p></div></div>
            <div className="kpi-card"><FiActivity /><div><h3>Conversion</h3><p>{k.conversionRate}%</p></div></div>
          </section>

          {/* ===== Funnel & Progress ===== */}
          <section className="charts-grid">
            <div className="chart-card">
              <h3>Funnel (Lead → Case → Customer)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { stage: "Leads", value: funnel.leads || 0 },
                  { stage: "Cases", value: funnel.cases || 0 },
                  { stage: "Customers", value: funnel.customers || 0 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Eligibility Progress (Requirement vs Disbursement)</h3>
              <div className="progress-wrapper">
                <div className="progress-top">
                  <span>Requirement: {fmtINR(k.totalRequirement)}</span>
                  <span>Disbursed: {fmtINR(k.totalDisbursed)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(gapPct, 100)}%` }} />
                </div>
                <div className="progress-foot">
                  {gapPct}% Achieved — Gap: {fmtINR(k.eligibilityGap || (k.totalRequirement - k.totalDisbursed))}
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
                Predicted next month disbursement: <b>{fmtINR(k.predictedNextMonthDisbursement)}</b>
              </div>
            </div>

            <div className="chart-card">
              <h3>Case Status</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" outerRadius={90} label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Lead/Subtype/Bank ===== */}
          <section className="charts-grid">
            <div className="chart-card"><h3>Lead Type</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart><Pie data={leadTypeDist} dataKey="value" nameKey="name" outerRadius={90} label /><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card"><h3>Sub Type</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart><Pie data={subTypeDist} dataKey="value" nameKey="name" outerRadius={90} label /><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card"><h3>Banks</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bankDist}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#9333ea" /></BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Partners & Trends ===== */}
          <section className="charts-grid">
            <div className="chart-card"><h3>Top Channel Partners</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={partnerDist}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#10b981" /></BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card wide"><h3>Monthly Trends (Leads & Cases)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" type="category" allowDuplicatedCategory={false} /><YAxis /><Tooltip /><Legend />
                  <Line data={leadsMonthly} dataKey="value" name="Leads" stroke="#2563eb" strokeWidth={2} />
                  <Line data={casesMonthly} dataKey="value" name="Cases" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card wide"><h3>Monthly Finance (Requirement vs Disbursement)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" type="category" allowDuplicatedCategory={false} /><YAxis /><Tooltip /><Legend />
                  <Line data={reqMonthly} dataKey="value" name="Requirement" stroke="#9333ea" strokeWidth={2} />
                  <Line data={disbMonthly} dataKey="value" name="Disbursed" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Activity & Logs ===== */}
          <section className="cards-grid">
            <div className="card">
              <h3>Recent Activity</h3>
              <div className="two-col">
                <div>
                  <h4>Leads</h4>
                  <ul className="mini-list">
                    {(metrics.recent?.leads || []).map(r => (
                      <li key={r._id}><b>{r.leadId}</b> — {r.name} — {new Date(r.createdAt).toLocaleDateString()}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Cases</h4>
                  <ul className="mini-list">
                    {(metrics.recent?.cases || []).map(r => (
                      <li key={r._id}><b>{r.caseId}</b> — {r.customerName} — {fmtINR(r.amount || 0)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Customers</h4>
                  <ul className="mini-list">
                    {(metrics.recent?.customers || []).map(r => (
                      <li key={r._id}><b>{r.customerId}</b> — {r.name} — {r.status?.toUpperCase()}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Audit Log (Who did what)</h3>
              <ul className="mini-list">
                {(metrics.recent?.logs || []).map(log => (
                  <li key={log._id}>
                    <b>{log.action}</b> by {log.actor?.name || "System"}
                    {log.entityType ? ` on ${log.entityType}` : ""}{log.entityId ? ` (${log.entityId})` : ""} — {new Date(log.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      {/* ===== SLICER PANEL ===== */}
      {showSlicer && (
        <div className="slicer-overlay">
          <div className="slicer-panel">
            <div className="slicer-header">
              <h2>🔍 Dashboard Filters</h2>
              <button onClick={() => setShowSlicer(false)} className="close-btn"><FiX /></button>
            </div>

            <div className="slicer-body">
              <label>Date Range</label>
              <div className="date-range">
                <input type="date" name="from" value={filters.from} onChange={handleChange} />
                <input type="date" name="to" value={filters.to} onChange={handleChange} />
              </div>

              <label>Lead Type</label>
              <input name="leadType" value={filters.leadType} onChange={handleChange} placeholder="e.g. Home Loan" />

              <label>Sub Type</label>
              <input name="subType" value={filters.subType} onChange={handleChange} placeholder="e.g. Balance Transfer" />

              <label>Bank</label>
              <input name="bank" value={filters.bank} onChange={handleChange} placeholder="e.g. HDFC Bank" />

              <label>Channel Partner</label>
              <input name="partner" value={filters.partner} onChange={handleChange} placeholder="Partner name or ID" />
            </div>

            <div className="slicer-footer">
              <button className="btn secondary" onClick={resetFilters}>Reset</button>
              <button className="btn success" onClick={applyFilters}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
