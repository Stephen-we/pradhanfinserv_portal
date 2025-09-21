import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

export default function EditBranch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    bankName: "",
    branchName: "",
    managerNumber: "",
  });
  const [saving, setSaving] = useState(false);

  // Load branch details for editing
  useEffect(() => {
    API.get(`/branches/${id}`)
      .then((res) => setForm(res.data))
      .catch(() => alert("Failed to load branch details"));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.managerNumber)) {
      alert("Manager number must be exactly 10 digits");
      return;
    }

    setSaving(true);
    try {
      await API.put(`/branches/${id}`, form);
      navigate(`/branches/${id}/view`);
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const banks = ["BOM", "SBI", "HDFC", "ICICI", "AXIS", "PNB"];
  const puneBranches = [
    "Vishrantwadi",
    "Vimannagar",
    "Vadgaon",
    "Viman Nagar",
    "Kharadi",
    "Mundhwa Pune",
    "Shivaji Nagar",
    "Lohegaon",
    "Hadapsar",
  ];

  return (
    <div className="card" style={{ maxWidth: 720, margin: "auto" }}>
      <h2>Edit Branch</h2>

      <form
        onSubmit={submit}
        className="grid"
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {/* Bank dropdown */}
        <select
          className="input"
          value={form.bankName}
          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          required
        >
          <option value="">-- Select Bank --</option>
          {banks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {/* Branch dropdown with filter by typing */}
        <input
          list="branchOptions"
          className="input"
          placeholder="Branch Name"
          value={form.branchName || ""}
          onChange={(e) => setForm({ ...form, branchName: e.target.value })}
          required
        />
        <datalist id="branchOptions">
          {puneBranches.map((br) => (
            <option key={br} value={br} />
          ))}
        </datalist>

        {/* Manager Number with 10-digit validation */}
        <input
          className="input"
          type="tel"
          placeholder="Manager Number"
          value={form.managerNumber || ""}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, ""); // allow only digits
            if (val.length <= 10) {
              setForm({ ...form, managerNumber: val });
            }
          }}
          pattern="[0-9]{10}"
          title="Please enter a 10-digit number"
          required
        />

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
            onClick={() => navigate(`/branches/${id}/view`)}
          >
            Cancel
          </button>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Update Branch"}
          </button>
        </div>
      </form>
    </div>
  );
}
