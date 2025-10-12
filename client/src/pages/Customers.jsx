// client/src/pages/Customers.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Customers() {
  const [state, setState] = useState({ 
    items: [], 
    page: 1, 
    pages: 1, 
    q: "",
    bankFilter: "",
    statusFilter: ""
  });
  const [banks, setBanks] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin";
  const [activeId, setActiveId] = useState(null);

  // Load banks and status options from API
  useEffect(() => {
    const loadMetaData = async () => {
      try {
        setLoading(true);
        const [banksResponse, statusesResponse] = await Promise.all([
          API.get("/customers/meta/banks"),
          API.get("/customers/meta/statuses")
        ]);

        // Format banks for dropdown
        const bankOptions = banksResponse.data.map(bank => ({
          value: bank,
          label: bank
        }));
        setBanks(bankOptions);

        // Format statuses for dropdown
        const statusOptions = statusesResponse.data.map(status => ({
          value: status,
          label: status.charAt(0).toUpperCase() + status.slice(1)
        }));
        setStatusOptions(statusOptions);

      } catch (error) {
        console.error("Failed to load metadata:", error);
        // Fallback options
        setBanks([]);
        setStatusOptions([
          { value: "open", label: "Open" },
          { value: "close", label: "Close" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMetaData();
  }, []);

  const load = () =>
    API.get("/customers", { 
      params: { 
        page: state.page, 
        q: state.q,
        bank: state.bankFilter,
        status: state.statusFilter
      } 
    }).then((r) => {
      // ✅ Sort customers: open first, close later
      const sortedItems = [...r.data.items].sort((a, b) => {
        if ((a.status || "open") === (b.status || "open")) return 0;
        if ((a.status || "open") === "open") return -1;
        return 1;
      });
      setState((s) => ({
        ...s,
        items: sortedItems,
        pages: r.data.pages,
      }));
    });

  useEffect(() => {
    load();
  }, [state.page, state.q, state.bankFilter, state.statusFilter]);

  const uploadKyc = async (id, label) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", label);
      await API.post(`/customers/${id}/kyc/upload`, fd);
      setActiveId(null);
      load();
    };
    input.click();
  };

  const updateCustomerField = async (id, field, value) => {
    await API.patch(`/customers/${id}`, { [field]: value });
    load(); // ✅ will reload + re-sort automatically
  };

  const handleFilterChange = (filterType, value) => {
    setState((s) => ({ 
      ...s, 
      [filterType]: value,
      page: 1 // Reset to first page when filter changes
    }));
  };

  const clearFilters = () => {
    setState((s) => ({ 
      ...s, 
      bankFilter: "", 
      statusFilter: "",
      page: 1 
    }));
  };

  // Sample data for channel partners (you can make this dynamic too if needed)
  const channelPartners = [
    { value: "partner1", label: "Partner 1" },
    { value: "partner2", label: "Partner 2" },
    { value: "partner3", label: "Partner 3" },
  ];

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "20px" }}>
          Loading filters...
        </div>
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1>Customer Management</h1>
      </header>
      <div className="card">
        {/* Filter Section */}
        <div style={{ marginBottom: "20px", display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Bank Filter:
            </label>
            <select
              value={state.bankFilter}
              onChange={(e) => handleFilterChange("bankFilter", e.target.value)}
              className="input"
              style={{ minWidth: "150px" }}
            >
              <option value="">All Banks</option>
              {banks.map((bank) => (
                <option key={bank.value} value={bank.value}>
                  {bank.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Status Filter:
            </label>
            <select
              value={state.statusFilter}
              onChange={(e) => handleFilterChange("statusFilter", e.target.value)}
              className="input"
              style={{ minWidth: "150px" }}
            >
              <option value="">All Status</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {(state.bankFilter || state.statusFilter) && (
            <div style={{ alignSelf: "flex-end" }}>
              <button 
                className="btn secondary" 
                onClick={clearFilters}
                style={{ padding: "8px 16px" }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        <DataTable
          columns={[
            {
              header: "Customer ID",
              accessor: "customerId",
              cell: (value, row) => (
                <Link to={`/customers/${row._id}`} className="link">
                  {value}
                </Link>
              ),
            },
            { header: "Name", accessor: "name" },
            {
              header: "Mobile",
              accessor: "mobile",
              cell: (v) =>
                v ? (
                  <a
                    className="whatsapp"
                    href={`https://wa.me/91${v}?text=Hello%20from%20Pradhan%20Finserv`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp {v}
                  </a>
                ) : (
                  "-"
                ),
            },
            {
              header: "Channel Partner",
              accessor: "channelPartner",
              cell: (value, row) =>
                isAdmin ? (
                  <select
                    value={value || ""}
                    onChange={(e) =>
                      updateCustomerField(row._id, "channelPartner", e.target.value)
                    }
                    className="input"
                  >
                    <option value="">Select Partner</option>
                    {channelPartners.map((partner) => (
                      <option key={partner.value} value={partner.value}>
                        {partner.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  value || "-"
                ),
            },
            {
              header: "Bank Name",
              accessor: "bankName",
              cell: (value, row) =>
                isAdmin ? (
                  <select
                    value={value || ""}
                    onChange={(e) =>
                      updateCustomerField(row._id, "bankName", e.target.value)
                    }
                    className="input"
                  >
                    <option value="">Select Bank</option>
                    {banks.map((bank) => (
                      <option key={bank.value} value={bank.value}>
                        {bank.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  value || "-"
                ),
            },
            {
              header: "Status",
              accessor: "status",
              cell: (value, row) =>
                isAdmin ? (
                  <select
                    value={value || "open"}
                    onChange={(e) =>
                      updateCustomerField(row._id, "status", e.target.value)
                    }
                    className="input"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                ) : value ? (
                  value.charAt(0).toUpperCase() + value.slice(1)
                ) : (
                  "Open"
                ),
            },
          ]}
          rows={state.items}
          page={state.page}
          pages={state.pages}
          onPage={(p) => setState((s) => ({ ...s, page: p }))}
          onSearch={(q) => setState((s) => ({ ...s, q, page: 1 }))}
          renderActions={(row) => (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn secondary"
                disabled={!isAdmin}
                onClick={() => setActiveId(row._id)}
              >
                Upload KYC
              </button>
              {activeId === row._id && (
                <>
                  <button
                    className="btn"
                    onClick={() => uploadKyc(row._id, "PAN")}
                  >
                    Upload PAN
                  </button>
                  <button
                    className="btn"
                    onClick={() => uploadKyc(row._id, "AADHAAR")}
                  >
                    Upload Aadhaar
                  </button>
                </>
              )}
              <button
                className="btn danger"
                disabled={!isAdmin}
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete this customer?")) {
                    await API.delete(`/customers/${row._id}`);
                    load();
                  }
                }}
              >
                Delete
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}