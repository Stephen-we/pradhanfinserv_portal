// client/src/pages/leads/ViewLead.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import { FiEdit } from "react-icons/fi";

export default function ViewLead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);

  useEffect(() => {
    API.get(`/leads/${id}`)
      .then(({ data }) => setLead(data))
      .catch(() => alert("Unable to load lead"));
  }, [id]);

  if (!lead) return <p>Loading...</p>;

  const convertLead = () => {
    API.patch(`/leads/${lead._id}`, { status: "archived" })
      .then(() => navigate("/leads/archived"))
      .catch(() => alert("Failed to convert lead"));
  };

  return (
    <div className="card" style={{ maxWidth: 900 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>View Lead</h2>
        <FiEdit
          style={{ cursor: "pointer" }}
          size={22}
          onClick={() => navigate(`/leads/${lead._id}/edit`)}
        />
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div>
          <h3>Lead Details</h3>
          <p><b>Lead ID:</b> {lead.leadId}</p>
          <p><b>Created On:</b> {new Date(lead.createdAt).toLocaleDateString()}</p>
          <p><b>Branch:</b> {lead.branch}</p>
          <p><b>Lead Type:</b> {lead.leadType} - {lead.subType}</p>
          <p><b>Loan Amount:</b> {lead.requirementAmount}</p>
          <p><b>Sanctioned:</b> {lead.sanctionedAmount}</p>
          <p><b>Status:</b> {lead.status}</p>
        </div>
        <div>
          <h3>Contact Details</h3>
          <p><b>Customer Name:</b> {lead.name}</p>
          <p><b>Mobile:</b> {lead.mobile}</p>
          <p><b>Email:</b> {lead.email}</p>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Notes</h3>
        <p>{lead.notes || "No notes"}</p>
      </div>

      {/* ✅ Single footer with centered buttons */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <button className="btn secondary" onClick={() => navigate("/leads")}>
          Back
        </button>
        <button className="btn" onClick={convertLead}>
          Convert Lead
        </button>
      </div>
    </div>
  );
}
