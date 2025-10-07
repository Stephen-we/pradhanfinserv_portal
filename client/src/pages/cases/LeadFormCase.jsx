// client/src/pages/cases/LeadFormCase.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import "../../styles/leadformcases.css";

export default function LeadFormCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 🔹 Detect public mode
  const isPublic =
    typeof window !== "undefined" &&
    window.location.pathname.includes("public-form");

  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCoApplicant, setShowCoApplicant] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successProgress, setSuccessProgress] = useState(0);
  const [documentSections, setDocumentSections] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]); // ✅ track files requested for deletion

  // -------- Success Popup Animation --------
  const showEnhancedSuccess = () => {
    setShowSuccessPopup(true);
    setSuccessProgress(0);
    const interval = setInterval(() => {
      setSuccessProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (!isPublic) {
              setShowSuccessPopup(false);
              navigate(`/cases/${id}/view`);
            } else {
              setShowSuccessPopup(false);
            }
          }, 1000);
          return 100;
        }
        return prev + 20;
      });
    }, 100);
  };

  // -------- Load Case --------
  useEffect(() => {
    const url = isPublic ? `/cases/${id}/public` : `/cases/${id}`;
    API.get(url)
      .then(({ data }) => {
        setForm({
          ...data,
          customerName: data.customerName || data.name || "",
          mobile: data.mobile || data.primaryMobile || "",
          email: data.email || "",
        });
        if (data.applicant2Name) setShowCoApplicant(true);

        // 🔹 Default KYC Template (used for empty or reset cases)
        const defaultKYCStructure = [
          {
            id: "section-1",
            name: "KYC Documents",
            documents: [
              { id: "doc-1-1", name: "Photo 4 each (A & C)", files: [] },
              { id: "doc-1-2", name: "PAN Self attested - A & C", files: [] },
              { id: "doc-1-3", name: "Aadhar - self attested - A & C", files: [] },
              { id: "doc-1-4", name: "Address Proof (Resident & Shop/Company)", files: [] },
              { id: "doc-1-5", name: "Shop Act/Company Registration/Company PAN", files: [] },
              { id: "doc-1-6", name: "Bank statement last 12 months (CA and SA)", files: [] },
              { id: "doc-1-7", name: "GST/Trade/Professional Certificate", files: [] },
              { id: "doc-1-8", name: "Udyam Registration/Certificate", files: [] },
              { id: "doc-1-9", name: "ITR last 3 years (Computation / P&L / Balance Sheet)", files: [] },
              { id: "doc-1-10", name: "Marriage Certificate (if required)", files: [] },
              { id: "doc-1-11", name: "Partnership Deed (if required)", files: [] },
              { id: "doc-1-12", name: "MOA & AOA Company Registration", files: [] },
              { id: "doc-1-13", name: "Form 26AS Last 3 Years", files: [] },
            ],
          },
        ];

        // 🔹 If server has a structure, use it — but if there are zero files total, restore the full KYC structure
        if (Array.isArray(data.documentSections) && data.documentSections.length > 0) {
          const totalFiles = data.documentSections.reduce(
            (sum, s) =>
              sum +
              (Array.isArray(s.documents)
                ? s.documents.reduce((dsum, d) => dsum + (Array.isArray(d.files) ? d.files.length : 0), 0)
                : 0),
            0
          );

          if (totalFiles === 0) {
            console.log("🔁 Restoring full KYC structure (empty case)");
            setDocumentSections(defaultKYCStructure);
          } else {
            setDocumentSections(data.documentSections);
          }
        } else {
          console.log("🆕 New case — loading full KYC structure");
          setDocumentSections(defaultKYCStructure);
        }
      })
      .catch(() => alert("Unable to load case"));
  }, [id, isPublic, navigate]);

  // -------- File Upload --------
  const handleFileUpload = (files, sectionIndex, docIndex) => {
    const fileList = Array.from(files);
    setDocumentSections((prev) => {
      const updated = [...prev];
      const doc = updated[sectionIndex].documents[docIndex];
      const newFiles = fileList.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        file,
        filename: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date().toISOString(),
        isUploaded: false,
        isActive: true,
        isDeleted: false,
      }));
      doc.files = [...doc.files, ...newFiles];
      return updated;
    });
  };

  // -------- Delete File --------
  const removeFile = (sectionIndex, docIndex, fileIndex) => {
    setDocumentSections((prev) => {
      const updated = [...prev];
      const fileToRemove =
        updated[sectionIndex]?.documents?.[docIndex]?.files?.[fileIndex];
      if (!fileToRemove) return prev;

      const identifier =
        fileToRemove.filename ||
        fileToRemove.name ||
        fileToRemove.fileUrl ||
        fileToRemove.id;

      console.log("🗑️ Marking file for deletion:", identifier);
      if (identifier) setFilesToDelete((prevDel) => [...prevDel, identifier]);

      updated[sectionIndex].documents[docIndex].files[fileIndex] = {
        ...fileToRemove,
        isDeleted: true,
        isActive: false,
      };
      return updated;
    });
  };

  // -------- Document Section Management --------
  const addDocumentSection = () =>
    setDocumentSections((prev) => [
      ...prev,
      {
        id: `section-${Date.now()}`,
        name: `Additional Documents ${prev.length + 1}`,
        documents: [
          {
            id: `doc-${prev.length + 1}-1`,
            name: "New Document Type",
            files: [],
          },
        ],
      },
    ]);

  const removeDocumentSection = (index) => {
    if (documentSections.length <= 1)
      return alert("At least one section required");
    setDocumentSections((prev) => prev.filter((_, i) => i !== index));
  };

  const addDocumentType = (sectionIndex) => {
    setDocumentSections((prev) => {
      const updated = [...prev];
      const section = updated[sectionIndex];
      const newDocIndex = section.documents.length + 1;

      section.documents.push({
        id: `doc-${sectionIndex + 1}-${newDocIndex}`,
        name: "New Document Type",
        files: [],
      });
      return updated;
    });
  };

  const updateDocumentTypeName = (sectionIndex, docIndex, newName) => {
    setDocumentSections((prev) => {
      const updated = [...prev];
      updated[sectionIndex].documents[docIndex].name = newName;
      return updated;
    });
  };

  const removeDocumentType = (sectionIndex, docIndex) => {
    setDocumentSections((prev) => {
      const updated = [...prev];
      const section = updated[sectionIndex];

      if (section.documents.length <= 1) {
        alert("At least one document type is required in each section");
        return prev;
      }

      section.documents.splice(docIndex, 1);
      return updated;
    });
  };

  // -------- Input Handlers --------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePANChange = (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setForm((p) => ({ ...p, panNumber: v }));
  };

  const handleAadhaarChange = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 12);
    setForm((p) => ({ ...p, aadharNumber: v }));
  };

  // -------- Progress Calculation --------
  const progress = useMemo(() => {
    const requiredFields = [
      "leadId",
      "customerName",
      "mobile",
      "email",
      "leadType",
      "amount",
      "permanentAddress",
    ];
    const filled = requiredFields.filter((f) => form[f]?.toString().trim());

    // Check if any documents are uploaded (non-deleted files)
    const hasDocuments = documentSections.some((section) =>
      section.documents.some((doc) =>
        doc.files.some((file) => !file.isDeleted && file.isActive !== false)
      )
    );

    // Base form progress (70%) + documents progress (30%)
    const baseProgress = Math.round(
      (filled.length / requiredFields.length) * 70
    );
    const documentProgress = hasDocuments ? 30 : 0;

    return baseProgress + documentProgress;
  }, [form, documentSections]);

  const totalFiles = useMemo(
    () =>
      documentSections.reduce(
        (total, s) =>
          total +
          s.documents.reduce(
            (sum, d) =>
              sum +
              d.files.filter((f) => !f.isDeleted && f.isActive !== false).length,
            0
          ),
        0
      ),
    [documentSections]
  );

  // -------- Submit --------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();

      // Append form fields (except documentSections object)
      for (const key in form) {
        if (form[key] !== undefined && form[key] !== null && key !== "documentSections") {
          fd.append(key, form[key]);
        }
      }

      // Files to delete (backend reads JSON)
      if (filesToDelete.length > 0) {
        fd.append("filesToDelete", JSON.stringify(filesToDelete));
      }

      // Send current structure (server may ignore/overwrite; safe to include)
      fd.append("documentSections", JSON.stringify(documentSections));

      // Append new files
      let newFileCount = 0;
      let deletedFileCount = filesToDelete.length;

      documentSections.forEach((section, sectionIndex) => {
        section.documents.forEach((doc, docIndex) => {
          doc.files.forEach((fileObj) => {
            if (fileObj.file && !fileObj.isUploaded && !fileObj.isDeleted) {
              fd.append("documents", fileObj.file);
              // Optional metadata for future mapping on server
              fd.append("documents_sectionIndex", sectionIndex.toString());
              fd.append("documents_docIndex", docIndex.toString());
              fd.append("documents_docId", doc.id);

              console.log(
                `📤 Appending file: ${fileObj.name} to section ${sectionIndex}, doc ${docIndex}, id: ${doc.id}`
              );
              newFileCount++;
            }
          });
        });
      });

      console.log(
        `📤 Submitting ${newFileCount} new files, ${deletedFileCount} files marked for deletion`
      );

      const url = isPublic ? `/cases/${id}/public` : `/cases/${id}`;
      const response = await API.put(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Server response received");

      if (response.data?.documentSections) {
        setDocumentSections(response.data.documentSections);
      }

      showEnhancedSuccess();
      setFilesToDelete([]); // clear deletion queue after successful submit
    } catch (err) {
      console.error("❌ Submit failed:", err);
      console.error("Error details:", err.response?.data);
      alert(err.response?.data?.message || "Failed to submit case");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------- Render --------
  return (
    <div className="lead-form-container">
      {/* ✅ Success Popup */}
      {showSuccessPopup && (
        <div className="success-popup-overlay">
          <div className="success-popup">
            <div className="success-icon">✅</div>
            <h3>Form Submitted Successfully!</h3>
            <p>All documents and case information have been saved.</p>
            <div className="success-progress-container">
              <div className="success-progress-bar">
                <div
                  className="success-progress-fill"
                  style={{ width: `${successProgress}%` }}
                />
              </div>
              <span className="success-progress-text">
                {successProgress === 100
                  ? isPublic
                    ? "Complete!"
                    : "Complete! Redirecting..."
                  : `Processing... ${successProgress}%`}
              </span>
            </div>
            <div className="success-stats">
              <div className="stat-item">
                <span className="stat-number">{documentSections.length}</span>
                <span className="stat-label">Document Sections</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{totalFiles}</span>
                <span className="stat-label">Total Files</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{progress}%</span>
                <span className="stat-label">Completion</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Progress Bar */}
      <div className="progress-wrapper">
        <label>
          <b>Progress:</b> {progress}% | <b>Total Files:</b> {totalFiles}
        </label>
        <div className="progress-bar">
          <div
            className={`progress-fill ${progress === 100 ? "complete" : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ✅ Main Form */}
      <form onSubmit={handleSubmit} className="lead-form-card">
        {/* ---------- CASE DETAILS ---------- */}
        <h3 className="form-section-title">Case Details</h3>
        <div className="section">
          <label>Lead ID</label>
          <input type="text" value={form.leadId || ""} readOnly />
        </div>

        <div className="grid-2">
          <div className="section">
            <label>Lead Type *</label>
            <input
              type="text"
              name="leadType"
              value={form.leadType || ""}
              onChange={handleChange}
              placeholder="e.g. Business Loan, Real Estate, Insurance"
              required
            />
          </div>
          <div className="section">
            <label>Lead Sub Type</label>
            <input
              type="text"
              name="subType"
              value={form.subType || ""}
              onChange={handleChange}
              placeholder="e.g. Construction Loan, MSME, etc."
            />
          </div>
        </div>

        <div className="section">
          <label>Amount</label>
          <input
            type="number"
            name="amount"
            value={form.amount || ""}
            onChange={handleChange}
            required
          />
        </div>

        {/* ---------- APPLICANT DETAILS ---------- */}
        <h3 className="form-section-title">Applicant Details</h3>
        <div className="section">
          <label>Applicant Name *</label>
          <input
            type="text"
            name="customerName"
            value={form.customerName || ""}
            onChange={handleChange}
            required
          />
        </div>
        <div className="section">
          <label>Mobile *</label>
          <input
            type="text"
            name="mobile"
            value={form.mobile || ""}
            onChange={handleChange}
            required
          />
        </div>
        <div className="section">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={form.email || ""}
            onChange={handleChange}
            required
          />
        </div>

        {/* ---------- CO-APPLICANT ---------- */}
        {showCoApplicant && (
          <div className="coapplicant-box">
            <h3 className="form-section-title">
              Co-Applicant Details
              <button
                type="button"
                className="btn danger"
                onClick={() => setShowCoApplicant(false)}
                style={{ marginLeft: 8 }}
              >
                × Remove
              </button>
            </h3>
            <div className="section">
              <label>Co-Applicant Name</label>
              <input
                type="text"
                name="applicant2Name"
                value={form.applicant2Name || ""}
                onChange={handleChange}
              />
            </div>
            <div className="section">
              <label>Mobile</label>
              <input
                type="text"
                name="applicant2Mobile"
                value={form.applicant2Mobile || ""}
                onChange={handleChange}
              />
            </div>
            <div className="section">
              <label>Email</label>
              <input
                type="email"
                name="applicant2Email"
                value={form.applicant2Email || ""}
                onChange={handleChange}
              />
            </div>
          </div>
        )}
        {!showCoApplicant && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => setShowCoApplicant(true)}
          >
            + Add Co-Applicant
          </button>
        )}

        {/* ---------- CONTACT DETAILS ---------- */}
        <h3 className="form-section-title">Contact Details</h3>
        <div className="section">
          <label>Permanent Address *</label>
          <textarea
            name="permanentAddress"
            value={form.permanentAddress || ""}
            onChange={handleChange}
            required
          />
        </div>
        <div className="section">
          <label>Current Address</label>
          <textarea
            name="currentAddress"
            value={form.currentAddress || ""}
            onChange={handleChange}
          />
        </div>
        <div className="section">
          <label>Site Address</label>
          <textarea
            name="siteAddress"
            value={form.siteAddress || ""}
            onChange={handleChange}
          />
        </div>
        <div className="section">
          <label>Office/Business Address</label>
          <textarea
            name="officeAddress"
            value={form.officeAddress || ""}
            onChange={handleChange}
          />
        </div>

        {/* ---------- KYC DETAILS ---------- */}
        <h3 className="form-section-title">KYC Details (Self-Employed)</h3>
        <div className="grid-2">
          <div className="section">
            <label>PAN Number</label>
            <input
              type="text"
              name="panNumber"
              placeholder="ABCDE1234F"
              value={form.panNumber || ""}
              onChange={handlePANChange}
              maxLength={10}
            />
          </div>
          <div className="section">
            <label>Aadhaar Number</label>
            <input
              type="text"
              name="aadharNumber"
              placeholder="12-digit Aadhaar"
              value={form.aadharNumber || ""}
              onChange={handleAadhaarChange}
              maxLength={12}
            />
          </div>
        </div>

        {/* ---------- DOCUMENT UPLOADS ---------- */}
        <div className="document-sections-container">
          <div className="section-header">
            <h3 className="form-section-title">Document Uploads</h3>
            <div>
              <span className="file-count-badge">{totalFiles} files total</span>
              <button
                type="button"
                className="btn secondary"
                onClick={addDocumentSection}
              >
                + Add New Section
              </button>
            </div>
          </div>

          {documentSections.map((section, sectionIndex) => (
            <div key={section.id} className="document-section">
              <div className="section-header">
                <input
                  type="text"
                  className="section-name-input"
                  value={section.name}
                  onChange={(e) => {
                    const updatedSections = [...documentSections];
                    updatedSections[sectionIndex].name = e.target.value;
                    setDocumentSections(updatedSections);
                  }}
                  placeholder="Section Name"
                />
                {documentSections.length > 1 && (
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => removeDocumentSection(sectionIndex)}
                  >
                    ✕ Remove Section
                  </button>
                )}
              </div>

              {section.documents.map((doc, docIndex) => (
                <div key={doc.id} className="document-item">
                  <div className="document-header">
                    <input
                      type="text"
                      className="document-type-input"
                      value={doc.name}
                      onChange={(e) =>
                        updateDocumentTypeName(sectionIndex, docIndex, e.target.value)
                      }
                      placeholder="Document Type Name"
                    />
                    <span className="file-count">
                      {
                        doc.files.filter(
                          (f) => !f.isDeleted && f.isActive !== false
                        ).length
                      }{" "}
                      file(s)
                    </span>
                    {section.documents.length > 1 && (
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => removeDocumentType(sectionIndex, docIndex)}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* File List */}
                  <div className="file-list">
                    {doc.files
                      .filter((file) => !file.isDeleted && file.isActive !== false)
                      .map((file, fileIndex) => (
                        <div
                          key={`${file.id || file.filename || file.name || "f"}-${fileIndex}`}
                          className="file-item"
                        >
                          <span className="file-name">{file.name || file.originalname || file.filename}</span>
                          <span
                            className={`file-status ${
                              file.isUploaded ? "uploaded" : "new"
                            }`}
                          >
                            {file.isUploaded ? "(Uploaded)" : "(New)"}
                          </span>
                          <span className="file-size">
                            {file.size > 0 ? `(${Math.round(file.size / 1024)} KB)` : ""}
                          </span>
                          <button
                            type="button"
                            className="btn danger small"
                            onClick={() => removeFile(sectionIndex, docIndex, fileIndex)}
                          >
                            ✕ Delete
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Upload Buttons */}
                  <div className="upload-buttons">
                    <label className="btn secondary small">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          handleFileUpload(e.target.files, sectionIndex, docIndex);
                          e.target.value = "";
                        }}
                        style={{ display: "none" }}
                      />
                      📁 Add Multiple Files
                    </label>
                    <label className="btn secondary small">
                      <input
                        type="file"
                        onChange={(e) => {
                          handleFileUpload(e.target.files, sectionIndex, docIndex);
                          e.target.value = "";
                        }}
                        style={{ display: "none" }}
                      />
                      📄 Add Single File
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn secondary small"
                onClick={() => addDocumentType(sectionIndex)}
              >
                + Add Document Type
              </button>
            </div>
          ))}
        </div>

        {/* ---------- ACTION BUTTONS ---------- */}
        <div className="form-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : `Submit Case (${progress}%)`}
          </button>
        </div>
      </form>
    </div>
  );
}
