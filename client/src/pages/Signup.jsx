// client/src/pages/Signup.jsx
import React, { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post("/auth/register", form);
      setSuccess("✅ Signup successful! Redirecting to login...");
      setError("");

      // ✅ Redirect to login after 2s
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
      setSuccess("");
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h2>Create Account</h2>
        <form onSubmit={submit}>
          <label>Name</label>
          <input
            name="name"
            className="input"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label>Email</label>
          <input
            name="email"
            type="email"
            className="input"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>
          <input
            name="password"
            type="password"
            className="input"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <div style={{ color: "red" }}>{error}</div>}
          {success && <div style={{ color: "green" }}>{success}</div>}

          <button type="submit" className="btn" style={{ marginTop: 10 }}>
            Register
          </button>
        </form>
      </div>
    </div>
  );
}
