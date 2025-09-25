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
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get(`/cases/${id}`)
      .then(({ data }) => {
        setCaseData(data);
        setNotes(data.notes || "");
      })
      .catch(() => alert("Unable to load case"));
  }, [id]);

  if (!caseData) return <p>Loading...</p>;

  const show = (val) => (val && val !== "" ? val : "-");
  const goEdit = () => navigate(`/cases/${caseData._id}/edit`);

  const saveNotes = async () => {
    try {
      setSaving(true);
      await API.put(`/cases/${caseData._id}`, { notes });
      setSaving(false);
      alert("Notes updated successfully");
    } catch (err) {
      setSaving(false);
      alert("Failed to update notes");
    }
  };

  return (
    <div className="loan-card">
      {/* Header */}
      <header className="view-header">
        <h2>View Loan Case</h2>
      </header>

      <div className="loan-case-grid">
        {/* Case Details */}
        <div className="loan-section">
          <div className="section-header">
            <h3>Case Details</h3>
            <FiEdit onClick={goEdit} />
          </div>
          <p><b>Case ID:</b> {show(caseData.caseId)}</p>
          <p><b>Lead ID:</b> {show(caseData.leadId)}</p>
          <p><b>Loan Type:</b> {show(caseData.loanType)}</p>
          <p><b>Status:</b> {show(caseData.status)}</p>
          <p><b>Amount:</b> {show(caseData.amount)}</p>
          <p><b>Bank:</b> {show(caseData.bank)}</p>
          <p><b>Branch:</b> {show(caseData.branch)}</p>

          {/* Link provision */}
          {caseData.link && (
            <p>
              <b>Related Link:</b>{" "}
              <a href={caseData.link} target="_blank" rel="noreferrer">
                Open Link
              </a>
            </p>
          )}
        </div>

        {/* Applicant Details */}
        <div className="loan-section">
          <div className="section-header">
            <h3>Applicant Details</h3>
            <FiEdit onClick={goEdit} />
          </div>
          <p><b>Applicant 1:</b> {show(caseData.customerName)}</p>
          <p><b>Mobile:</b> {show(caseData.primaryMobile)}</p>
          <p><b>Email:</b> {show(caseData.email)}</p>
        </div>

        {/* Co-Applicant Details */}
        <div className="loan-section">
          <div className="section-header">
            <h3>Co-Applicant Details</h3>
            <FiEdit onClick={goEdit} />
          </div>
          <p><b>Name:</b> {show(caseData.applicant2Name)}</p>
          <p><b>Mobile:</b> {show(caseData.applicant2Mobile)}</p>
          <p><b>Email:</b> {show(caseData.applicant2Email)}</p>
        </div>

        {/* Contact Details */}
        <div className="loan-section">
          <div className="section-header">
            <h3>Contact Details</h3>
            <FiEdit onClick={goEdit} />
          </div>
          <p><b>Permanent Address:</b> {show(caseData.permanentAddress)}</p>
          <p><b>Current Address:</b> {show(caseData.currentAddress)}</p>
          <p><b>Site Address:</b> {show(caseData.siteAddress)}</p>
          <p><b>Office/Business Address:</b> {show(caseData.officeAddress)}</p>
        </div>

        {/* KYC Details */}
        <div className="loan-section">
          <div className="section-header">
            <h3>KYC Details</h3>
            <FiEdit onClick={goEdit} />
          </div>
          <p><b>PAN:</b> {show(caseData.pan)}</p>
          <p><b>Aadhar:</b> {show(caseData.aadhar)}</p>
        </div>
      </div>

      {/* Notes (editable) */}
      <div className="loan-section" style={{ marginTop: 20 }}>
        <h3>Notes / Working Stage</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="4"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            resize: "vertical",
          }}
        />
        <button
          className="btn primary"
          style={{ marginTop: "10px" }}
          onClick={saveNotes}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Notes"}
        </button>
      </div>

      {/* Buttons */}
      <div className="button-group">
        <button className="btn secondary" onClick={() => navigate("/cases")}>
          ← Back
        </button>
        <button
          className="btn primary"
          onClick={() => navigate(`/cases/${caseData._id}/tasks`)}
        >
          Show Tasks
        </button>
      </div>
    </div>
  );
}
