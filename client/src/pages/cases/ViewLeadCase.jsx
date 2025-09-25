// client/src/pages/cases/ViewLeadCase.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import { FiEdit, FiUser, FiBriefcase, FiHome, FiFileText, FiUsers, FiMapPin, FiPaperclip } from "react-icons/fi";
import "../../styles/cases.css";
import "../../styles/viewCase.css";

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

  // Progress calculation (same as form)
  const progress = useMemo(() => {
    if (!caseData) return 0;
    
    const requiredFields = [
      "leadId",
      "customerName",
      "primaryMobile",
      "email",
      "loanType",
      "amount",
      "bank",
      "branch",
      "permanentAddress",
    ];
    
    const filled = requiredFields.filter(
      (f) => caseData[f] && caseData[f].toString().trim() !== ""
    );
    return Math.round((filled.length / requiredFields.length) * 100);
  }, [caseData]);

  if (!caseData) return <p>Loading...</p>;

  const show = (val) => (val && val !== "" ? val : "-");
//  const goEdit = () => navigate(`/cases/${caseData._id}/edit`);
  const goEdit = () => {
    if (caseData?._id) {
      navigate(`/cases/${caseData._id}/edit`);
    }
  };


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

  const hasCoApplicant = caseData.applicant2Name && caseData.applicant2Name !== "";

  // KYC Documents list (exactly matching the LeadFormCase.jsx)
  const kycDocuments = [
    "Photo 4 each (A & C)",
    "PAN Self attested - A & C",
    "Aadhar - self attested - A & C",
    "Address Proof (Resident & Shop/Company)",
    "Shop Act/Company Registration/Company PAN",
    "Bank statement last 12 months (CA and SA)",
    "GST/Trade/Professional Certificate",
    "Udyam Registration/Certificate",
    "ITR last 3 years (Computation / P&L / Balance Sheet)",
    "Marriage Certificate (if required)",
    "Partnership Deed (if required)",
    "MOA & AOA Company Registration",
    "Form 26AS Last 3 Years"
  ];

  return (
    <div className="view-case-container">
      {/* 🔹 Progress Header */}
      <div className="progress-header-card">
        <div className="progress-header-content">
          <div className="progress-title-section">
            <h1 className="case-title">Loan Case Details</h1>
            <p className="case-subtitle">Complete all required fields to move forward</p>
          </div>
          
          <div className="progress-display">
            <div className="progress-stats">
              <span className="progress-percentage">{progress}% Complete</span>
              <span className="progress-pending">{100 - progress}% Pending</span>
            </div>
            
            <div className="progress-visual">
              <div className="progress-bar-wrapper">
                <div 
                  className={`progress-fill ${progress === 100 ? "complete" : ""}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-labels">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 Main Content Grid */}
      <div className="view-case-grid">
        {/* Case Details Card */}
        <div className="info-card">
          <div className="card-header">
            <FiBriefcase className="card-icon" />
            <h3>Case Details</h3>
            <FiEdit className="edit-icon" onClick={goEdit} />
          </div>
          <div className="card-content">
            <div className="info-row">
              <label>Case ID</label>
              <span>{show(caseData.caseId)}</span>
            </div>
            <div className="info-row">
              <label>Lead ID</label>
              <span>{show(caseData.leadId)}</span>
            </div>
            <div className="info-row">
              <label>Loan Type</label>
              <span>{show(caseData.loanType)}</span>
            </div>
            <div className="info-row">
              <label>Status</label>
              <span className={`status-badge status-${caseData.status?.toLowerCase() || 'pending'}`}>
                {show(caseData.status)}
              </span>
            </div>
            <div className="info-row">
              <label>Amount</label>
              <span className="amount-value">₹{show(caseData.amount)}</span>
            </div>
            <div className="info-row">
              <label>Bank</label>
              <span>{show(caseData.bank)}</span>
            </div>
            <div className="info-row">
              <label>Branch</label>
              <span>{show(caseData.branch)}</span>
            </div>
            {caseData.link && (
              <div className="info-row">
                <label>Related Link</label>
                <a href={caseData.link} target="_blank" rel="noreferrer" className="link-button">
                  Open Link
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Applicant Details Card */}
        <div className="info-card">
          <div className="card-header">
            <FiUser className="card-icon" />
            <h3>Applicant Details</h3>
            <FiEdit className="edit-icon" onClick={goEdit} />
          </div>
          <div className="card-content">
            <div className="info-row">
              <label>Applicant Name</label>
              <span>{show(caseData.customerName)}</span>
            </div>
            <div className="info-row">
              <label>Mobile</label>
              <span className="contact-info">{show(caseData.primaryMobile)}</span>
            </div>
            <div className="info-row">
              <label>Email</label>
              <span className="contact-info">{show(caseData.email)}</span>
            </div>
          </div>
        </div>

        {/* Co-Applicant Card */}
        {hasCoApplicant && (
          <div className="info-card">
            <div className="card-header">
              <FiUsers className="card-icon" />
              <h3>Co-Applicant Details</h3>
              <FiEdit className="edit-icon" onClick={goEdit} />
            </div>
            <div className="card-content">
              <div className="info-row">
                <label>Co-Applicant Name</label>
                <span>{show(caseData.applicant2Name)}</span>
              </div>
              <div className="info-row">
                <label>Mobile</label>
                <span className="contact-info">{show(caseData.applicant2Mobile)}</span>
              </div>
              <div className="info-row">
                <label>Email</label>
                <span className="contact-info">{show(caseData.applicant2Email)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Contact Details Card */}
        <div className="info-card">
          <div className="card-header">
            <FiMapPin className="card-icon" />
            <h3>Contact Details</h3>
            <FiEdit className="edit-icon" onClick={goEdit} />
          </div>
          <div className="card-content">
            <div className="info-row vertical">
              <label>Permanent Address</label>
              <span>{show(caseData.permanentAddress)}</span>
            </div>
            <div className="info-row vertical">
              <label>Current Address</label>
              <span>{show(caseData.currentAddress)}</span>
            </div>
            <div className="info-row vertical">
              <label>Site Address</label>
              <span>{show(caseData.siteAddress)}</span>
            </div>
            <div className="info-row vertical">
              <label>Office/Business Address</label>
              <span>{show(caseData.officeAddress)}</span>
            </div>
          </div>
        </div>

        {/* KYC Details Card */}
        <div className="info-card">
          <div className="card-header">
            <FiFileText className="card-icon" />
            <h3>KYC Details (Self-Employed)</h3>
            <FiEdit className="edit-icon" onClick={goEdit} />
          </div>
          <div className="card-content">
            <div className="info-row">
              <label>PAN Number</label>
              <span className="kyc-value">{show(caseData.panNumber)}</span>
            </div>
            <div className="info-row">
              <label>Aadhaar Number</label>
              <span className="kyc-value">{show(caseData.aadharNumber)}</span>
            </div>
          </div>
        </div>

        {/* KYC Documents Card - Matches LeadFormCase.jsx */}
        <div className="info-card full-width">
          <div className="card-header">
            <FiPaperclip className="card-icon" />
            <h3>KYC Documents Uploaded</h3>
            <FiEdit className="edit-icon" onClick={goEdit} />
          </div>
          <div className="card-content">
            <div className="documents-grid">
              {kycDocuments.map((docName, index) => {
                const fieldName = `kycDoc_${index}`;
                const fileName = caseData[fieldName];
                
                return (
                  <div key={index} className="document-item">
                    <div className="document-info">
                      <span className="document-name">{docName}</span>
                      <span className={`document-status ${fileName ? 'uploaded' : 'pending'}`}>
                        {fileName ? 'Uploaded' : 'Pending'}
                      </span>
                    </div>
                    {fileName && (
                      <a 
                        href={`${API.defaults.baseURL}/uploads/${fileName}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        <FiPaperclip className="link-icon" />
                        View Document
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="info-card full-width">
          <div className="card-header">
            <FiFileText className="card-icon" />
            <h3>Notes / Working Stage</h3>
          </div>
          <div className="card-content">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about the case progress, next steps, or important information..."
              className="notes-textarea"
            />
            <button
              className="btn primary save-notes-btn"
              onClick={saveNotes}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn secondary" onClick={() => navigate("/cases")}>
          ← Back to Cases
        </button>
        <button
          className="btn primary"
          onClick={() => navigate(`/cases/${caseData._id}/tasks`)}
        >
          Show Tasks
        </button>
        <button className="btn edit-main" onClick={goEdit}>
          Edit Case Details
        </button>
      </div>
    </div>
  );
}