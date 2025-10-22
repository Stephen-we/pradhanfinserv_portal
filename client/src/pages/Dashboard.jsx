// client/src/pages/Dashboard.jsx - FIXED FREE POOL CALCULATION
import React, { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import {
  PieChart, Pie, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Legend, LineChart, Line, ResponsiveContainer,
  Cell, AreaChart, Area
} from "recharts";
import {
  FiUsers, FiTrendingUp, FiClock, FiDatabase, FiCheckCircle,
  FiFilter, FiActivity, FiX, FiRefreshCw, FiDollarSign,
  FiTarget, FiPercent, FiBox, FiUserPlus, FiHome,
  FiCalendar, FiChevronDown
} from "react-icons/fi";
import "../styles/Dashboard.css";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const fmtINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [showSlicer, setShowSlicer] = useState(false);
  const [timeOptions, setTimeOptions] = useState({ months: [], years: [] });
  
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    partner: "",
    bank: "",
    branch: "",
    leadType: "",
    subType: "",
    timeRange: "month",
    month: "",
    year: ""
  });

  // Load time options on component mount
  useEffect(() => {
    loadTimeOptions();
  }, []);

  const loadTimeOptions = async () => {
    try {
      const { data } = await API.get("/metrics/time-options");
      setTimeOptions(data);
      
      // Set default to current month/year
      const currentDate = new Date();
      setFilters(prev => ({
        ...prev,
        month: String(currentDate.getMonth() + 1),
        year: String(currentDate.getFullYear())
      }));
    } catch (error) {
      console.error("Failed to load time options:", error);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/metrics/overview", { 
        params: filters 
      });
      setMetrics(data);
    } catch (e) {
      console.error("📉 Dashboard load failed:", e);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (filters.month && filters.year) {
      load(); 
    }
  }, [filters.timeRange, filters.month, filters.year]);

  const k = metrics?.kpis || {};
  const breakdowns = metrics?.breakdowns || {};
  const series = metrics?.series || {};
  const funnel = metrics?.funnel || { leads: 0, cases: 0, customers: 0, freePool: 0 };

  // ====== Enhanced Calculations ======
  const salesCommission = useMemo(() => {
    const disb = k.totalDisbursed || 0;
    const baseRate = 0.007;
    const performanceBonus = disb > 10000000 ? 0.003 : 0.001;
    return disb * (baseRate + performanceBonus);
  }, [k.totalDisbursed]);

  const avgCommissionRate = useMemo(() => {
    return salesCommission / (k.totalDisbursed || 1) * 100;
  }, [salesCommission, k.totalDisbursed]);

  // ====== Helper Functions ======
  const toNameValue = (arr, label = "_id", value = "count") =>
    (arr || []).filter(r => r[label]).map(r => ({ 
      name: String(r[label]), 
      value: r[value] || 0
    }));

  const toMonthSeries = (arr, key = "count") =>
    (arr || []).map(r => ({
      name: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      value: r[key] || 0,
      amount: r.amount || 0
    }));

  // ====== Derived Metrics ======
  const leadTypeDist = useMemo(() => toNameValue(breakdowns.leadType), [metrics]);
  const subTypeDist = useMemo(() => toNameValue(breakdowns.subType), [metrics]);
  const bankDist = useMemo(() => toNameValue(breakdowns.banks), [metrics]);
  const partnerDist = useMemo(() => toNameValue(breakdowns.partners), [metrics]);
  const branchDist = useMemo(() => toNameValue(breakdowns.branches), [metrics]);
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

  // ====== Event Handlers ======
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleTimeRangeChange = (range) => {
    setFilters(prev => ({ ...prev, timeRange: range }));
  };

  const applyFilters = () => { 
    setShowSlicer(false); 
    load(); 
  };

  const resetFilters = () => {
    const currentDate = new Date();
    setFilters({
      from: "",
      to: "",
      partner: "",
      bank: "",
      branch: "",
      leadType: "",
      subType: "",
      timeRange: "month",
      month: String(currentDate.getMonth() + 1),
      year: String(currentDate.getFullYear())
    });
    setTimeout(() => load(), 100);
  };

  // Get current selected period label
  const getPeriodLabel = () => {
    if (filters.timeRange === 'year') {
      return filters.year || 'Current Year';
    } else {
      const monthName = new Date(2000, parseInt(filters.month) - 1, 1).toLocaleString('default', { month: 'long' });
      return `${monthName} ${filters.year}`;
    }
  };

  // =====================================================================
  return (
    <div className="dashboard">
      {/* ===== Enhanced Header with Month/Year Selection ===== */}
      <header className="dash-header">
        <div className="header-main">
          <h1>📊 DSA Performance Dashboard</h1>
          <div className="period-selector">
            <div className="time-range-selector">
              <button 
                className={`time-btn ${filters.timeRange === 'month' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('month')}
              >
                Monthly
              </button>
              <button 
                className={`time-btn ${filters.timeRange === 'quarter' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('quarter')}
              >
                Quarterly
              </button>
              <button 
                className={`time-btn ${filters.timeRange === 'year' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('year')}
              >
                Yearly
              </button>
            </div>
            
            <div className="month-year-selector">
              {filters.timeRange !== 'year' && (
                <select 
                  name="month" 
                  value={filters.month} 
                  onChange={handleChange}
                  className="month-select"
                >
                  <option value="">Select Month</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              )}
              
              <select 
                name="year" 
                value={filters.year} 
                onChange={handleChange}
                className="year-select"
              >
                <option value="">Select Year</option>
                {timeOptions.years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <div className="current-period">
                <FiCalendar />
                {getPeriodLabel()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <button className="btn refresh-btn" onClick={load} disabled={loading}>
            <FiRefreshCw className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <button className="btn slicer-btn" onClick={() => setShowSlicer(true)}>
            <FiFilter /> Advanced Filters
          </button>
        </div>
      </header>

      {/* ===== Loading / No Data ===== */}
      {loading ? (
        <div className="card loading-card">
          <FiRefreshCw className="spinning" /> Loading Dashboard Data...
        </div>
      ) : !metrics ? (
        <div className="card error-card">
          ❌ No data available for selected period. Please check your filters.
        </div>
      ) : (
        <>
          {/* ===== ENHANCED KPI CARDS ===== */}
          <section className="kpi-grid">
            {/* Lead Metrics */}
            <div className="kpi-card primary">
              <FiDatabase />
              <div>
                <h3>Total Leads</h3>
                <p>{k.leadsTotal ?? 0}</p>
                <small>Leads created in period</small>
              </div>
            </div>
            
            <div className="kpi-card warning">
              <FiHome />
              <div>
                <h3>Free Pool</h3>
                <p>{k.freePoolCount ?? 0}</p>
                <small>Available for assignment</small>
              </div>
            </div>
            
            <div className="kpi-card info">
              <FiUsers />
              <div>
                <h3>Archived Leads</h3>
                <p>{k.leadsArchived ?? 0}</p>
                <small>Not converted to cases</small>
              </div>
            </div>

            {/* Case Metrics */}
            <div className="kpi-card secondary">
              <FiBox />
              <div>
                <h3>Total Cases</h3>
                <p>{k.casesTotal ?? 0}</p>
                <small>Active processing</small>
              </div>
            </div>

            {/* Customer Metrics */}
            <div className="kpi-card success">
              <FiUserPlus />
              <div>
                <h3>Open Customers</h3>
                <p>{k.customersOpen ?? 0}</p>
                <small>Currently active</small>
              </div>
            </div>
            
            <div className="kpi-card completed">
              <FiCheckCircle />
              <div>
                <h3>Closed Customers</h3>
                <p>{k.customersClose ?? 0}</p>
                <small>Successfully completed</small>
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="kpi-card financial">
              <FiTarget />
              <div>
                <h3>Total Requirement</h3>
                <p>{fmtINR(k.totalRequirement)}</p>
                <small>Loan amount sought</small>
              </div>
            </div>
            
            <div className="kpi-card financial">
              <FiTrendingUp />
              <div>
                <h3>Total Disbursed</h3>
                <p>{fmtINR(k.totalDisbursed)}</p>
                <small>Actual disbursement</small>
              </div>
            </div>

            {/* Commission Metrics */}
            <div className="kpi-card revenue">
              <FiDollarSign />
              <div>
                <h3>Sales Commission</h3>
                <p>{fmtINR(k.salesCommission)}</p>
                <small>Avg rate: {k.avgCommissionRate}%</small>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="kpi-card performance">
              <FiActivity />
              <div>
                <h3>Conversion Rate</h3>
                <p>{k.conversionRate}%</p>
                <small>Lead to customer</small>
              </div>
            </div>
            
            <div className="kpi-card performance">
              <FiClock />
              <div>
                <h3>Lead → Case</h3>
                <p>{k.avgLeadToCaseDays} days</p>
                <small>Average duration</small>
              </div>
            </div>
            
            <div className="kpi-card performance">
              <FiClock />
              <div>
                <h3>Case → Disb</h3>
                <p>{k.avgCaseToDisbDays} days</p>
                <small>Processing time</small>
              </div>
            </div>
          </section>

          {/* ===== Funnel & Progress ===== */}
          <section className="charts-grid">
            <div className="chart-card">
              <h3>Sales Funnel (Lead → Case → Customer)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { stage: "Leads", value: funnel.leads || 0, fill: '#3b82f6' },
                  { stage: "Cases", value: funnel.cases || 0, fill: '#f59e0b' },
                  { stage: "Customers", value: funnel.customers || 0, fill: '#10b981' },
                  { stage: "Free Pool", value: funnel.freePool || 0, fill: '#8b5cf6' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {[
                      { stage: "Leads", value: funnel.leads || 0, fill: '#3b82f6' },
                      { stage: "Cases", value: funnel.cases || 0, fill: '#f59e0b' },
                      { stage: "Customers", value: funnel.customers || 0, fill: '#10b981' },
                      { stage: "Free Pool", value: funnel.freePool || 0, fill: '#8b5cf6' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Eligibility Progress (Requirement vs Disbursement)</h3>
              <div className="progress-wrapper">
                <div className="progress-top">
                  <span className="requirement">Requirement: {fmtINR(k.totalRequirement)}</span>
                  <span className="disbursed">Disbursed: {fmtINR(k.totalDisbursed)}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${Math.min(gapPct, 100)}%`,
                      backgroundColor: gapPct >= 75 ? '#10b981' : gapPct >= 50 ? '#f59e0b' : '#ef4444'
                    }} 
                  />
                </div>
                <div className="progress-foot">
                  <span className="achieved">{gapPct}% Achieved</span>
                  <span className="gap">Gap: {fmtINR(k.eligibilityGap || (k.totalRequirement - k.totalDisbursed))}</span>
                </div>
              </div>
              <div className="prediction">
                <FiTrendingUp />
                Predicted next month disbursement: <b>{fmtINR(k.predictedNextMonthDisbursement)}</b>
              </div>
            </div>

            <div className="chart-card">
              <h3>Case Status Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie 
                    data={statusDist} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    label 
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Cases']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Lead Type & Subtype Analysis ===== */}
          <section className="charts-grid">
            <div className="chart-card">
              <h3>Lead Type Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie 
                    data={leadTypeDist} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    label 
                  >
                    {leadTypeDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Leads']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-card">
              <h3>Sub Type Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subTypeDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#9333ea" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-card">
              <h3>Bank Performance</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bankDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Partners & Branches Analysis ===== */}
          <section className="charts-grid">
            <div className="chart-card">
              <h3>Top Channel Partners</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={partnerDist.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b">
                    {partnerDist.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Branch Performance</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={branchDist.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6">
                    {branchDist.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card wide">
              <h3>Monthly Trends (Leads & Cases)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={leadsMonthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="value" name="Leads" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="value" name="Cases" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} data={casesMonthly} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Financial Trends ===== */}
          <section className="charts-grid">
            <div className="chart-card wide">
              <h3>Monthly Finance (Requirement vs Disbursement)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [fmtINR(value), 'Amount']} />
                  <Legend />
                  <Line 
                    data={reqMonthly} 
                    dataKey="value" 
                    name="Requirement" 
                    stroke="#9333ea" 
                    strokeWidth={3} 
                    dot={{ fill: '#9333ea', r: 4 }} 
                  />
                  <Line 
                    data={disbMonthly} 
                    dataKey="value" 
                    name="Disbursed" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10b981', r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ===== Activity & Logs ===== */}
          <section className="cards-grid">
            <div className="card">
              <h3>Recent Activity</h3>
              <div className="three-col">
                <div className="activity-section">
                  <h4>📥 New Leads</h4>
                  <ul className="mini-list">
                    {(metrics.recent?.leads || []).slice(0, 5).map(r => (
                      <li key={r._id}>
                        <b>{r.leadId}</b> — {r.name} 
                        <br /><small>{new Date(r.createdAt).toLocaleDateString()}</small>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="activity-section">
                  <h4>📋 New Cases</h4>
                  <ul className="mini-list">
                    {(metrics.recent?.cases || []).slice(0, 5).map(r => (
                      <li key={r._id}>
                        <b>{r.caseId}</b> — {r.customerName} 
                        <br /><small>{fmtINR(r.amount || 0)}</small>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="activity-section">
                  <h4>✅ New Customers</h4>
                  <ul className="mini-list">
                    {(metrics.recent?.customers || []).slice(0, 5).map(r => (
                      <li key={r._id}>
                        <b>{r.customerId}</b> — {r.name} 
                        <br /><small className={`status-${r.status}`}>{r.status?.toUpperCase()}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Recent Audit Log</h3>
              <ul className="mini-list audit-logs">
                {(metrics.recent?.logs || []).slice(0, 8).map(log => (
                  <li key={log._id} className="audit-item">
                    <div className="audit-action">
                      <span className={`action-type ${log.action}`}>{log.action}</span>
                      {log.actor?.name || "System"}
                    </div>
                    <div className="audit-details">
                      {log.entityType && <span>on {log.entityType}</span>}
                      {log.entityId && <span>({log.entityId})</span>}
                    </div>
                    <div className="audit-time">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      {/* ===== Enhanced Slicer Panel ===== */}
      {showSlicer && (
        <div className="slicer-overlay">
          <div className="slicer-panel enhanced">
            <div className="slicer-header">
              <h2>🔍 Advanced Dashboard Filters</h2>
              <button onClick={() => setShowSlicer(false)} className="close-btn">
                <FiX />
              </button>
            </div>

            <div className="slicer-body">
              <div className="filter-section">
                <label>Time Range</label>
                <select 
                  name="timeRange" 
                  value={filters.timeRange} 
                  onChange={handleChange}
                >
                  <option value="month">Monthly</option>
                  <option value="quarter">Quarterly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>

              <div className="filter-section">
                <label>Month</label>
                <select name="month" value={filters.month} onChange={handleChange}>
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <label>Year</label>
                <select name="year" value={filters.year} onChange={handleChange}>
                  <option value="">All Years</option>
                  {timeOptions.years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <label>Lead Type</label>
                <select name="leadType" value={filters.leadType} onChange={handleChange}>
                  <option value="">All Lead Types</option>
                  {breakdowns.leadType?.map(lt => (
                    <option key={lt._id} value={lt._id}>{lt._id} ({lt.count})</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <label>Sub Type</label>
                <select name="subType" value={filters.subType} onChange={handleChange}>
                  <option value="">All Sub Types</option>
                  {breakdowns.subType?.map(st => (
                    <option key={st._id} value={st._id}>{st._id} ({st.count})</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <label>Bank</label>
                <select name="bank" value={filters.bank} onChange={handleChange}>
                  <option value="">All Banks</option>
                  {breakdowns.banks?.map(bank => (
                    <option key={bank._id} value={bank._id}>{bank._id} ({bank.count})</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <label>Channel Partner</label>
                <select name="partner" value={filters.partner} onChange={handleChange}>
                  <option value="">All Partners</option>
                  {breakdowns.partners?.map(partner => (
                    <option key={partner._id} value={partner._id}>{partner._id} ({partner.count})</option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <label>Branch</label>
                <select name="branch" value={filters.branch} onChange={handleChange}>
                  <option value="">All Branches</option>
                  {breakdowns.branches?.map(branch => (
                    <option key={branch._id} value={branch._id}>{branch._id} ({branch.count})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="slicer-footer">
              <button className="btn secondary" onClick={resetFilters}>
                <FiRefreshCw /> Reset & Refresh
              </button>
              <button className="btn success" onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}