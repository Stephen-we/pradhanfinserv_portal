import React, { useState } from "react";
import API from "../services/api";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post("/auth/register", form);
      setSuccess("✅ Signup successful! You can now login.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
      setSuccess("");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "10% auto" }} className="card">
      <h2>Signup</h2>
      <form onSubmit={submit}>
        <label>Name</label>
        <input
          name="name"
          className="input"
          value={form.name}
          onChange={handleChange}
        />
        <label>Email</label>
        <input
          name="email"
          type="email"
          className="input"
          value={form.email}
          onChange={handleChange}
        />
        <label>Password</label>
        <input
          name="password"
          type="password"
          className="input"
          value={form.password}
          onChange={handleChange}
        />
        {error && <div style={{ color: "red" }}>{error}</div>}
        {success && <div style={{ color: "green" }}>{success}</div>}
        <button type="submit" className="btn" style={{ marginTop: 10 }}>
          Register
        </button>
      </form>
    </div>
  );
}
