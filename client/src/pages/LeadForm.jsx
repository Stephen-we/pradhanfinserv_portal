// client/src/pages/LeadForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

const empty = {
  name: "",
  mobile: "",
  email: "",
  source: "",
  leadType: "Loan",
  subType: "",
  requirementAmount: "",
  sanctionedAmount: "",
  gdStatus: "Pending",
  bank: "",
  branch: "",
  channelPartner: "", // ✅ New field for channel partner
  status: "free_pool",
  notes: "",
  // Address fields
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
  const [channelPartners, setChannelPartners] = useState([]); // ✅ New state for channel partners
  const isEdit = Boolean(id);

  // ✅ Fetch all distinct banks on component mount
  useEffect(() => {
    API.get("/branches/banks/distinct")
      .then(({ data }) => setBanks(data))
      .catch(() => console.error("Failed to load banks"));
  }, []);

  // ✅ Fetch all channel partners on component mount
  useEffect(() => {
    API.get("/channel-partners")
      .then(({ data }) => setChannelPartners(data))
      .catch(() => console.error("Failed to load channel partners"));
  }, []);

  // ✅ Fetch branches when bank is selected
  useEffect(() => {
    if (!form.bank) {
      setBranches([]);
      setForm(prev => ({ ...prev, branch: "" }));
      return;
    }

    setLoadingBranches(true);
    API.get(`/branches/banks/${encodeURIComponent(form.bank)}/branches`)
      .then(({ data }) => setBranches(data))
      .catch(() => console.error("Failed to load branches"))
      .finally(() => setLoadingBranches(false));
  }, [form.bank]);

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
          channelPartner: data.channelPartner || "", // ✅ Include channel partner
          // Address fields
          permanentAddress: data.permanentAddress || "",
          currentAddress: data.currentAddress || "",
          siteAddress: data.siteAddress || "",
          officeAddress: data.officeAddress || "",
          pan: data.pan || "",
          aadhar: data.aadhar || "",
        };
        
        setForm(leadData);

        // ✅ If editing and bank exists, load its branches
        if (data.bank) {
          API.get(`/branches/banks/${encodeURIComponent(data.bank)}/branches`)
            .then(({ data: branchesData }) => setBranches(branchesData))
            .catch(() => console.error("Failed to load branches"));
        }
      })
      .catch(() => alert("Unable to load lead"));
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        requirementAmount: form.requirementAmount === "" ? null : Number(form.requirementAmount),
        sanctionedAmount: form.sanctionedAmount === "" ? null : Number(form.sanctionedAmount),
        // Empty strings become null for consistency
        permanentAddress: form.permanentAddress || null,
        currentAddress: form.currentAddress || null,
        siteAddress: form.siteAddress || null,
        officeAddress: form.officeAddress || null,
        pan: form.pan || null,
        aadhar: form.aadhar || null,
        channelPartner: form.channelPartner || null, // ✅ Include channel partner in payload
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
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="card" style={{ maxWidth: 800 }}>
      <h2 style={{ marginTop: 0 }}>{isEdit ? "Edit Lead" : "Add Lead"}</h2>
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
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />

        {/* Mobile */}
        <input
          className="input"
          placeholder="Mobile *"
          value={form.mobile}
          onChange={(e) => handleInputChange('mobile', e.target.value)}
          required
          pattern="[0-9]{10}"
          maxLength={10}
          title="Mobile number must be exactly 10 digits"
        />

        {/* Email */}
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />

        {/* Source */}
        <select
          className="input"
          value={form.source}
          onChange={(e) => handleInputChange('source', e.target.value)}
          required
        >
          <option value="">-- Select Source * --</option>
          <option value="Business">Business</option>
          <option value="Non-Business">Non-Business</option>
        </select>

        {/* ✅ Channel Partner Selection */}
        <select
          className="input"
          value={form.channelPartner}
          onChange={(e) => handleInputChange('channelPartner', e.target.value)}
        >
          <option value="">-- Select Channel Partner --</option>
          {channelPartners.map((partner) => (
            <option key={partner._id} value={partner._id}>
              {partner.name}
            </option>
          ))}
        </select>

        {/* ✅ Bank Selection */}
        <select
          className="input"
          value={form.bank}
          onChange={(e) => handleInputChange('bank', e.target.value)}
        >
          <option value="">-- Select Bank --</option>
          {banks.map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </select>

        {/* ✅ Branch Selection (depends on bank) */}
        <select
          className="input"
          value={form.branch}
          onChange={(e) => handleInputChange('branch', e.target.value)}
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

        {/* Lead Type */}
        <select
          className="input"
          value={form.leadType}
          onChange={(e) => handleInputChange('leadType', e.target.value)}
        >
          <option value="Loan">Loan</option>
          <option value="Insurance">Insurance</option>
          <option value="Real Estate">Real Estate</option>
        </select>

        {/* Sub Type */}
        <input
          className="input"
          placeholder="Sub Type"
          value={form.subType}
          onChange={(e) => handleInputChange('subType', e.target.value)}
        />

        {/* Requirement Amount */}
        <input
          className="input"
          placeholder="Requirement Amount"
          type="number"
          value={form.requirementAmount}
          onChange={(e) => handleInputChange('requirementAmount', e.target.value)}
        />

        {/* Sanctioned Amount */}
        <input
          className="input"
          placeholder="Sanctioned Amount"
          type="number"
          value={form.sanctionedAmount}
          onChange={(e) => handleInputChange('sanctionedAmount', e.target.value)}
        />

        {/* GD Status */}
        <select
          className="input"
          value={form.gdStatus}
          onChange={(e) => handleInputChange('gdStatus', e.target.value)}
        >
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Status */}
        <select
          className="input"
          value={form.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
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
          onChange={(e) => handleInputChange('pan', e.target.value)}
          style={{ textTransform: 'uppercase' }}
          maxLength={10}
        />

        {/* Aadhar */}
        <input
          className="input"
          placeholder="Aadhar Number"
          type="number"
          value={form.aadhar}
          onChange={(e) => handleInputChange('aadhar', e.target.value)}
          maxLength={12}
        />

        {/* Permanent Address */}
        <textarea
          className="input"
          placeholder="Permanent Address"
          style={{ gridColumn: "1 / -1", minHeight: 60 }}
          value={form.permanentAddress}
          onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
        />

        {/* Current Address */}
        <textarea
          className="input"
          placeholder="Current Address"
          style={{ gridColumn: "1 / -1", minHeight: 60 }}
          value={form.currentAddress}
          onChange={(e) => handleInputChange('currentAddress', e.target.value)}
        />

        {/* Site Address */}
        <textarea
          className="input"
          placeholder="Site Address"
          style={{ gridColumn: "1 / -1", minHeight: 60 }}
          value={form.siteAddress}
          onChange={(e) => handleInputChange('siteAddress', e.target.value)}
        />

        {/* Office Address */}
        <textarea
          className="input"
          placeholder="Office Address"
          style={{ gridColumn: "1 / -1", minHeight: 60 }}
          value={form.officeAddress}
          onChange={(e) => handleInputChange('officeAddress', e.target.value)}
        />

        {/* Notes */}
        <textarea
          className="input"
          placeholder="Notes"
          style={{ gridColumn: "1 / -1", minHeight: 80 }}
          value={form.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
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