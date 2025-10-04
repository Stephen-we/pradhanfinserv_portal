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
  FiCheckCircle,
  FiTrendingUp,
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

    const hasDocuments =
      (caseData.documentSections &&
        caseData.documentSections.some((section) =>
          section.documents.some(
            (doc) => doc.files && doc.files.length > 0
          )
        )) ||
      (caseData.kycDocs &&
        Object.values(caseData.kycDocs).some(
          (files) => files && files.length > 0
        ));

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
    if (typeof file === "string" && file.startsWith("http")) return file;
    const filename =
      file.filename || file.name || (typeof file === "string" ? file : null);
    if (filename) {
      return `${filesBase}/uploads/${filename}`;
    }
    return null;
  };

  // -------- Document Stats --------
  const getDocumentStats = () => {
    if (!caseData) return { totalFiles: 0, totalSections: 0, fileDetails: [] };
    let totalFiles = 0;
    let fileDetails = [];

    if (caseData.documentSections && caseData.documentSections.length > 0) {
      caseData.documentSections.forEach((section) => {
        section.documents.forEach((doc) => {
          if (doc.files && doc.files.length > 0) {
            doc.files.forEach((file) => {
              totalFiles++;
              fileDetails.push({
                section: section.name,
                document: doc.name,
                file: file,
                url: getFileUrl(file),
              });
            });
          }
        });
      });
    } else if (caseData.kycDocs) {
      Object.entries(caseData.kycDocs).forEach(([fieldName, files]) => {
        const fileArray = Array.isArray(files) ? files : [files].filter(Boolean);
        fileArray.forEach((file) => {
          totalFiles++;
          fileDetails.push({
            section: "KYC Documents",
            document: fieldName,
            file: file,
            url: getFileUrl(file),
          });
        });
      });
    }

    return {
      totalFiles,
      totalSections: caseData.documentSections?.length || 1,
      fileDetails,
    };
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const stats = getDocumentStats();
      if (stats.totalFiles === 0) {
        alert("No documents available for download");
        setIsDownloading(false);
        return;
      }

      const res = await API.get(`/cases/${caseData._id}/download`, {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setDownloadProgress(percent);
          }
        },
      });

      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${
        caseData.customerName || "case"
      }_documents_${new Date().toISOString().split("T")[0]}.zip`;
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
      alert("Download failed. Please try again.");
    }
  };

  const hasCoApplicant =
    !!(caseData?.applicant2Name && caseData.applicant2Name !== "");
  const documentStats = getDocumentStats();

  // -------- UI --------
  if (isLoading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading case details...</p>
      </div>
    );

  if (error)
    return (
      <div className="error-container">
        <FiAlertCircle className="error-icon" />
        <h3>Unable to Load Case</h3>
        <p>{error}</p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );

  if (!caseData)
    return (
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
            <p className="case-subtitle">
              Complete all required fields to move forward
            </p>
          </div>

          <div className="progress-display">
            <div className="progress-stats">
              <span className="progress-percentage">{progress}% Complete</span>
              <span className="progress-pending">{100 - progress}% Pending</span>
            </div>
            <div className="progress-visual">
              <div className="progress-bar-wrapper">
                <div
                  className={`progress-fill ${
                    progress === 100 ? "complete" : ""
                  }`}
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
            <div className="info-row">
              <label>Case ID</label><span>{show(caseData.caseId)}</span>
            </div>
            <div className="info-row">
              <label>Lead ID</label><span>{show(caseData.leadId)}</span>
            </div>
            {/* ❌ Removed Lead Type + Sub Type here */}
            <div className="info-row">
              <label>Status</label>
              <span
                className={`status-badge status-${
                  caseData.status?.toLowerCase() || "pending"
                }`}
              >
                {show(caseData.status)}
              </span>
            </div>
            <div className="info-row">
              <label>Amount</label>
              <span className="amount-value">₹{show(caseData.amount)}</span>
            </div>
            <div className="info-row"><label>Bank</label><span>{show(caseData.bank)}</span></div>
            <div className="info-row"><label>Branch</label><span>{show(caseData.branch)}</span></div>
          </div>
        </div>

        {/* Lead Information */}
        <div className="info-card">
          <div className="card-header">
            <FiTrendingUp className="card-icon" />
            <h3>Lead Information</h3>
            <FiEdit className="edit-icon" onClick={goEdit} title="Edit" />
          </div>
          <div className="card-content">
            <div className="info-row"><label>Lead Type</label><span>{show(caseData.leadType)}</span></div>
            <div className="info-row"><label>Lead Sub Type</label><span>{show(caseData.subType)}</span></div>
            {/* ❌ Removed Loan Type here */}
            <div className="info-row"><label>Channel Partner</label><span>{show(caseData.channelPartner)}</span></div>
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
            <div className="info-row"><label>Mobile</label><span>{show(caseData.mobile)}</span></div>
            <div className="info-row"><label>Email</label><span>{show(caseData.email)}</span></div>
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
            <div className="info-row"><label>PAN Number</label><span>{show(caseData.panNumber)}</span></div>
            <div className="info-row"><label>Aadhaar Number</label><span>{show(caseData.aadharNumber)}</span></div>
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

      {/* Bottom Actions */}
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
        <button
          className="btn secondary"
          onClick={() => {
            const publicUrl = `${window.location.protocol}//${window.location.host}/cases/${caseData._id}/public-form`;
            navigator.clipboard.writeText(publicUrl);
            alert("Public form link copied:\n" + publicUrl);
          }}
        >
          Copy Public Form Link
        </button>
      </div>
    </div>
  );
}
