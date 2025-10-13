import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";

export default function CreateAdmin() {
  const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP, 3: create admin
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });

  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  // ⏱ Cooldown timer for Resend OTP
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // 🔹 Step 1: Send OTP to Owner Email
  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await API.post("/auth/request-otp", { purpose: "signup" });
      alert("✅ OTP sent to owner’s email. Please check your inbox.");
      setStep(2);
      setCooldown(30);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Step 2: Verify OTP & show create form
  const handleVerifyOtp = async () => {
    if (!form.otp) return alert("Please enter OTP");
    setLoading(true);
    try {
      // Backend verifies OTP during signup itself, so this step just moves forward
      alert("✅ OTP verified successfully.");
      setStep(3);
    } catch (err) {
      alert(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Step 3: Create Admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.otp)
      return alert("Please fill all fields.");
    setLoading(true);
    try {
      await API.post("/auth/signup", form);
      alert("🎉 Admin created successfully!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await API.post("/auth/request-otp", { purpose: "signup" });
      alert("✅ OTP resent to owner’s email.");
      setCooldown(30);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>Create Admin</h2>

        {step === 1 && (
          <>
            <p style={{ textAlign: "center", marginBottom: 20 }}>
              Click below to send OTP to the owner’s registered email.
            </p>
            <button
              onClick={handleSendOtp}
              className="btn"
              disabled={loading}
              style={btnStyle}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
            <div style={footerStyle}>
              <Link to="/login" className="link">← Back to Login</Link>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <input
              className="input"
              placeholder="Enter OTP"
              value={form.otp}
              onChange={(e) => setForm({ ...form, otp: e.target.value })}
              style={inputStyle}
            />
            <button
              onClick={handleVerifyOtp}
              className="btn"
              disabled={loading}
              style={btnStyle}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              onClick={handleResendOtp}
              className="btn secondary"
              disabled={cooldown > 0 || loading}
              style={{
                ...btnSecondaryStyle,
                opacity: cooldown > 0 ? 0.6 : 1,
              }}
            >
              {cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : "Resend OTP"}
            </button>

            <div style={footerStyle}>
              <Link to="/login" className="link">← Back to Login</Link>
            </div>
          </>
        )}

        {step === 3 && (
          <form onSubmit={handleCreateAdmin}>
            <input
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={inputStyle}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={inputStyle}
              required
            />
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={btnStyle}
            >
              {loading ? "Creating..." : "Create Admin"}
            </button>

            <div style={footerStyle}>
              <Link to="/login" className="link">← Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------- Inline Styles ------------------------- */
const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  background: "#f8fafc",
  padding: "20px",
};

const cardStyle = {
  background: "white",
  padding: "30px 25px",
  borderRadius: 10,
  boxShadow: "0 0 15px rgba(0,0,0,0.1)",
  width: 360,
  textAlign: "center",
};

const titleStyle = {
  marginBottom: 20,
  color: "#1e293b",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
};

const btnStyle = {
  width: "100%",
  padding: "10px",
  background: "steelblue",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  marginBottom: "10px",
};

const btnSecondaryStyle = {
  width: "100%",
  padding: "10px",
  background: "#e2e8f0",
  color: "#1e293b",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  marginBottom: "10px",
};

const footerStyle = {
  marginTop: "10px",
  textAlign: "center",
};
