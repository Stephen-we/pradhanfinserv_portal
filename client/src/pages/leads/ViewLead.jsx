// client/src/pages/leads/ViewLead.jsx
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
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [conversionResult, setConversionResult] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const { data } = await API.get(`/leads/${id}`);
        setLead(data);
        setNotes(data.notes || "");
      } catch (err) {
        console.error("Failed to load lead:", err);
        alert("Unable to load lead details");
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  const handleConvertClick = () => {
    setShowConvertModal(true);
    setConversionResult(null);
  };

  const closeConvertModal = () => {
    setShowConvertModal(false);
    setConversionResult(null);
    
    if (conversionResult?.success) {
      navigate("/cases");
    }
  };

  const convertToCase = async () => {
    setConverting(true);
    setConversionResult(null);
    
    try {
      const response = await API.patch(`/leads/${id}/convert`);
      
      setConversionResult({
        success: true,
        message: "✅ Lead successfully converted!",
        caseId: response.data.caseId || "New Case",
        details: "Lead has been archived and a new loan case has been created."
      });
      
      setLead(prev => prev ? { ...prev, status: "archived" } : null);
      
    } catch (err) {
      setConversionResult({
        success: false,
        message: "❌ Conversion failed",
        error: err.response?.data?.message || "Please try again later."
      });
    } finally {
      setConverting(false);
    }
  };

  const handleEditNotes = () => {
    setEditingNotes(true);
  };

  const handleCancelEdit = () => {
    setEditingNotes(false);
    setNotes(lead.notes || "");
  };

  const handleSaveNotes = async () => {
    if (savingNotes) return;
    
    setSavingNotes(true);
    try {
      const { data } = await API.patch(`/leads/${id}`, { notes });
      setLead(data);
      setEditingNotes(false);
      // Optional: Show success message
    } catch (err) {
      console.error("Failed to save notes:", err);
      alert("Failed to save notes. Please try again.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (!lead) return <div className="card">Lead not found</div>;

  return (
    <div className="card">
      {/* Convert Confirmation Modal */}
      {showConvertModal && (
        <div className="modal-overlay" onClick={closeConvertModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {conversionResult ? (
                  conversionResult.success ? "✅ Conversion Successful" : "❌ Conversion Failed"
                ) : (
                  "Convert Lead to Case"
                )}
              </h3>
              <button className="modal-close" onClick={closeConvertModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {!conversionResult ? (
                <>
                  <div className="conversion-warning">
                    <div className="warning-icon">⚠️</div>
                    <p><strong>This action cannot be undone</strong></p>
                  </div>
                  
                  <div className="conversion-details">
                    <p>Converting this lead will:</p>
                    <ul>
                      <li>✅ Change lead status to <strong>"Archived"</strong></li>
                      <li>✅ Create a new <strong>Loan Case</strong></li>
                      <li>✅ Transfer all lead information to the case</li>
                      <li>🚫 Remove from active leads list</li>
                    </ul>
                  </div>

                  <div className="lead-summary">
                    <h4>Lead Summary:</h4>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <label>Name:</label>
                        <span>{lead.name}</span>
                      </div>
                      <div className="summary-item">
                        <label>Mobile:</label>
                        <span>{lead.mobile}</span>
                      </div>
                      <div className="summary-item">
                        <label>Date of Birth:</label>
                        <span>{formatDate(lead.dob)}</span>
                      </div>
                      <div className="summary-item">
                        <label>Lead ID:</label>
                        <span>{lead.leadId}</span>
                      </div>
                      <div className="summary-item">
                        <label>Current Status:</label>
                        <span className={`status-badge ${lead.status}`}>
                          {lead.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : conversionResult.success ? (
                <>
                  <div className="conversion-success">
                    <div className="success-icon">🎉</div>
                    <p><strong>{conversionResult.message}</strong></p>
                    <p>{conversionResult.details}</p>
                    
                    {conversionResult.caseId && (
                      <div className="case-reference">
                        <strong>Case Reference:</strong> {conversionResult.caseId}
                      </div>
                    )}
                  </div>
                  
                  <div className="next-steps">
                    <h4>What happens next?</h4>
                    <ul>
                      <li>You will be redirected to the cases list</li>
                      <li>You can now manage this as a loan case</li>
                      <li>The lead has been moved to archives</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div className="conversion-error">
                    <div className="error-icon">❌</div>
                    <p><strong>{conversionResult.message}</strong></p>
                    <p>{conversionResult.error}</p>
                  </div>
                  
                  <div className="error-suggestions">
                    <p>Please try:</p>
                    <ul>
                      <li>Checking your internet connection</li>
                      <li>Verifying the lead data is complete</li>
                      <li>Contacting support if the problem persists</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              {!conversionResult ? (
                <>
                  <button 
                    className="btn secondary" 
                    onClick={closeConvertModal}
                    disabled={converting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn success" 
                    onClick={convertToCase}
                    disabled={converting}
                  >
                    {converting ? (
                      <>
                        <span className="loading-spinner"></span>
                        Converting...
                      </>
                    ) : (
                      "Confirm Conversion"
                    )}
                  </button>
                </>
              ) : conversionResult.success ? (
                <button 
                  className="btn success" 
                  onClick={closeConvertModal}
                >
                  Continue to Cases
                </button>
              ) : (
                <>
                  <button 
                    className="btn secondary" 
                    onClick={closeConvertModal}
                  >
                    Close
                  </button>
                  <button 
                    className="btn primary" 
                    onClick={convertToCase}
                    disabled={converting}
                  >
                    {converting ? "Retrying..." : "Try Again"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Lead Details: {lead.leadId}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/leads/${id}/edit`} className="btn secondary">
            Edit
          </Link>
          <button 
            className="btn success" 
            onClick={handleConvertClick}
            disabled={converting || lead.status === "archived"}
          >
            {lead.status === "archived" ? "Already Converted" : "Convert to Case"}
          </button>
          <button className="btn" onClick={() => navigate("/leads")}>
            Back to Leads
          </button>
        </div>
      </div>

      {/* Lead Details Grid */}
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
              <label>Date of Birth:</label>
              <span>{formatDate(lead.dob)}</span>
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
              <span className={`status-badge ${lead.gdStatus?.toLowerCase().replace(' ', '-')}`}>
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

        {/* Notes Section - Now Editable */}
        <div className="detail-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Notes</h3>
            {!editingNotes ? (
              <button className="btn primary" onClick={handleEditNotes} style={{ fontSize: "12px", padding: "6px 12px" }}>
                Edit Notes
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  className="btn success" 
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  {savingNotes ? "Saving..." : "Save"}
                </button>
                <button 
                  className="btn secondary" 
                  onClick={handleCancelEdit}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {editingNotes ? (
            <div className="detail-item full-width">
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Add your notes here..."
                className="notes-textarea"
                rows={6}
                disabled={savingNotes}
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                Character count: {notes.length}
              </div>
            </div>
          ) : (
            <div className="detail-item full-width">
              <div className="notes-display">
                {lead.notes ? (
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordWrap: 'break-word',
                    fontFamily: 'inherit',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>{lead.notes}</pre>
                ) : (
                  <span style={{ color: '#999', fontStyle: 'italic' }}>No notes added yet. Click "Edit Notes" to add some.</span>
                )}
              </div>
            </div>
          )}
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