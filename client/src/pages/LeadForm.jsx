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
  branch: "",
  status: "free_pool",
  notes: "",
  // ❌ createdAt removed, backend handles it
};

export default function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [duplicateError, setDuplicateError] = useState(null);
  const isEdit = Boolean(id);

  useEffect(() => {
    if (!isEdit) return;
    API.get(`/leads/${id}`)
      .then(({ data }) => {
        setForm({
          ...empty,
          ...data,
          requirementAmount: data.requirementAmount ?? "",
          sanctionedAmount: data.sanctionedAmount ?? "",
        });
      })
      .catch(() => alert("Unable to load lead"));
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await API.patch(`/leads/${id}`, {
          ...form,
          requirementAmount:
            form.requirementAmount === "" ? null : Number(form.requirementAmount),
          sanctionedAmount:
            form.sanctionedAmount === "" ? null : Number(form.sanctionedAmount),
        });
      } else {
        await API.post("/leads", {
          ...form,
          requirementAmount:
            form.requirementAmount === "" ? null : Number(form.requirementAmount),
          sanctionedAmount:
            form.sanctionedAmount === "" ? null : Number(form.sanctionedAmount),
        });
      }
      navigate("/leads");
    } catch (err) {
      if (err.response?.status === 400) {
        setDuplicateError(err.response.data); // { message, id, leadId, status }
      } else {
        alert(err.response?.data?.message || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>{isEdit ? "Edit Lead" : "Add Lead"}</h2>
      <form
        onSubmit={submit}
        className="grid"
        style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}
      >
        {/* Customer Name */}
        <input
          className="input"
          placeholder="Customer Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        {/* Mobile (10 digits only) */}
        <input
          className="input"
          placeholder="Mobile"
          value={form.mobile}
          onChange={(e) => setForm({ ...form, mobile: e.target.value })}
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
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        {/* Source (dropdown: Business/Non-Business) */}
        <select
          className="input"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          required
        >
          <option value="">-- Select Source --</option>
          <option value="Business">Business</option>
          <option value="Non-Business">Non-Business</option>
        </select>

        {/* Lead Type */}
        <select
          className="input"
          value={form.leadType}
          onChange={(e) => setForm({ ...form, leadType: e.target.value })}
        >
          <option>Loan</option>
          <option>Insurance</option>
          <option>Real Estate</option>
        </select>

        {/* Sub Type */}
        <input
          className="input"
          placeholder="Sub Type"
          value={form.subType}
          onChange={(e) => setForm({ ...form, subType: e.target.value })}
        />

        {/* Requirement Amount */}
        <input
          className="input"
          placeholder="Requirement Amount"
          type="number"
          value={form.requirementAmount}
          onChange={(e) =>
            setForm({ ...form, requirementAmount: e.target.value })
          }
        />

        {/* Sanctioned Amount */}
        <input
          className="input"
          placeholder="Sanctioned Amount"
          type="number"
          value={form.sanctionedAmount}
          onChange={(e) =>
            setForm({ ...form, sanctionedAmount: e.target.value })
          }
        />

        {/* GD Status */}
        <select
          className="input"
          value={form.gdStatus}
          onChange={(e) => setForm({ ...form, gdStatus: e.target.value })}
        >
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>

        {/* Branch */}
        <input
          className="input"
          placeholder="Branch"
          value={form.branch}
          onChange={(e) => setForm({ ...form, branch: e.target.value })}
        />

        {/* Status */}
        <select
          className="input"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="free_pool">free_pool</option>
          <option value="assigned">assigned</option>
          <option value="archived">archived</option>
          <option value="deleted">deleted</option>
        </select>

        {/* Notes */}
        <textarea
          className="input"
          placeholder="Notes"
          style={{ gridColumn: "1 / -1", minHeight: 80 }}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        {/* Buttons */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
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
                onClick={() =>
                  navigate(`/leads/${duplicateError.id}/view`)
                }
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
