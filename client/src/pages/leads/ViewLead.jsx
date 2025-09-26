import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../../services/api";
import "../../styles/viewCase.css";

export default function ViewLead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const { data } = await API.get(`/leads/${id}`);
        setLead(data);
      } catch (err) {
        console.error("Failed to load lead:", err);
        alert("Unable to load lead details");
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  const convertToCase = async () => {
    if (!window.confirm("Are you sure you want to convert this lead to a case? This action cannot be undone.")) return;
    
    setConverting(true);
    try {
      // Use the conversion logic from code B
      await API.patch(`/leads/${id}/convert`);
      alert("✅ Lead converted to Archived & Loan Case created!");
      navigate("/cases"); // Navigate to cases list as in code B
    } catch (err) {
      alert(err.response?.data?.message || "❌ Failed to convert lead");
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (!lead) return <div className="card">Lead not found</div>;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Lead Details: {lead.leadId}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/leads/${id}/edit`} className="btn secondary">
            Edit
          </Link>
          <button 
            className="btn success" 
            onClick={convertToCase}
            disabled={converting}
          >
            {converting ? "Converting..." : "Convert to Case"}
          </button>
          <button className="btn" onClick={() => navigate("/leads")}>
            Back to Leads
          </button>
        </div>
      </div>

      <div className="details-grid">
        {/* Basic Information */}
        <div className="detail-section">
          <h3>Basic Information</h3>
          <div className="grid-2">
            <div className="detail-item">
              <label>Name:</label>
              <span>{lead.name}</span>
            </div>
            <div className="detail-item">
              <label>Mobile:</label>
              <span>{lead.mobile}</span>
            </div>
            <div className="detail-item">
              <label>Email:</label>
              <span>{lead.email || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Source:</label>
              <span>{lead.source || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Channel Partner Information */}
        <div className="detail-section">
          <h3>Channel Partner Information</h3>
          <div className="grid-2">
            <div className="detail-item">
              <label>Channel Partner:</label>
              <span>
                {lead.channelPartner ? (
                  <Link to={`/partners/${lead.channelPartner._id}`} className="link">
                    {lead.channelPartner.name}
                  </Link>
                ) : (
                  "N/A"
                )}
              </span>
            </div>
            {lead.channelPartner && (
              <>
                <div className="detail-item">
                  <label>Partner Contact:</label>
                  <span>{lead.channelPartner.contact || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Partner Email:</label>
                  <span>{lead.channelPartner.email || "N/A"}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bank & Branch Information */}
        <div className="detail-section">
          <h3>Bank & Branch Information</h3>
          <div className="grid-2">
            <div className="detail-item">
              <label>Bank:</label>
              <span>{lead.bank || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Branch:</label>
              <span>{lead.branch || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="detail-section">
          <h3>Lead Details</h3>
          <div className="grid-2">
            <div className="detail-item">
              <label>Lead Type:</label>
              <span>{lead.leadType}</span>
            </div>
            <div className="detail-item">
              <label>Sub Type:</label>
              <span>{lead.subType || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Requirement Amount:</label>
              <span>{lead.requirementAmount ? `₹${lead.requirementAmount.toLocaleString()}` : "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Sanctioned Amount:</label>
              <span>{lead.sanctionedAmount ? `₹${lead.sanctionedAmount.toLocaleString()}` : "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>GD Status:</label>
              <span className={`status-badge ${lead.gdStatus.toLowerCase().replace(' ', '-')}`}>
                {lead.gdStatus}
              </span>
            </div>
            <div className="detail-item">
              <label>Status:</label>
              <span className={`status-badge ${lead.status}`}>
                {lead.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Document Information */}
        <div className="detail-section">
          <h3>Document Information</h3>
          <div className="grid-2">
            <div className="detail-item">
              <label>PAN Number:</label>
              <span>{lead.pan || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Aadhar Number:</label>
              <span>{lead.aadhar || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Address Information */}
        {lead.permanentAddress && (
          <div className="detail-section">
            <h3>Permanent Address</h3>
            <div className="detail-item full-width">
              <span>{lead.permanentAddress}</span>
            </div>
          </div>
        )}

        {lead.currentAddress && (
          <div className="detail-section">
            <h3>Current Address</h3>
            <div className="detail-item full-width">
              <span>{lead.currentAddress}</span>
            </div>
          </div>
        )}

        {lead.siteAddress && (
          <div className="detail-section">
            <h3>Site Address</h3>
            <div className="detail-item full-width">
              <span>{lead.siteAddress}</span>
            </div>
          </div>
        )}

        {lead.officeAddress && (
          <div className="detail-section">
            <h3>Office Address</h3>
            <div className="detail-item full-width">
              <span>{lead.officeAddress}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="detail-section">
          <h3>Notes</h3>
          <div className="detail-item full-width">
            <span>{lead.notes || "N/A"}</span>
          </div>
        </div>

        {/* System Information */}
        <div className="detail-section">
          <h3>System Information</h3>
          <div className="grid-2">
            <div className="detail-item">
              <label>Created:</label>
              <span>{new Date(lead.createdAt).toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <label>Last Updated:</label>
              <span>{new Date(lead.updatedAt).toLocaleString()}</span>
            </div>
            {lead.assignedTo && (
              <div className="detail-item">
                <label>Assigned To:</label>
                <span>{lead.assignedTo.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}