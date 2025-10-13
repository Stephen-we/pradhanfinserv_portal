// client/src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import logo from "../assets/logo/logo.png";
import img1 from "../assets/1.png";
import img2 from "../assets/2.png";
import img3 from "../assets/3.png";

const slides = [
  { img: img1, message: "Forgot your password? Reset it securely with OTP." },
  { img: img2, message: "We send an OTP to your registered email for verification." },
  { img: img3, message: "Stay safe — your account is protected at all times." },
];

export default function ForgotPassword() {
  const [form, setForm] = useState({ email: "", otp: "", newPassword: "" });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otpResent, setOtpResent] = useState(false);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  React.useEffect(() => {
    const interval = setInterval(
      () => setCurrent((c) => (c + 1) % slides.length),
      4000
    );
    return () => clearInterval(interval);
  }, []);

  // Step 1 → Send OTP
  const sendOtp = async () => {
    if (!form.email) return alert("Enter your registered email");
    setLoading(true);
    try {
      await API.post("/auth/forgot-password/request-otp", { email: form.email });
      alert("✅ OTP sent to your registered email");
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → Verify and Reset
  const resetPassword = async () => {
    if (!form.otp || !form.newPassword)
      return alert("Enter OTP and new password");
    setLoading(true);
    try {
      await API.post("/auth/forgot-password/verify", form);
      alert("🎉 Password reset successfully! Please login.");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    setOtpResent(true);
    await sendOtp();
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={logo} alt="logo" className="logo" />
        <h2>Forgot Password</h2>

        {step === 1 && (
          <>
            <input
              className="input"
              placeholder="Registered Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <button className="btn" onClick={sendOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
            <div style={{ marginTop: 15 }}>
              <Link to="/login" className="link">
                ← Back to Login
              </Link>
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
            />
            <input
              className="input"
              placeholder="New Password"
              type="password"
              value={form.newPassword}
              onChange={(e) =>
                setForm({ ...form, newPassword: e.target.value })
              }
            />

            <button
              className="btn"
              onClick={resetPassword}
              disabled={loading}
              style={{ width: "100%", marginTop: 5 }}
            >
              {loading ? "Processing..." : "Reset Password"}
            </button>

            <button
              className="btn secondary"
              onClick={resendOtp}
              disabled={otpResent || loading}
              style={{ width: "100%", marginTop: 10 }}
            >
              {otpResent ? "OTP Resent" : "Resend OTP"}
            </button>

            <button
              className="btn"
              onClick={() => setStep(1)}
              style={{ width: "100%", background: "#999", marginTop: 10 }}
            >
              ← Back
            </button>
          </>
        )}
      </div>

      <div className="login-right">
        <img
          src={slides[current].img}
          alt="slide"
          className="carousel-img"
          style={{ transition: "0.5s ease" }}
        />
        <p className="login-message">{slides[current].message}</p>
      </div>
    </div>
  );
}
