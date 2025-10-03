// client/src/pages/LeadForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

const empty = {
  name: "",
  mobile: "",
  email: "",
  dob: "", // ✅ Added DOB
  source: "",
  leadType: "",
  subType: "",
  requirementAmount: "",
  sanctionedAmount: "",
  gdStatus: "Pending",
  bank: "",
  branch: "",
  channelPartner: "",
  status: "free_pool",
  notes: "",
  permanentAddress: "",
  currentAddress: "",
  siteAddress: "",
  officeAddress: "",
  pan: "",
  aadhar: "",
};

export default function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [duplicateError, setDuplicateError] = useState(null);
  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [channelPartners, setChannelPartners] = useState([]);
  const [partnersError, setPartnersError] = useState(null);
  const isEdit = Boolean(id);

  // ✅ Lead Type Categories
  const leadTypeOptions = [
    "Business Loan",
    "Construction Loan",
    "Education Loan",
    "Insurance",
    "Real Estate",
  ];

  // ✅ Sub Type Options by Category
  const subTypeOptions = {
    "Business Loan": [
      "Home Loan",
      "Resale Home Loan",
      "Take Over + Top Up",
      "Take Over Loan",
      "MSME Loan",
    ],
    "Construction Loan": [
      "LAP (Loan Against Property)",
      "Plot + Construction Loan",
    ],
    "Education Loan": ["Personal Loan", "Vehicle Loan"],
    Insurance: ["Life Insurance", "Health Insurance", "Vehicle Insurance"],
    "Real Estate": ["Residential", "Commercial", "Plot Purchase"],
  };

  // ✅ Fetch all distinct banks
  useEffect(() => {
    API.get("/branches/banks/distinct")
      .then(({ data }) => setBanks(data))
      .catch(() => console.error("Failed to load banks"));
  }, []);

  // ✅ Fetch channel partners
  useEffect(() => {
    const fetchChannelPartners = async () => {
      try {
        setPartnersError(null);
        const { data } = await API.get("/channel-partners");

        let partners = [];
        if (Array.isArray(data)) {
          partners = data;
        } else if (data && Array.isArray(data.docs)) {
          partners = data.docs;
        } else if (data && Array.isArray(data.items)) {
          partners = data.items;
        }

        if (partners.length > 0) {
          setChannelPartners(partners);
        } else {
          setChannelPartners([]);
          setPartnersError("⚠️ No channel partners found");
        }
      } catch (error) {
        console.error("Failed to load channel partners:", error);
        setChannelPartners([]);
        setPartnersError(
          "Failed to load channel partners. The feature may not be available."
        );
      }
    };

    fetchChannelPartners();
  }, []);

  // ✅ Fetch branches when bank changes
  useEffect(() => {
    if (!form.bank) {
      setBranches([]);
      setForm((prev) => ({ ...prev, branch: "" }));
      return;
    }

    setLoadingBranches(true);
    API.get(`/branches/banks/${encodeURIComponent(form.bank)}/branches`)
      .then(({ data }) => setBranches(data))
      .catch(() => console.error("Failed to load branches"))
      .finally(() => setLoadingBranches(false));
  }, [form.bank]);

  // ✅ Load lead if editing
  useEffect(() => {
    if (!isEdit) return;

    API.get(`/leads/${id}`)
      .then(({ data }) => {
        const leadData = {
          ...empty,
          ...data,
          requirementAmount: data.requirementAmount ?? "",
          sanctionedAmount: data.sanctionedAmount ?? "",
          bank: data.bank || "",
          branch: data.branch || "",
          channelPartner: data.channelPartner || "",
          permanentAddress: data.permanentAddress || "",
          currentAddress: data.currentAddress || "",
          siteAddress: data.siteAddress || "",
          officeAddress: data.officeAddress || "",
          pan: data.pan || "",
          aadhar: data.aadhar || "",
          dob: data.dob ? data.dob.slice(0, 10) : "", // ✅ Format date for input
        };

        setForm(leadData);

        if (data.bank) {
          API.get(`/branches/banks/${encodeURIComponent(data.bank)}/branches`)
            .then(({ data: branchesData }) => setBranches(branchesData))
            .catch(() => console.error("Failed to load branches"));
        }
      })
      .catch(() => alert("Unable to load lead"));
  }, [id, isEdit]);

  // ✅ Submit form
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        dob: form.dob ? new Date(form.dob) : null, // ✅ Send as Date
        requirementAmount:
          form.requirementAmount === "" ? null : Number(form.requirementAmount),
        sanctionedAmount:
          form.sanctionedAmount === "" ? null : Number(form.sanctionedAmount),
        permanentAddress: form.permanentAddress || null,
        currentAddress: form.currentAddress || null,
        siteAddress: form.siteAddress || null,
        officeAddress: form.officeAddress || null,
        pan: form.pan || null,
        aadhar: form.aadhar || null,
        channelPartner: form.channelPartner || null,
      };

      if (isEdit) {
        await API.patch(`/leads/${id}`, payload);
      } else {
        await API.post("/leads", payload);
      }
      navigate("/leads");
    } catch (err) {
      if (err.response?.status === 400) {
        setDuplicateError(err.response.data);
      } else {
        alert(err.response?.data?.message || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="card" style={{ maxWidth: 800 }}>
      <h2 style={{ marginTop: 0 }}>{isEdit ? "Edit Lead" : "Add Lead"}</h2>

      {/* ✅ Channel Partners Error Message */}
      {partnersError && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeaa7",
            color: "#856404",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "15px",
            fontSize: "14px",
          }}
        >
          {partnersError}
        </div>
      )}

      <form
        onSubmit={submit}
        className="grid"
        style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}
      >
        {/* Customer Name */}
        <input
          className="input"
          placeholder="Customer Name *"
          value={form.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          required
        />

        {/* Mobile */}
        <input
          className="input"
          placeholder="Mobile *"
          value={form.mobile}
          onChange={(e) => handleInputChange("mobile", e.target.value)}
          required
          pattern="[0-9]{10}"
          maxLength={10}
          title="Mobile number must be exactly 10 digits"
        />

        {/* ✅ Date of Birth */}
        <input
          className="input"
          type="date"
          value={form.dob}
          onChange={(e) => handleInputChange("dob", e.target.value)}
        />

        {/* Email */}
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
        />

        {/* Source */}
        <select
          className="input"
          value={form.source}
          onChange={(e) => handleInputChange("source", e.target.value)}
          required
        >
          <option value="">-- Select Source * --</option>
          <option value="Business">Business</option>
          <option value="Non-Business">Non-Business</option>
        </select>

        {/* Channel Partner */}
        <select
          className="input"
          value={form.channelPartner}
          onChange={(e) => handleInputChange("channelPartner", e.target.value)}
          style={partnersError ? { borderColor: "#ffc107" } : {}}
        >
          <option value="">-- Select Channel Partner --</option>
          {channelPartners.length === 0 && !partnersError ? (
            <option disabled>Loading channel partners...</option>
          ) : (
            channelPartners.map((partner) => (
              <option key={partner._id} value={partner._id}>
                {partner.partnerId} - {partner.name}
              </option>
            ))
          )}
        </select>

        {/* Lead Type */}
        <select
          className="input"
          value={form.leadType}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              leadType: e.target.value,
              subType: "",
            }))
          }
        >
          <option value="">-- Select Lead Type --</option>
          {leadTypeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {/* Sub Type */}
        <select
          className="input"
          value={form.subType}
          onChange={(e) => handleInputChange("subType", e.target.value)}
          disabled={!form.leadType}
        >
          <option value="">-- Select Sub Type --</option>
          {form.leadType &&
            subTypeOptions[form.leadType]?.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
        </select>

        {/* Requirement Amount */}
        <input
          className="input"
          placeholder="Requirement Amount"
          type="number"
          value={form.requirementAmount}
          onChange={(e) =>
            handleInputChange("requirementAmount", e.target.value)
          }
        />

        {/* Sanctioned Amount */}
        <input
          className="input"
          placeholder="Sanctioned Amount"
          type="number"
          value={form.sanctionedAmount}
          onChange={(e) =>
            handleInputChange("sanctionedAmount", e.target.value)
          }
        />

        {/* Bank */}
        <select
          className="input"
          value={form.bank}
          onChange={(e) => handleInputChange("bank", e.target.value)}
        >
          <option value="">-- Select Bank --</option>
          {banks.map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </select>

        {/* Branch */}
        <select
          className="input"
          value={form.branch}
          onChange={(e) => handleInputChange("branch", e.target.value)}
          disabled={!form.bank || loadingBranches}
        >
          <option value="">-- Select Branch --</option>
          {loadingBranches ? (
            <option>Loading branches...</option>
          ) : (
            branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))
          )}
        </select>

        {/* GD Status */}
        <select
          className="input"
          value={form.gdStatus}
          onChange={(e) => handleInputChange("gdStatus", e.target.value)}
        >
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Status */}
        <select
          className="input"
          value={form.status}
          onChange={(e) => handleInputChange("status", e.target.value)}
        >
          <option value="free_pool">Free Pool</option>
          <option value="assigned">Assigned</option>
          <option value="archived">Archived</option>
          <option value="deleted">Deleted</option>
        </select>

        {/* PAN */}
        <input
          className="input"
          placeholder="PAN Number"
          value={form.pan}
          onChange={(e) => handleInputChange("pan", e.target.value)}
          style={{ textTransform: "uppercase" }}
          maxLength={10}
        />

        {/* Aadhar */}
        <input
          className="input"
          placeholder="Aadhar Number"
          type="number"
          value={form.aadhar}
          onChange={(e) => handleInputChange("aadhar", e.target.value)}
          maxLength={12}
        />

        {/* Permanent Address */}
        <textarea
          className="input"
          placeholder="Permanent Address"
          style={{ gridColumn: "1 / -1", minHeight: 60 }}
          value={form.permanentAddress}
          onChange={(e) =>
            handleInputChange("permanentAddress", e.target.value)
          }
        />

        {/* Current Address */}
        <textarea
          className="input"
          placeholder="Current Address"
          style={{ gridColumn: "1 / -1", minHeight: 60 }}
          value={form.currentAddress}
          onChange={(e) => handleInputChange("currentAddress", e.target.value)}
        />

        {/* Site Address */}
        <textarea
          className="input"
          placeholder="Site Address"
          style={{ gridColumn: "1 / -1", minHeight: 60 }}
          value={form.siteAddress}
          onChange={(e) => handleInputChange("siteAddress", e.target.value)}
        />

        {/* Office Address */}
        <textarea
          className="input"
          placeholder="Office Address"
          style={{ gridColumn: "1 / -1", minHeight: 60 }}
          value={form.officeAddress}
          onChange={(e) => handleInputChange("officeAddress", e.target.value)}
        />

        {/* Notes */}
        <textarea
          className="input"
          placeholder="Notes"
          style={{ gridColumn: "1 / -1", minHeight: 80 }}
          value={form.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
        />

        {/* Buttons */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            borderTop: "1px solid #eee",
            paddingTop: 16,
            marginTop: 8,
          }}
        >
          <button
            className="btn secondary"
            type="button"
            onClick={() => navigate("/leads")}
          >
            Cancel
          </button>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Lead" : "Create Lead"}
          </button>
        </div>
      </form>

      {/* Duplicate modal */}
      {duplicateError && (
        <div className="modal-overlay">
          <div className="modal red">
            <h3>⚠️ Duplicate Customer</h3>
            <p>{duplicateError.message}</p>
            <div className="actions">
              <button
                className="btn secondary"
                onClick={() => setDuplicateError(null)}
              >
                Close
              </button>
              <button
                className="btn"
                onClick={() => navigate(`/leads/${duplicateError.id}/view`)}
              >
                View Existing ({duplicateError.leadId})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
