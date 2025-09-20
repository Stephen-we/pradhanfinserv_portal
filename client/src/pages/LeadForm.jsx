import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const steps = [
  "Lead Details",
  "Customer Details",
  "Contact Details",
  "Case Details",
  "Address Details",
  "Documents",
];

export default function LeadForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    leadType: "Loan",
    requirementAmount: "",
    name: "",
    dob: "",
    mobile: "",
    email: "",
    pan: "",
    aadhaar: "",
    address: "",
    sanctionAmount: "",
    permanentAddress: "",
    correspondenceAddress: "",
    documents: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm((f) => ({ ...f, documents: Array.from(e.target.files) }));
  };

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const save = async () => {
    try {
      await API.post("/leads", form);
      alert("✅ Lead created successfully!");
      navigate("/leads");   // 👈 smooth redirect, no full reload
    } catch (err) {
      alert("❌ Error saving lead: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="card" style={{ maxWidth: 900, margin: "20px auto", padding: 30 }}>
      {/* Progress Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 30 }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px",
              borderBottom: i === step ? "3px solid var(--primary)" : "1px solid #ddd",
              fontWeight: i === step ? "bold" : "normal",
              color: i === step ? "var(--primary)" : "#64748b",
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="form-section">
        {step === 0 && (
          <>
            <label>Lead Type</label>
            <select className="input" name="leadType" value={form.leadType} onChange={handleChange}>
              <option>Loan</option>
              <option>Insurance</option>
              <option>Real Estate</option>
            </select>
            <label>Requirement Amount</label>
            <input className="input" name="requirementAmount" value={form.requirementAmount} onChange={handleChange} />
          </>
        )}

        {step === 1 && (
          <>
            <label>Customer Name</label>
            <input className="input" name="name" value={form.name} onChange={handleChange} />
            <label>Date of Birth</label>
            <input className="input" type="date" name="dob" value={form.dob} onChange={handleChange} />
            <label>PAN</label>
            <input className="input" name="pan" value={form.pan} onChange={handleChange} />
            <label>Aadhaar</label>
            <input className="input" name="aadhaar" value={form.aadhaar} onChange={handleChange} />
          </>
        )}

        {step === 2 && (
          <>
            <label>Mobile</label>
            <input className="input" name="mobile" value={form.mobile} onChange={handleChange} maxLength={10} />
            <label>Email</label>
            <input className="input" name="email" value={form.email} onChange={handleChange} />
            <label>Address</label>
            <textarea className="input" name="address" value={form.address} onChange={handleChange} />
          </>
        )}

        {step === 3 && (
          <>
            <label>Sanction Amount (if approved)</label>
            <input className="input" name="sanctionAmount" value={form.sanctionAmount} onChange={handleChange} />
          </>
        )}

        {step === 4 && (
          <>
            <label>Permanent Address</label>
            <textarea className="input" name="permanentAddress" value={form.permanentAddress} onChange={handleChange} />
            <label>Correspondence Address</label>
            <textarea className="input" name="correspondenceAddress" value={form.correspondenceAddress} onChange={handleChange} />
          </>
        )}

        {step === 5 && (
          <>
            <label>Upload Documents</label>
            <input className="input" type="file" multiple onChange={handleFileChange} />
          </>
        )}
      </div>

      {/* Buttons */}
      <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {step > 0 && <button className="btn secondary" onClick={back}>Back</button>}
        {step < steps.length - 1 && <button className="btn" onClick={next}>Next</button>}
        {step === steps.length - 1 && <button className="btn" onClick={save}>Save</button>}
      </div>
    </div>
  );
}
