// client/src/pages/ViewBranch.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

export default function ViewBranch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);

  useEffect(() => {
    API.get(`/branches/${id}`)
      .then((res) => setBranch(res.data))
      .catch(() => alert("Failed to load branch details"));
  }, [id]);

  if (!branch) return <p>Loading...</p>;

  return (
    <div className="card" style={{ maxWidth: 720, margin: "auto" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h2>{branch.branchName}</h2>
        <button
          className="btn"
          title="Edit Branch"
          onClick={() => navigate(`/branches/${id}/edit`)}
        >
          ✏️ Edit
        </button>
      </div>

      <p><b>Branch ID:</b> {branch.branchId}</p>
      <p><b>Bank Name:</b> {branch.bankName}</p>
      <p><b>Branch Name:</b> {branch.branchName}</p>
      <p><b>Manager Number:</b> {branch.managerNumber}</p>

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <button className="btn secondary" onClick={() => navigate("/branches")}>
          Back
        </button>
      </div>
    </div>
  );
}
