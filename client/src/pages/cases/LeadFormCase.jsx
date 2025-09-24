// client/src/pages/cases/LeadFormCase.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../services/api";
import "../../styles/cases.css"; // ✅ global styles

export default function LeadFormCase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCoApplicant, setShowCoApplicant] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Progress calculation
  const progress = useMemo(() => {
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
      (f) => form[f] && form[f].toString().trim() !== ""
    );
    return Math.round((filled.length / requiredFields.length) * 100);
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await API.put(`/cases/${id}`, form);
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
    <div className="lead-form-container" style={{ maxWidth: "1000px", margin: "auto" }}>
      {/* 🔹 Progress Bar */}
      <div style={{ marginBottom: "25px" }}>
        <label><b>Progress:</b> {progress}%</label>
        <div style={{ background: "#e5e7eb", borderRadius: "8px", height: "14px", marginTop: "4px" }}>
          <div
            style={{
              width: `${progress}%`,
              background: progress < 100 ? "#f59e0b" : "#16a34a",
              height: "100%",
              borderRadius: "8px",
              transition: "width 0.3s ease-in-out",
            }}
          ></div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="lead-form-card"
        style={{
          background: "#fff",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
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
          <input type="text" name="loanType" value={form.loanType || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Amount</label>
          <input type="number" name="amount" value={form.amount || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Bank</label>
          <input type="text" name="bank" value={form.bank || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Branch</label>
          <input type="text" name="branch" value={form.branch || ""} onChange={handleChange} />
        </div>

        {/* Applicant Details */}
        <h3 className="form-section-title">
          <i className="fas fa-user"></i> Applicant Details
        </h3>
        <div className="section">
          <label>Applicant Name</label>
          <input type="text" name="customerName" value={form.customerName || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Mobile</label>
          <input type="text" name="primaryMobile" value={form.primaryMobile || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Email</label>
          <input type="email" name="email" value={form.email || ""} onChange={handleChange} />
        </div>

        {/* Co-Applicant */}
        {showCoApplicant && (
          <div className="coapplicant-box">
            <h3 className="form-section-title">
              <i className="fas fa-users"></i> Co-Applicant Details
              <button
                type="button"
                className="btn danger"
                style={{ marginLeft: "10px", padding: "4px 10px", fontSize: "12px" }}
                onClick={() => setShowCoApplicant(false)}
              >
                × Remove
              </button>
            </h3>
            <div className="section">
              <label>Co-Applicant Name</label>
              <input type="text" name="applicant2Name" value={form.applicant2Name || ""} onChange={handleChange} />
            </div>
            <div className="section">
              <label>Mobile</label>
              <input type="text" name="applicant2Mobile" value={form.applicant2Mobile || ""} onChange={handleChange} />
            </div>
            <div className="section">
              <label>Email</label>
              <input type="email" name="applicant2Email" value={form.applicant2Email || ""} onChange={handleChange} />
            </div>
          </div>
        )}
        {!showCoApplicant && (
          <button type="button" className="btn secondary" style={{ marginTop: "10px" }} onClick={() => setShowCoApplicant(true)}>
            + Add Co-Applicant
          </button>
        )}

        {/* Contact Details */}
        <h3 className="form-section-title">
          <i className="fas fa-map-marker-alt"></i> Contact Details
        </h3>
        <div className="section">
          <label>Permanent Address</label>
          <textarea name="permanentAddress" value={form.permanentAddress || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Current Address</label>
          <textarea name="currentAddress" value={form.currentAddress || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Site Address</label>
          <textarea name="siteAddress" value={form.siteAddress || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Office/Business Address</label>
          <textarea name="officeAddress" value={form.officeAddress || ""} onChange={handleChange} />
        </div>

        {/* KYC Details */}
        <h3 className="form-section-title">
          <i className="fas fa-id-card"></i> KYC Details
        </h3>
        <div className="section">
          <label>PAN</label>
          <input type="text" name="pan" value={form.pan || ""} onChange={handleChange} />
        </div>
        <div className="section">
          <label>Aadhar</label>
          <input type="text" name="aadhar" value={form.aadhar || ""} onChange={handleChange} />
        </div>

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
