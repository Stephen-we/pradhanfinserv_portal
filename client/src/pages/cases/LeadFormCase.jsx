//client/src/pages/cases/LeadFormCase.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import "../../styles/leadformcases.css"; // ✅ global styles

export default function LeadFormCase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCoApplicant, setShowCoApplicant] = useState(false);

  // -------- Load Case --------
  useEffect(() => {
    API.get(`/cases/${id}`)
      .then(({ data }) => {
        setForm({
          ...data,
          customerName: data.customerName || data.name || "",
          primaryMobile: data.primaryMobile || data.mobile || "",
          email: data.email || "",
        });
        if (data.applicant2Name) setShowCoApplicant(true);
      })
      .catch(() => alert("Unable to load case"));
  }, [id]);

  // -------- Handlers --------
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
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

  // ✅ Progress calculation (updated to remove bank/branch from required fields)
  const progress = useMemo(() => {
    const requiredFields = [
      "leadId",
      "customerName",
      "primaryMobile",
      "email",
      "loanType",
      "amount",
      "permanentAddress",
    ];
    const filled = requiredFields.filter(
      (f) => form[f] && form[f].toString().trim() !== ""
    );
    return Math.round((filled.length / requiredFields.length) * 100);
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      for (const key in form) fd.append(key, form[key]);

      await API.put(`/cases/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

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
        <h3 className="form-section-title">
          <i className="fas fa-briefcase"></i> Case Details
        </h3>

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

        {/* 🔹 Bank & Branch removed from here */}

        {/* Applicant Details */}
        <h3 className="form-section-title">
          <i className="fas fa-user"></i> Applicant Details
        </h3>

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
            name="primaryMobile"
            value={form.primaryMobile || ""}
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
              <i className="fas fa-users"></i> Co-Applicant Details
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
        <h3 className="form-section-title">
          <i className="fas fa-map-marker-alt"></i> Contact Details
        </h3>

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

        {/* KYC Details */}
        <h3 className="form-section-title">
          <i className="fas fa-id-card"></i> KYC Details (Self-Employed)
        </h3>

        {/* PAN & Aadhaar numbers (new) */}
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
            <small className="hint">10 characters, uppercase alphanumeric</small>
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
            <small className="hint">Digits only, 12 numbers</small>
          </div>
        </div>

        {/* Existing document uploads */}
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
        ].map((doc, i) => (
          <div className="section" key={i}>
            <label>{doc}</label>
            <input type="file" name={`kycDoc_${i}`} onChange={handleChange} />
          </div>
        ))}

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={() => navigate(-1)}>
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