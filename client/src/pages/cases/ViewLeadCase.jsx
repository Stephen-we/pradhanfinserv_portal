// client/src/pages/cases/ViewLeadCase.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import { FiEdit } from "react-icons/fi";
import "../../styles/cases.css";

export default function ViewLeadCase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);

  useEffect(() => {
    API.get(`/cases/${id}`)
      .then(({ data }) => setCaseData(data))
      .catch(() => alert("Unable to load case"));
  }, [id]);

  if (!caseData) return <p>Loading...</p>;

  const show = (val) => (val && val !== "" ? val : "-");
  const goEdit = () => navigate(`/cases/${caseData._id}/edit`);

  return (
    <div className="card" style={{ maxWidth: 1200, margin: "auto" }}>
      {/* Header */}
      <header className="view-header">
        <h2>View Loan Case</h2>
        <FiEdit style={{ cursor: "pointer" }} size={22} onClick={goEdit} />
      </header>

      <div className="view-grid">
        {/* Case Details */}
        <div className="card-section">
          <h3>
            Case Details <FiEdit onClick={goEdit} />
          </h3>
          <p><b>Case ID:</b> {show(caseData.caseId)}</p>
          <p><b>Lead ID:</b> {show(caseData.leadId)}</p>
          <p><b>Loan Type:</b> {show(caseData.loanType)}</p>
          <p><b>Status:</b> {show(caseData.status)}</p>
          <p><b>Amount:</b> {show(caseData.amount)}</p>
          <p><b>Bank:</b> {show(caseData.bank)}</p>
          <p><b>Branch:</b> {show(caseData.branch)}</p>
        </div>

        {/* Applicant Details */}
        <div className="card-section">
          <h3>
            Applicant Details <FiEdit onClick={goEdit} />
          </h3>
          <p><b>Applicant 1:</b> {show(caseData.customerName)}</p>
          <p><b>Mobile:</b> {show(caseData.primaryMobile)}</p>
          <p><b>Email:</b> {show(caseData.email)}</p>
        </div>

        {/* Co-Applicant Details */}
        <div className="card-section">
          <h3>
            Co-Applicant Details <FiEdit onClick={goEdit} />
          </h3>
          <p><b>Name:</b> {show(caseData.applicant2Name)}</p>
          <p><b>Mobile:</b> {show(caseData.applicant2Mobile)}</p>
          <p><b>Email:</b> {show(caseData.applicant2Email)}</p>
        </div>

        {/* Contact Details */}
        <div className="card-section">
          <h3>
            Contact Details <FiEdit onClick={goEdit} />
          </h3>
          <p><b>Permanent Address:</b> {show(caseData.permanentAddress)}</p>
          <p><b>Current Address:</b> {show(caseData.currentAddress)}</p>
          <p><b>Site Address:</b> {show(caseData.siteAddress)}</p>
          <p><b>Office/Business Address:</b> {show(caseData.officeAddress)}</p>
        </div>

        {/* KYC Details */}
        <div className="card-section">
          <h3>
            KYC Details <FiEdit onClick={goEdit} />
          </h3>
          <p><b>PAN:</b> {show(caseData.pan)}</p>
          <p><b>Aadhar:</b> {show(caseData.aadhar)}</p>
        </div>
      </div>

      {/* Notes */}
      <div className="card-section" style={{ marginTop: 20 }}>
        <h3>Notes</h3>
        <p>{show(caseData.notes)}</p>
      </div>

      {/* Buttons (Back + Show Tasks) */}
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <button className="btn secondary" onClick={() => navigate("/cases")}>
          ← Back
        </button>
        <button
          className="btn primary"
          style={{ marginLeft: "10px" }}
          onClick={() => navigate(`/cases/${caseData._id}/tasks`)}
        >
          Show Tasks
        </button>
      </div>
    </div>
  );
}
