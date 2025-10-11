// client/src/pages/ViewCustomer.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiEdit, FiX } from "react-icons/fi";
import API from "../services/api";
import "../styles/viewCustomer.css";

export default function ViewCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [lead, setLead] = useState(null);
  const [caseData, setCaseData] = useState(null); // ✅ new
  const [disbursements, setDisbursements] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const noteTimeout = useRef(null);

  useEffect(() => {
    return () => {
      if (noteTimeout.current) clearTimeout(noteTimeout.current);
    };
  }, []);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      const { data } = await API.get(`/customers/${id}`);
      setCustomer(data);
      setNoteText(data.notes || "");
      if (data.leadId) loadLead(data.leadId);
      if (data.customerId) loadCase(data.customerId); // ✅ new
      loadDisbursements(data._id);
    } catch (err) {
      console.error("❌ Failed to load customer:", err);
      alert("Unable to load customer details");
    }
  };

  const loadLead = async (leadId) => {
    try {
      const { data } = await API.get(`/leads/${leadId}`);
      setLead(data);
    } catch (err) {
      console.error("❌ Failed to load lead:", err);
    }
  };

  // ✅ Fetch Case where case.leadId matches customer.customerId
  const loadCase = async (customerId) => {
    try {
      const { data } = await API.get(`/cases`, { params: { q: customerId } });
      if (data?.items?.length > 0) {
        setCaseData(data.items[0]);
      }
    } catch (err) {
      console.error("❌ Failed to load case:", err);
    }
  };

  const loadDisbursements = async () => {
    try {
      const { data } = await API.get(`/customers/${id}/disbursements`);
      setDisbursements(Array.isArray(data) ? data : []);
    } catch {
      setDisbursements([]);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("photo", file);
    await API.post(`/customers/${id}/photo`, fd);
    loadCustomer();
  };

  const handleRemovePhoto = async () => {
    await API.delete(`/customers/${id}/photo`);
    loadCustomer();
  };

  const buildPutPayload = (value) => {
    if (!customer) return { notes: value };
    const { _id, createdAt, updatedAt, __v, ...rest } = customer;
    return { ...rest, notes: value };
  };

  const saveNotes = async (value) => {
    try {
      await API.patch(`/customers/${id}`, { notes: value });
      return true;
    } catch (err) {
      try {
        await API.put(`/customers/${id}`, buildPutPayload(value));
        return true;
      } catch (err2) {
        console.error("PUT /customers/:id failed:", err2?.response?.data || err2?.message);
        return false;
      }
    }
  };

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setNoteText(value);
    setSaveStatus("saving");

    if (noteTimeout.current) clearTimeout(noteTimeout.current);
    noteTimeout.current = setTimeout(async () => {
      const ok = await saveNotes(value);
      setSaveStatus(ok ? "saved" : "error");
      if (ok) setCustomer((prev) => (prev ? { ...prev, notes: value } : prev));
      setTimeout(() => setSaveStatus(""), 1500);
    }, 1000);
  };

  if (!customer) return <div className="customer-profile">Loading...</div>;

  const isCustomerClosed = customer.status === "close";
  const sortedDisbursements = [...disbursements].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="customer-profile">
      {/* Header */}
      <div className="profile-header">
        <h2>Customer Profile</h2>
        <button className="icon-btn" onClick={() => navigate(`/customers/${id}/edit`)}>
          <FiEdit size={20} />
        </button>
      </div>

      <div className="profile-grid">
        {/* Sidebar */}
        <div className="profile-sidebar" style={{ height: "fit-content", minHeight: "400px" }}>
          <label className="avatar">
            {customer.photo ? (
              <>
                <img src={`http://localhost:5000${customer.photo}`} alt="Profile" />
                <button
                  className="remove-photo-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemovePhoto();
                  }}
                >
                  <FiX size={14} />
                </button>
              </>
            ) : (
              <span style={{ fontSize: "12px", color: "#666" }}>No Photo</span>
            )}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
          </label>

          <h3 style={{ marginTop: "15px" }}>{customer.name}</h3>
          <div className="customer-id">ID: {customer.customerId}</div>
          <div>{customer.mobile}</div>
          <div>{customer.email}</div>
        </div>

        {/* Collapsible Profile Details */}
        <div className="collapsible-wrapper">
          <div className="collapsible-toggle" onClick={() => setShowDetails(!showDetails)}>
            <h4>{showDetails ? "▼ Hide" : "▶ Show"} Profile Details</h4>
          </div>

          {showDetails && (
            <div className="detail-card collapsible-card">
              <div className="grid-2">
                <div className="detail-item"><label>Lead Type:</label><span>{lead?.leadType || "N/A"}</span></div>
                <div className="detail-item"><label>Sub Type:</label><span>{lead?.subType || "N/A"}</span></div>
                <div className="detail-item">
                  <label>Date of Birth:</label>
                  <span>{lead?.dob ? new Date(lead.dob).toLocaleDateString("en-IN") : "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Requirement Amount:</label>
                  <span>{lead?.requirementAmount ? `₹${lead.requirementAmount.toLocaleString()}` : "N/A"}</span>
                </div>

                {/* ✅ Sanctioned Amount from Case */}
                <div className="detail-item">
                  <label>Sanctioned Amount:</label>
                  <span>
                    {caseData?.amount
                      ? `₹${caseData.amount.toLocaleString()}`
                      : "N/A"}
                  </span>
                </div>

                <div className="detail-item"><label>Bank:</label><span>{lead?.bank || customer.bankName || "N/A"}</span></div>
                <div className="detail-item"><label>Branch:</label><span>{lead?.branch || customer.branch || "N/A"}</span></div>
                <div className="detail-item">
                  <label>Channel Partner:</label>
                  <span>{lead?.channelPartner?.name || customer.channelPartner || "N/A"}</span>
                </div>
                <div className="detail-item"><label>Permanent Address:</label><span>{lead?.permanentAddress || "N/A"}</span></div>
                <div className="detail-item"><label>Current Address:</label><span>{lead?.currentAddress || "N/A"}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Right-side Details */}
        <div className="profile-details">
          <div className="detail-card">
            <h4>Status</h4>
            <p className={isCustomerClosed ? "status-close" : "status-open"}>
              {customer.status ? customer.status.toUpperCase() : "OPEN"}
              {isCustomerClosed ? " 🔒" : " 🔓"}
            </p>
          </div>

          {/* 💰 Disbursed Amount */}
          <div className="detail-card disbursement-card">
            <h4>Disbursed Amount</h4>
            {sortedDisbursements.length > 0 && (
              <div className="disbursements-list">
                {sortedDisbursements.map((d) => (
                  <div key={d._id} className="disbursement-item">
                    <span className="disbursement-date">
                      {new Date(d.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="disbursement-amount-item">₹{d.amount.toLocaleString()}</span>
                    <span className="disbursement-notes">{d.notes || "-"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="detail-card editable-notes">
            <div className="notes-header">
              <h4>Notes</h4>
              {saveStatus === "saving" && <span className="note-status saving">Saving...</span>}
              {saveStatus === "saved" && <span className="note-status saved">Saved ✅</span>}
              {saveStatus === "error" && <span className="note-status error">Error ❌</span>}
            </div>
            <textarea
              value={noteText}
              onChange={handleNoteChange}
              placeholder="Write your notes here..."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="profile-footer">
        <button className="btn secondary" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="btn" onClick={() => navigate(`/customers/${id}/edit`)}>
          Edit Details
        </button>
      </div>
    </div>
  );
}
