// client/src/pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async () => {
    setSendingOtp(true);
    try {
      await API.post("/auth/request-otp", { purpose: "signup" });
      alert("OTP sent to owner’s phone. Check backend console in dev mode.");
      setOtpSent(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const signup = async () => {
    if (!form.otp) return alert("Please enter OTP before signing up");
    setLoading(true);
    try {
      await API.post("/auth/signup", {
        name: form.name,
        email: form.email,
        password: form.password,
        otp: form.otp,
      });
      alert("Admin created successfully! Please login.");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create Admin</h2>

      <input
        className="input"
        placeholder="Full Name"
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

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="input"
          placeholder="Enter OTP"
          value={form.otp}
          onChange={(e) => setForm({ ...form, otp: e.target.value })}
          style={{ width: 120 }}
        />
        <button
          className="btn secondary"
          onClick={sendOtp}
          disabled={sendingOtp}
        >
          {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
        </button>
      </div>

      <button className="btn" onClick={signup} disabled={loading}>
        {loading ? "Creating..." : "Create Admin"}
      </button>

      <div style={{ marginTop: 15 }}>
        <Link to="/login" className="link">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}
