// client/src/pages/cases/ViewLeadCase.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import {
  FiEdit,
  FiUser,
  FiBriefcase,
  FiFileText,
  FiUsers,
  FiMapPin,
  FiPaperclip,
  FiDownload,
  FiAlertCircle,
  FiCheckCircle
} from "react-icons/fi";
import "../../styles/cases.css";

export default function ViewLeadCase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // ✅ Base URL for static files
  const filesBase = (() => {
    const base = API.defaults.baseURL || "/api";
    if (/^https?:\/\//i.test(base)) return base.replace(/\/api\/?$/, "");
    try {
      const url = new URL(window.location.href);
      return `${url.protocol}//${url.hostname}:5000`;
    } catch {
      return "";
    }
  })();

  // -------- Load Case --------
  useEffect(() => {
    const loadCase = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data } = await API.get(`/cases/${id}`);
        setCaseData(data);
        setNotes(data.notes || "");
      } catch (err) {
        console.error("Failed to load case:", err);
        setError("Unable to load case details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadCase();
  }, [id]);

  // -------- Progress Calculation --------
  const progress = useMemo(() => {
    if (!caseData) return 0;
    
    const required = [
      "leadId",
      "customerName", 
      "mobile",
      "email",
      "loanType",
      "amount",
      "permanentAddress",
    ];
    
    const filled = required.filter(
      (f) => caseData[f] && caseData[f].toString().trim() !== ""
    );
    
    // Check if documents are uploaded (both structures)
    const hasDocuments = 
      (caseData.documentSections && caseData.documentSections.some(section => 
        section.documents.some(doc => doc.files && doc.files.length > 0)
      )) ||
      (caseData.kycDocs && Object.values(caseData.kycDocs).some(files => files && files.length > 0));
    
    // Documents contribute 30% to progress
    const baseProgress = Math.round((filled.length / required.length) * 70);
    const documentProgress = hasDocuments ? 30 : 0;
    
    return baseProgress + documentProgress;
  }, [caseData]);

  // -------- Helper Functions --------
  const show = (v) => (v && v !== "" ? v : "-");

  const goEdit = () => {
    if (caseData?._id) navigate(`/cases/${caseData._id}/edit`);
  };

  const saveNotes = async () => {
    try {
      setSaving(true);
      await API.put(`/cases/${caseData._id}`, { notes });
      alert("Notes updated successfully");
    } catch {
      alert("Failed to update notes");
    } finally {
      setSaving(false);
    }
  };

  // -------- File URL Helper --------
  const getFileUrl = (file) => {
    if (!file) return null;
    
    // If it's already a full URL
    if (typeof file === 'string' && file.startsWith('http')) return file;
    
    // If it has a filename (already uploaded file)
    if (file.filename) {
      return `${filesBase}/uploads/${file.filename}`;
    }
    
    // If it's a plain string filename
    if (typeof file === 'string') {
      return `${filesBase}/uploads/${file}`;
    }
    
    // If it's a File object (new upload - should not happen in view)
    if (file.file) {
      return URL.createObjectURL(file.file);
    }
    
    return null;
  };

  // -------- Document Statistics --------
  const getDocumentStats = () => {
    if (!caseData) return { totalFiles: 0, totalSections: 0 };
    
    if (caseData.documentSections && caseData.documentSections.length > 0) {
      const totalFiles = caseData.documentSections.reduce((total, section) => 
        total + section.documents.reduce((docTotal, doc) => 
          docTotal + (doc.files ? doc.files.length : 0), 0
        ), 0
      );
      return { totalFiles, totalSections: caseData.documentSections.length };
    }
    
    if (caseData.kycDocs) {
      const totalFiles = Object.values(caseData.kycDocs).flat().length;
      return { totalFiles, totalSections: 1 };
    }
    
    return { totalFiles: 0, totalSections: 0 };
  };

  // -------- Download Handler --------
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // Check if there are any documents to download
      const stats = getDocumentStats();
      if (stats.totalFiles === 0) {
        alert("No documents available for download");
        setIsDownloading(false);
        return;
      }

      console.log(`Starting download for case ${caseData._id} with ${stats.totalFiles} files`);

      const res = await API.get(`/cases/${caseData._id}/download`, {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(percent);
          }
        }
      });
      
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${caseData.customerName || "case"}_documents_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setDownloadProgress(100);
      setTimeout(() => {
        setDownloadProgress(0);
        setIsDownloading(false);
      }, 2000);
      
    } catch (err) {
      console.error("Download error:", err);
      setIsDownloading(false);
      setDownloadProgress(0);
      
      if (err.response?.status === 404) {
        alert("Download feature not available. Please ensure the server has the download endpoint implemented.");
      } else {
        const msg = err.response?.data?.message || err.message || "Download failed";
        alert(`Failed to download documents: ${msg}`);
      }
    }
  };

  const hasCoApplicant = !!(caseData?.applicant2Name && caseData.applicant2Name !== "");
  const documentStats = getDocumentStats();

  // -------- Loading and Error States --------
  if (isLoading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading case details...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <FiAlertCircle className="error-icon" />
      <h3>Unable to Load Case</h3>
      <p>{error}</p>
      <button className="btn primary" onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );

  if (!caseData) return (
    <div className="error-container">
      <FiAlertCircle className="error-icon" />
      <h3>Case Not Found</h3>
      <p>The requested case could not be loaded.</p>
      <button className="btn primary" onClick={() => navigate("/cases")}>
        Back to Cases
      </button>
    </div>
  );

  return (
    <div className="view-case-container">
      {/* Progress Header */}
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

      {/* Download Progress */}
      {isDownloading && (
        <div className="download-progress-card">
          <div className="download-progress-content">
            <FiDownload className="download-icon" />
            <div className="download-info">
              <h4>Downloading Documents</h4>
              <p>Preparing {documentStats.totalFiles} files for download...</p>
              <div className="progress-bar-wrapper">
                <div 
                  className="progress-fill downloading" 
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <span className="progress-text">{downloadProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="view-case-grid">
        {/* Case Details */}
        <div className="info-card">
          <div className="card-header">
            <FiBriefcase className="card-icon" />
            <h3>Case Details</h3>
            <FiEdit className="edit-icon" onClick={goEdit} title="Edit" />
          </div>
          <div className="card-content">
            <div className="info-row"><label>Case ID</label><span>{show(caseData.caseId)}</span></div>
            <div className="info-row"><label>Lead ID</label><span>{show(caseData.leadId)}</span></div>
            <div className="info-row"><label>Loan Type</label><span>{show(caseData.loanType)}</span></div>
            <div className="info-row">
              <label>Status</label>
              <span className={`status-badge status-${caseData.status?.toLowerCase() || "pending"}`}>
                {show(caseData.status)}
              </span>
            </div>
            <div className="info-row"><label>Amount</label><span className="amount-value">₹{show(caseData.amount)}</span></div>
            <div className="info-row"><label>Bank</label><span>{show(caseData.bank)}</span></div>
            <div className="info-row"><label>Branch</label><span>{show(caseData.branch)}</span></div>
          </div>
        </div>

        {/* Applicant */}
        <div className="info-card">
          <div className="card-header">
            <FiUser className="card-icon" />
            <h3>Applicant Details</h3>
            <FiEdit className="edit-icon" onClick={goEdit} title="Edit" />
          </div>
          <div className="card-content">
            <div className="info-row"><label>Applicant Name</label><span>{show(caseData.customerName)}</span></div>
            <div className="info-row"><label>Mobile</label><span className="contact-info">{show(caseData.mobile)}</span></div>
            <div className="info-row"><label>Email</label><span className="contact-info">{show(caseData.email)}</span></div>
          </div>
        </div>

        {/* Co-Applicant */}
        {hasCoApplicant && (
          <div className="info-card">
            <div className="card-header">
              <FiUsers className="card-icon" />
              <h3>Co-Applicant Details</h3>
              <FiEdit className="edit-icon" onClick={goEdit} title="Edit" />
            </div>
            <div className="card-content">
              <div className="info-row"><label>Co-Applicant Name</label><span>{show(caseData.applicant2Name)}</span></div>
              <div className="info-row"><label>Mobile</label><span>{show(caseData.applicant2Mobile)}</span></div>
              <div className="info-row"><label>Email</label><span>{show(caseData.applicant2Email)}</span></div>
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="info-card">
          <div className="card-header">
            <FiMapPin className="card-icon" />
            <h3>Contact Details</h3>
            <FiEdit className="edit-icon" onClick={goEdit} title="Edit" />
          </div>
          <div className="card-content">
            <div className="info-row vertical"><label>Permanent Address</label><span>{show(caseData.permanentAddress)}</span></div>
            <div className="info-row vertical"><label>Current Address</label><span>{show(caseData.currentAddress)}</span></div>
            <div className="info-row vertical"><label>Site Address</label><span>{show(caseData.siteAddress)}</span></div>
            <div className="info-row vertical"><label>Office/Business Address</label><span>{show(caseData.officeAddress)}</span></div>
          </div>
        </div>

        {/* Quick KYC */}
        <div className="info-card">
          <div className="card-header">
            <FiFileText className="card-icon" />
            <h3>KYC Quick Details</h3>
            <FiEdit className="edit-icon" onClick={goEdit} title="Edit" />
          </div>
          <div className="card-content">
            <div className="info-row"><label>PAN Number</label><span className="kyc-value">{show(caseData.panNumber)}</span></div>
            <div className="info-row"><label>Aadhaar Number</label><span className="kyc-value">{show(caseData.aadharNumber)}</span></div>
          </div>
        </div>

        {/* KYC Documents */}
        <div className="info-card full-width">
          <div className="card-header">
            <FiPaperclip className="card-icon" />
            <h3>KYC Documents Uploaded</h3>
            <div className="document-actions">
              <span className="document-count">
                {documentStats.totalFiles} files in {documentStats.totalSections} section(s)
              </span>
              <button 
                className={`btn secondary ${isDownloading ? 'loading' : ''}`} 
                onClick={handleDownload} 
                type="button"
                disabled={isDownloading || documentStats.totalFiles === 0}
              >
                <FiDownload style={{ marginRight: 6 }} />
                {isDownloading ? 'Downloading...' : 'Download All (ZIP)'}
              </button>
            </div>
          </div>
          <div className="card-content">
            {/* New Document Sections Structure */}
            {caseData.documentSections && caseData.documentSections.length > 0 ? (
              <div className="document-sections">
                {caseData.documentSections.map((section, sectionIndex) => (
                  <div key={section.id || sectionIndex} className="document-section-view">
                    <h4 className="section-title">{section.name}</h4>
                    <div className="documents-grid">
                      {section.documents.map((doc, docIndex) => (
                        <div key={doc.id || docIndex} className="document-item">
                          <div className="document-info">
                            <span className="document-name">{doc.name}</span>
                            <span className={`document-status ${doc.files?.length ? "uploaded" : "pending"}`}>
                              {doc.files?.length ? (
                                <>
                                  <FiCheckCircle style={{ marginRight: 4 }} />
                                  {doc.files.length} file(s)
                                </>
                              ) : "No files"}
                            </span>
                          </div>
                          {doc.files && doc.files.length > 0 && (
                            <div className="document-links">
                              {doc.files.map((file, fileIndex) => {
                                const fileUrl = getFileUrl(file);
                                return fileUrl ? (
                                  <a
                                    key={fileIndex}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="document-link"
                                  >
                                    <FiPaperclip className="link-icon" />
                                    {file.name || file.filename || `File ${fileIndex + 1}`}
                                  </a>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : caseData.kycDocs ? (
              /* Old KYC Docs Structure */
              <div className="documents-grid">
                {[
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
                  "Form 26AS Last 3 Years",
                ].map((docName, index) => {
                  const fieldName = `kycDoc_${index}`;
                  const files = caseData.kycDocs[fieldName] || [];
                  return (
                    <div key={index} className="document-item">
                      <div className="document-info">
                        <span className="document-name">{docName}</span>
                        <span className={`document-status ${files.length ? "uploaded" : "pending"}`}>
                          {files.length ? (
                            <>
                              <FiCheckCircle style={{ marginRight: 4 }} />
                              {files.length} file(s)
                            </>
                          ) : "No files"}
                        </span>
                      </div>
                      {files.length > 0 && (
                        <div className="document-links">
                          {files.map((file, i) => (
                            <a
                              key={i}
                              href={getFileUrl(file)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="document-link"
                            >
                              <FiPaperclip className="link-icon" />
                              {file}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-documents">
                <FiFileText className="no-docs-icon" />
                <p>No documents uploaded yet</p>
                <button className="btn primary" onClick={goEdit}>
                  Upload Documents
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
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
              rows="4"
            />
            <button className="btn primary save-notes-btn" onClick={saveNotes} disabled={saving}>
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="action-buttons">
        <button className="btn secondary" onClick={() => navigate("/cases")}>
          ← Back to Cases
        </button>
        <button className="btn primary" onClick={() => navigate(`/cases/${caseData._id}/tasks`)}>
          Show Tasks
        </button>
        <button className="btn edit-main" onClick={goEdit}>
          Edit Case Details
        </button>
      </div>
    </div>
  );
}