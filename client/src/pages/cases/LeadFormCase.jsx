// client/src/pages/cases/LeadFormCase.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import "../../styles/leadformcases.css";

export default function LeadFormCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCoApplicant, setShowCoApplicant] = useState(false);
  
  // ✅ Document Management State
  const [documentSections, setDocumentSections] = useState([
    {
      id: 1,
      name: "KYC Documents",
      documents: [
        { id: 1, name: "Photo 4 each (A & C)", files: [] },
        { id: 2, name: "PAN Self attested - A & C", files: [] },
        { id: 3, name: "Aadhar - self attested - A & C", files: [] },
        { id: 4, name: "Address Proof (Resident & Shop/Company)", files: [] },
        { id: 5, name: "Shop Act/Company Registration/Company PAN", files: [] },
        { id: 6, name: "Bank statement last 12 months (CA and SA)", files: [] },
        { id: 7, name: "GST/Trade/Professional Certificate", files: [] },
        { id: 8, name: "Udyam Registration/Certificate", files: [] },
        { id: 9, name: "ITR last 3 years (Computation / P&L / Balance Sheet)", files: [] },
        { id: 10, name: "Marriage Certificate (if required)", files: [] },
        { id: 11, name: "Partnership Deed (if required)", files: [] },
        { id: 12, name: "MOA & AOA Company Registration", files: [] },
        { id: 13, name: "Form 26AS Last 3 Years", files: [] },
      ]
    }
  ]);

  // -------- Load Case --------
  useEffect(() => {
    API.get(`/cases/${id}`)
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
  }, [id]);

  // Convert old kycDocs structure to new documentSections structure
  const convertOldToNewStructure = (kycDocs) => {
    const kycDocumentNames = [
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
    ];

    const documents = kycDocumentNames.map((name, index) => {
      const fieldName = `kycDoc_${index}`;
      const oldFiles = kycDocs[fieldName] || [];
      
      // Convert file strings to file objects
      const files = oldFiles.map(file => ({
        id: Date.now() + Math.random(),
        name: typeof file === 'string' ? file : file.name,
        filename: typeof file === 'string' ? file : file.name,
        type: 'uploaded', // Mark as already uploaded
        size: 0,
        uploadDate: new Date().toISOString()
      }));

      return {
        id: index + 1,
        name: name,
        files: files
      };
    });

    return [{
      id: 1,
      name: "KYC Documents",
      documents: documents
    }];
  };

  // -------- Document Handlers --------
  const handleFileUpload = (files, sectionIndex, docIndex) => {
    const fileList = Array.from(files);
    
    setDocumentSections(prev => {
      const updatedSections = [...prev];
      const currentSection = updatedSections[sectionIndex];
      const currentDocument = currentSection.documents[docIndex];
      
      const newFiles = fileList.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        file: file, // Actual File object for new uploads
        filename: file.name,
        type: file.type,
        size: file.size,
        uploadDate: new Date().toISOString()
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
        id: Date.now(),
        name: `Additional Documents ${prev.length}`,
        documents: [
          { id: Date.now() + 1, name: "New Document Type", files: [] }
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
      updatedSections[sectionIndex].documents.push({
        id: Date.now(),
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

      // ✅ Append all files from document sections
     let totalFiles = 0;
        documentSections.forEach((section, sectionIndex) => {
          section.documents.forEach((doc, docIndex) => {
            doc.files.forEach((fileObj, fileIndex) => {
              if (fileObj.file) { // Only append new files, not already uploaded ones
                // Use the pattern: doc_sectionIndex_docIndex_fileIndex
                fd.append(`doc_${sectionIndex}_${docIndex}_${fileIndex}`, fileObj.file);
                totalFiles++;
                 console.log(`📤 Appending file: doc_${sectionIndex}_${docIndex}_${fileIndex} - ${fileObj.name}`);
              }
            });
          });
        });

         console.log(`📤 Submitting form with ${totalFiles} new files`);

        // IMPORTANT: Don't set Content-Type header - let browser set it automatically
    await API.put(`/cases/${id}`, fd);

    alert("Case submitted successfully!");
    navigate(`/cases/${id}/view`);
  } catch (err) {
    console.error("❌ Failed to submit case:", err);
    alert(err.response?.data?.message || "Failed to submit case");
  } finally {
    setIsSubmitting(false);
  }
};

  if (!form) return <p>Loading...</p>;

  return (
    <div className="lead-form-container">
      {/* 🔹 Progress Bar */}
      <div className="progress-wrapper">
        <label>
          <b>Progress:</b> {progress}%
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
          />
        </div>
        <div className="section">
          <label>Amount</label>
          <input
            type="number"
            name="amount"
            value={form.amount || ""}
            onChange={handleChange}
          />
        </div>

        {/* Applicant Details */}
        <h3 className="form-section-title">Applicant Details</h3>
        <div className="section">
          <label>Applicant Name</label>
          <input
            type="text"
            name="customerName"
            value={form.customerName || ""}
            onChange={handleChange}
          />
        </div>
        <div className="section">
          <label>Mobile</label>
          <input
            type="text"
            name="mobile"
            value={form.mobile || ""}
            onChange={handleChange}
          />
        </div>
        <div className="section">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email || ""}
            onChange={handleChange}
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
          <label>Permanent Address</label>
          <textarea
            name="permanentAddress"
            value={form.permanentAddress || ""}
            onChange={handleChange}
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
            <button
              type="button"
              className="btn secondary"
              onClick={addDocumentSection}
            >
              + Add New Section
            </button>
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
                    />
                    {section.documents.length > 1 && (
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={() => removeDocumentType(sectionIndex, docIndex)}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* File List */}
                  <div className="file-list">
                    {doc.files.map((file, fileIndex) => (
                      <div key={file.id} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">
                          {file.size > 0 ? `(${Math.round(file.size / 1024)} KB)` : '(Uploaded)'}
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
                      + Add Multiple Files
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
                      + Add Single File
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
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}