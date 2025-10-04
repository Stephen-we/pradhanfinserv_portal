// client/src/pages/cases/LeadFormCase.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import "../../styles/leadformcases.css";

export default function LeadFormCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 🔹 Detect public mode based on URL path: /cases/:id/public-form
  const isPublic = typeof window !== "undefined" && window.location.pathname.includes("public-form");

  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCoApplicant, setShowCoApplicant] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successProgress, setSuccessProgress] = useState(0);
  
  // ✅ Document Management State
  const [documentSections, setDocumentSections] = useState([
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
      ]
    }
  ]);

  // -------- Enhanced Success Popup --------
  const showEnhancedSuccess = () => {
    setShowSuccessPopup(true);
    setSuccessProgress(0);
    
    // Animate progress bar
    const interval = setInterval(() => {
      setSuccessProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // 🔹 In public mode: do NOT redirect to protected /view (would require login)
            if (!isPublic) {
              setShowSuccessPopup(false);
              navigate(`/cases/${id}/view`);
            } else {
              // In public mode, just close the popup after completion
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
    // 🔹 Use public endpoint in public mode
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
        
        // ✅ Load existing documents - support both old and new structures
        if (data.documentSections && data.documentSections.length > 0) {
          setDocumentSections(data.documentSections);
        } else if (data.kycDocs) {
          // Convert old structure to new structure
          const convertedSections = convertOldToNewStructure(data.kycDocs);
          setDocumentSections(convertedSections);
        }
      })
      .catch(() => alert("Unable to load case"));
  }, [id, isPublic]);

  // Convert old kycDocs structure to new documentSections structure
  const convertOldToNewStructure = (kycDocs) => {
    // If no old KYC docs, return the default structure
    if (!kycDocs || Object.keys(kycDocs).length === 0) {
      return documentSections; // Return current default structure
    }
    
    // If there are old KYC docs, convert them quickly without flash
    const defaultSection = documentSections[0]; // Use the default structure
    return [defaultSection]; // Return array with just the KYC section
  };

  // -------- Document Handlers --------
  const handleFileUpload = (files, sectionIndex, docIndex) => {
    const fileList = Array.from(files);
    
    setDocumentSections(prev => {
      const updatedSections = [...prev];
      const currentSection = updatedSections[sectionIndex];
      const currentDocument = currentSection.documents[docIndex];
      
      const newFiles = fileList.map(file => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        file: file, // Actual File object for new uploads
        filename: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date().toISOString(),
        isUploaded: false // Mark as new file to be uploaded
      }));

      // Add new files to existing ones
      currentDocument.files = [...currentDocument.files, ...newFiles];
      
      return updatedSections;
    });
  };

  const removeFile = (sectionIndex, docIndex, fileIndex) => {
    setDocumentSections(prev => {
      const updatedSections = [...prev];
      updatedSections[sectionIndex].documents[docIndex].files.splice(fileIndex, 1);
      return updatedSections;
    });
  };

  const addDocumentSection = () => {
    setDocumentSections(prev => [
      ...prev,
      {
        id: `section-${Date.now()}`,
        name: `Additional Documents ${prev.length + 1}`,
        documents: [
          { 
            id: `doc-${prev.length + 1}-1`, 
            name: "New Document Type", 
            files: [] 
          }
        ]
      }
    ]);
  };

  const removeDocumentSection = (sectionIndex) => {
    if (documentSections.length <= 1) {
      alert("At least one document section is required");
      return;
    }
    setDocumentSections(prev => prev.filter((_, index) => index !== sectionIndex));
  };

  const addDocumentType = (sectionIndex) => {
    setDocumentSections(prev => {
      const updatedSections = [...prev];
      const section = updatedSections[sectionIndex];
      const newDocIndex = section.documents.length + 1;
      
      section.documents.push({
        id: `doc-${sectionIndex + 1}-${newDocIndex}`,
        name: "New Document Type",
        files: []
      });
      return updatedSections;
    });
  };

  const updateDocumentTypeName = (sectionIndex, docIndex, newName) => {
    setDocumentSections(prev => {
      const updatedSections = [...prev];
      updatedSections[sectionIndex].documents[docIndex].name = newName;
      return updatedSections;
    });
  };

  const removeDocumentType = (sectionIndex, docIndex) => {
    setDocumentSections(prev => {
      const updatedSections = [...prev];
      const section = updatedSections[sectionIndex];
      
      if (section.documents.length <= 1) {
        alert("At least one document type is required in each section");
        return prev;
      }
      
      section.documents.splice(docIndex, 1);
      return updatedSections;
    });
  };

  // -------- Form Handlers --------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // PAN: 10 chars, uppercase alphanumeric
  const handlePANChange = (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, panNumber: v }));
  };

  // Aadhaar: digits only, 12 length
  const handleAadhaarChange = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 12);
    setForm((prev) => ({ ...prev, aadharNumber: v }));
  };

  // ✅ Progress calculation - includes documents
  const progress = useMemo(() => {
    const requiredFields = [
      "leadId",
      "customerName",
      "mobile",
      "email",
      "loanType",
      "amount",
      "permanentAddress",
    ];
    const filled = requiredFields.filter(
      (f) => form[f] && form[f].toString().trim() !== ""
    );
    
    // Check if any documents are uploaded
    const hasDocuments = documentSections.some(section => 
      section.documents.some(doc => doc.files.length > 0)
    );
    
    // Base form progress (70%) + documents progress (30%)
    const baseProgress = Math.round((filled.length / requiredFields.length) * 70);
    const documentProgress = hasDocuments ? 30 : 0;
    
    return baseProgress + documentProgress;
  }, [form, documentSections]);

  // -------- Submit --------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();

      // Append all normal text fields
      for (const key in form) {
        if (form[key] !== undefined && form[key] !== null) {
          fd.append(key, form[key]);
        }
      }

      // ✅ Append document sections structure
      fd.append('documentSections', JSON.stringify(documentSections));

      // ✅ Append all files from document sections WITH METADATA
      let totalFiles = 0;
      documentSections.forEach((section, sectionIndex) => {
        section.documents.forEach((doc, docIndex) => {
          doc.files.forEach((fileObj) => {
            // Only append new files (not already uploaded ones)
            if (fileObj.file && !fileObj.isUploaded) {
              fd.append('documents', fileObj.file);
              
              // 🔥 CRITICAL: Append metadata for backend mapping
              fd.append('documents_sectionIndex', sectionIndex.toString());
              fd.append('documents_docIndex', docIndex.toString());
              fd.append('documents_docId', doc.id);
              
              console.log(`📤 Appending file: ${fileObj.name} to section ${sectionIndex}, doc ${docIndex}, id: ${doc.id}`);
              totalFiles++;
            }
          });
        });
      });

      console.log(`📦 Submitting form with ${totalFiles} new files and ${documentSections.length} document sections`);

      // 🔹 Use public endpoint in public mode
      const url = isPublic ? `/cases/${id}/public` : `/cases/${id}`;
      const response = await API.put(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Case updated successfully:", response.data);
      
      // Show enhanced success popup instead of simple alert
      showEnhancedSuccess();
      
    } catch (err) {
      console.error("❌ Failed to submit case:", err);
      console.error("Error details:", err.response?.data);
      alert(err.response?.data?.message || "Failed to submit case");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to count total files
  const totalFiles = useMemo(() => {
    return documentSections.reduce((total, section) => {
      return total + section.documents.reduce((docTotal, doc) => {
        return docTotal + doc.files.length;
      }, 0);
    }, 0);
  }, [documentSections]);

  if (!form) return <p>Loading...</p>;

  return (
    <div className="lead-form-container">
      {/* 🔹 Enhanced Success Popup */}
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
                  ? (isPublic ? 'Complete!' : 'Complete! Redirecting...') 
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

      {/* 🔹 Progress Bar */}
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

      <form onSubmit={handleSubmit} className="lead-form-card">
        {/* Case Details */}
        <h3 className="form-section-title">Case Details</h3>
        <div className="section">
          <label>Lead ID</label>
          <input type="text" value={form.leadId || ""} readOnly />
        </div>
        <div className="section">
          <label>Loan Type</label>
          <input
            type="text"
            name="loanType"
            value={form.loanType || ""}
            onChange={handleChange}
            required
          />
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

        {/* Applicant Details */}
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

        {/* Co-Applicant */}
        {showCoApplicant && (
          <div className="coapplicant-box">
            <h3 className="form-section-title">
              Co-Applicant Details
              <button
                type="button"
                className="btn danger"
                onClick={() => setShowCoApplicant(false)}
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

        {/* Contact Details */}
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

        {/* KYC Quick Details */}
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

        {/* ✅ Enhanced Document Uploads */}
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
                      onChange={(e) => updateDocumentTypeName(sectionIndex, docIndex, e.target.value)}
                      placeholder="Document Type Name"
                    />
                    <span className="file-count">
                      {doc.files.length} file(s)
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
                    {doc.files.map((file, fileIndex) => (
                      <div key={file.id} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <span className={`file-status ${file.isUploaded ? 'uploaded' : 'new'}`}>
                          {file.isUploaded ? '(Uploaded)' : '(New)'}
                        </span>
                        <span className="file-size">
                          {file.size > 0 ? `(${Math.round(file.size / 1024)} KB)` : ''}
                        </span>
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => removeFile(sectionIndex, docIndex, fileIndex)}
                        >
                          ✕
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
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      📁 Add Multiple Files
                    </label>
                    <label className="btn secondary small">
                      <input
                        type="file"
                        onChange={(e) => {
                          handleFileUpload(e.target.files, sectionIndex, docIndex);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
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

        {/* Actions */}
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