// client/src/pages/Partners.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import DataTable from "../components/DataTable";
import "../styles/Partners.css";

export default function Partners() {
  const [state, setState] = useState({ items: [], page: 1, pages: 1, q: "" });
  const [form, setForm] = useState({ 
    name: "", 
    contactNumber: "", 
    products: [], 
    commission: 0 
  });
  const [deleteTarget, setDeleteTarget] = useState(null); // ✅ for modal
  const navigate = useNavigate();
  
  // Get user role from localStorage (same as branches)
  const role = (JSON.parse(localStorage.getItem("user") || "{}").role) || "";

  const load = () => 
    API.get("/channel-partners", { params: { page: state.page, q: state.q } })
      .then(r => setState(s => ({ ...s, items: r.data.items, pages: r.data.pages })));

  useEffect(() => { 
    load(); 
  }, [state.page, state.q]);

  const add = async () => { 
    if (!form.name || !form.contactNumber) {
      alert("Please enter name and contact number");
      return;
    }
    if (!/^\d{10}$/.test(form.contactNumber)) {
      alert("Contact number must be exactly 10 digits");
      return;
    }
    
    await API.post("/channel-partners", form); 
    setForm({ name: "", contactNumber: "", products: [], commission: 0 }); 
    load(); 
  };

  // ✅ Delete with modal confirmation (like branches)
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/channel-partners/${deleteTarget._id}`);
      setDeleteTarget(null);
      load();
    } catch {
      alert("Error deleting partner");
    }
  };

  return (
    <div>
      <header>
        <h1>Channel Partners</h1>
      </header>
      
      <div className="card">
        <div className="toolbar">
          <input 
            className="input" 
            placeholder="Name" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
          />
          <input 
            className="input" 
            type="tel"
            placeholder="Contact Number"
            value={form.contactNumber} 
            onChange={e => {
              const val = e.target.value.replace(/\D/g, ""); // digits only
              if (val.length <= 10) {
                setForm({...form, contactNumber: val});
              }
            }}
            pattern="[0-9]{10}"
            title="Please enter a 10-digit number"
            required
          />
          <input 
            className="input" 
            placeholder="Products (comma separated)" 
            value={(form.products || []).join(", ")} 
            onChange={e => setForm({...form, products: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} 
          />
          <input 
            className="input" 
            placeholder="Commission %" 
            type="number"
            value={form.commission} 
            onChange={e => setForm({...form, commission: Number(e.target.value || 0)})} 
          />
          
          <button className="btn" onClick={add}>
            + Add Partner
          </button>
        </div>
      </div>

      <DataTable
        columns={[
          {
            header: "Sr.No.",
            accessor: (row, i) => (state.page - 1) * 10 + i + 1,
          },
          { 
            header: "Partner ID", 
            accessor: (row, i, exportMode) =>
              exportMode ? (
                row.partnerId
              ) : (
                <span
                  style={{
                    color: "#2563eb",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => navigate(`/partners/${row._id}/view`)}
                >
                  {row.partnerId}
                </span>
              )
          },
          { header: "Name", accessor: "name" },
          { 
            header: "Products", 
            accessor: (row) => (row.products || []).join(", ")
          },
          { header: "Commission %", accessor: "commission" },
          { 
            header: "Contact", 
            accessor: (row) => row.contactNumber ? (
              <a className="whatsapp" href={`https://wa.me/91${row.contactNumber}`} target="_blank" rel="noopener noreferrer">
                {row.contactNumber}
              </a>
            ) : "-"
          },
          {
            header: "Actions",
            accessor: (row) => (
              <div style={{ display: "flex", gap: 8 }}>
                {/* ✅ Delete Button - Only for admin/superadmin (like branches) */}
                {(role === "admin" || role === "superadmin") && (
                  <button
                    className="btn danger"
                    onClick={() => setDeleteTarget(row)} // open modal
                  >
                    Delete
                  </button>
                )}
              </div>
            ),
          }
        ]}
        rows={state.items}
        page={state.page}
        pages={state.pages}
        onPage={(p) => setState(s => ({ ...s, page: p }))}
        onSearch={(q) => setState(s => ({ ...s, q, page: 1 }))}
      />

      {/* ✅ Custom Delete Modal (exactly like branches) */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal red">
            <h3>⚠️ Confirm Delete</h3>
            <p>
              Are you sure you want to delete{" "}
              <b>{deleteTarget.name}</b> ({deleteTarget.partnerId})?
            </p>
            <div className="actions">
              <button
                className="btn secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn danger" onClick={confirmDelete}>
                Delete
              </button>
            </div> 
          </div>
        </div>
      )}
    </div>
  );
}