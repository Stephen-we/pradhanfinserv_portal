import React, { useEffect, useState } from "react";
import API from "../services/api";
import DataTable from "../components/DataTable";

function Leads() {
  const [state, setState] = useState({
    items: [],
    page: 1,
    pages: 1,
    q: ""
  });

  const load = () =>
    API.get("/leads", {
      params: { page: state.page, q: state.q }
    }).then((r) =>
      setState((s) => ({
        ...s,
        items: r.data.items,
        pages: r.data.pages
      }))
    );

  useEffect(() => {
    load();
  }, [state.page, state.q]);

  return (
    <div>
      <header>
        <h1>Leads</h1>
      </header>

      <DataTable
        columns={[
          { header: "Sr.No", accessor: (row, i) => (state.page - 1) * 10 + i + 1 },
          { header: "Lead ID", accessor: "leadId" },
          {
            header: "Date",
            accessor: (row) => new Date(row.createdAt).toLocaleDateString()
          },
          { header: "Customer Name", accessor: "name" },
          {
            header: "Mobile Number",
            accessor: "mobile",
            cell: (v) =>
              v ? (
                <a
                  className="whatsapp"
                  href={`https://wa.me/91${v}?text=Hello%20from%20Pradhan%20Finserv`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp {v}
                </a>
              ) : (
                "-"
              )
          },
          { header: "Lead Type", accessor: "leadType" },
          { header: "Sub Type", accessor: "subType" },
          { header: "GD Status", accessor: "gdStatus" },
          {
            header: "Lead Ageing",
            accessor: (row) => {
              const diff = Date.now() - new Date(row.createdAt).getTime();
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              if (days < 1) return "Today";
              return `${days} days ago`;
            }
          },
          { header: "Lead Owner", accessor: (row) => row.assignedTo?.name || "Unassigned" }
        ]}
        rows={state.items}
        page={state.page}
        pages={state.pages}
        onPage={(p) => setState((s) => ({ ...s, page: p }))}
        onSearch={(q) => setState((s) => ({ ...s, q, page: 1 }))}
        renderActions={(row) => <></>}
      />
    </div>
  );
}

export default Leads;
