import React, { useEffect, useState } from "react";
import API from "../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Users() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "officer",
  });
  const [modal, setModal] = useState({ type: null, user: null });
  const [loading, setLoading] = useState(false);

  const load = () => API.get("/users").then((r) => setItems(r.data));

  useEffect(() => {
    load();
  }, []);

  // ✅ Create user (no OTP)
  const create = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("Please fill all fields before creating user.");
      return;
    }
    setLoading(true);
    try {
      await API.post("/users", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      alert("User created successfully!");
      setForm({ name: "", email: "", password: "", role: "officer" });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating user");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save edits
  const saveEdit = async () => {
    setLoading(true);
    try {
      await API.patch(`/users/${modal.user._id}`, {
        name: modal.user.name,
        email: modal.user.email,
      });
      setModal({ type: null, user: null });
      load();
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirm delete (no OTP)
  const confirmDelete = async () => {
    setLoading(true);
    try {
      await API.delete(`/users/${modal.user._id}`);
      alert("User deleted successfully!");
      setModal({ type: null, user: null });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting user");
    } finally {
      setLoading(false);
    }
  };

  const setRole = async (id, role) => {
    await API.patch(`/users/${id}/role`, { role });
    load();
  };

  const setActive = async (id, isActive) => {
    await API.patch(`/users/${id}/active`, { isActive });
    load();
  };

  const resetPass = async (id) => {
    const p = prompt("Enter new password:");
    if (!p) return;
    await API.patch(`/users/${id}/password`, { password: p });
    alert("Password updated");
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      items.map((u) => ({
        Name: u.name,
        Email: u.email,
        Role: u.role,
        Status: u.isActive ? "Active" : "Disabled",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "users.xlsx");
  };

  return (
    <div>
      <header>
        <h1>User Management</h1>
      </header>

      <div className="card">
        <div className="toolbar" style={{ flexWrap: "wrap", gap: "8px" }}>
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="officer">officer</option>
            <option value="viewer">viewer</option>
          </select>

          <button className="btn" onClick={create} disabled={loading}>
            {loading ? "Creating..." : "Create User"}
          </button>
          <button className="btn secondary" onClick={exportExcel}>
            Export to Excel
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Change Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.isActive ? "Active" : "Disabled"}</td>

                <td>
                  <select
                    className="input"
                    value={u.role}
                    onChange={(e) => setRole(u._id, e.target.value)}
                  >
                    <option value="admin">admin</option>
                    <option value="manager">manager</option>
                    <option value="officer">officer</option>
                    <option value="viewer">viewer</option>
                  </select>
                </td>

                <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    className="btn sm secondary"
                    onClick={() => setActive(u._id, !u.isActive)}
                  >
                    {u.isActive ? "Disable" : "Enable"}
                  </button>
                  <button className="btn sm" onClick={() => resetPass(u._id)}>
                    Reset
                  </button>
                  <button
                    className="btn sm"
                    onClick={() => setModal({ type: "edit", user: { ...u } })}
                  >
                    Edit
                  </button>
                  <button
                    className="btn sm danger"
                    onClick={() => setModal({ type: "delete", user: u })}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Edit Modal */}
      {modal.type === "edit" && (
        <div className="modal-overlay">
          <div className="modal green">
            <h3>Edit User</h3>
            <input
              className="input"
              value={modal.user.name}
              onChange={(e) =>
                setModal({
                  ...modal,
                  user: { ...modal.user, name: e.target.value },
                })
              }
            />
            <input
              className="input"
              value={modal.user.email}
              onChange={(e) =>
                setModal({
                  ...modal,
                  user: { ...modal.user, email: e.target.value },
                })
              }
            />
            <div className="actions">
              <button className="btn" disabled={loading} onClick={saveEdit}>
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                className="btn secondary"
                onClick={() => setModal({ type: null, user: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Delete Modal */}
      {modal.type === "delete" && (
        <div className="modal-overlay">
          <div className="modal red">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete <b>{modal.user.name}</b>?
            </p>
            <div className="actions">
              <button
                className="btn danger"
                disabled={loading}
                onClick={confirmDelete}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
              <button
                className="btn secondary"
                onClick={() => setModal({ type: null, user: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
