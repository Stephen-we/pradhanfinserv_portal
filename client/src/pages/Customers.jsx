// client/src/pages/Customers.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import DataTable from "../components/DataTable";

export default function Customers() {
  const [state, setState] = useState({ items: [], page: 1, pages: 1, q: "" });
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin";
  const [activeId, setActiveId] = useState(null);

  const load = () =>
    API.get("/customers", { params: { page: state.page, q: state.q } }).then(
      (r) => {
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
      }
    );

  useEffect(() => {
    load();
  }, [state.page, state.q]);

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

  // Sample data for dropdowns (replace with API in future)
  const channelPartners = [
    { value: "partner1", label: "Partner 1" },
    { value: "partner2", label: "Partner 2" },
    { value: "partner3", label: "Partner 3" },
  ];

  const banks = [
    { value: "bank1", label: "Bank 1" },
    { value: "bank2", label: "Bank 2" },
    { value: "bank3", label: "Bank 3" },
  ];

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "close", label: "Close" },
  ];

  return (
    <div>
      <header>
        <h1>Customer Management</h1>
      </header>
      <div className="card">
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
                  await API.delete(`/customers/${row._id}`);
                  load();
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
