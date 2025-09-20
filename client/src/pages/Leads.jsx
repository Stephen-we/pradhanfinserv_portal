// client/src/pages/Leads.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import DataTable from "../components/DataTable";

function Leads() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: [], page: 1, pages: 1, q: "" });

  const load = () => {
    API.get("/leads", { params: { page: state.page, q: state.q } })
      .then((r) => {
        setState((s) => ({
          ...s,
          items: r.data.items || [],   // ✅ make sure items exists
          pages: r.data.pages || 1
        }));
      })
      .catch((err) => console.error("❌ Error loading leads:", err));
  };

  useEffect(() => {
    load();
  }, [state.page, state.q]);

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h1>Leads</h1>
        <button className="btn" onClick={() => navigate("/leads/new")}>
          + Add Lead
        </button>
      </header>

      <DataTable
        columns={[
          { header: "Sr.No.", accessor: (row, i) => (state.page - 1) * 10 + i + 1 },
          { header: "Lead ID", accessor: "leadId" },
          { header: "Customer Name", accessor: "name" },
          { header: "Mobile", accessor: "mobile" },
          { header: "Email", accessor: "email" },
          { header: "Lead Type", accessor: "leadType" },
          { header: "Status", accessor: "status" }
        ]}
        rows={state.items}
        page={state.page}
        pages={state.pages}
        onPage={(p) => setState((s) => ({ ...s, page: p }))}
        onSearch={(q) => setState((s) => ({ ...s, q, page: 1 }))}
      />
    </div>
  );
}

export default Leads;   // ✅ FIXED
