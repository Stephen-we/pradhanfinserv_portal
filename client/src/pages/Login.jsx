// client/src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

import logo from "../assets/logo/logo.png";
import img1 from "../assets/1.png";
import img2 from "../assets/2.png";
import img3 from "../assets/3.png";

const slides = [
  {
    img: img1,
    message:
      "Protect your family with the best insurance plans – safe, reliable, and affordable.",
  },
  {
    img: img2,
    message:
      "Your perfect home loan awaits – low EMI, high eligibility, and fast processing.",
  },
  {
    img: img3,
    message:
      "Business loans made simple – fuel your growth with trusted financial support.",
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  // ✅ Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const goPrev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const goNext = () => setCurrent((c) => (c + 1) % slides.length);
  const goTo = (idx) => setCurrent(idx);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post("/auth/login", { email, password });
      console.log("🔑 Login API response:", data);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-page">
      {/* Left side - Login form */}
      <div className="login-left">
        <img src={logo} alt="logo" className="logo" />
        <h2>Login into your account</h2>

        <form onSubmit={submit}>
          {/* Email input */}
          <div className="input-group">
            <span className="input-icon">👤</span>
            <input
              className="input"
              placeholder="Username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password input */}
          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input
              className="input"
              placeholder="Enter Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Error message */}
          {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

          {/* Login button */}
          <button className="btn" type="submit">
            Sign In
          </button>

          {/* Below form links */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <Link
              to="/create-admin"
              className="link"
              style={{ color: "steelblue", fontWeight: 500 }}
            >
              Create Admin
            </Link>

            <Link
              to="/forgot-password"
              className="link"
              style={{ color: "steelblue", fontWeight: 500 }}
            >
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>

      {/* Right side - Carousel */}
      <div className="login-right">
        <div className="carousel">
          <button className="arrow left" onClick={goPrev}>
            ‹
          </button>
          <img src={slides[current].img} alt="slide" className="carousel-img" />
          <button className="arrow right" onClick={goNext}>
            ›
          </button>
        </div>

        {/* Message below image */}
        <p className="login-message">{slides[current].message}</p>

        {/* Dots navigation */}
        <div className="dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`dot ${i === current ? "active" : ""}`}
              onClick={() => goTo(i)}
            ></span>
          ))}
        </div>

        {/* ✅ Right-side quick links (optional redundant copy, safe to keep) */}
        <div
          style={{
            marginTop: 15,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            alignItems: "center",
          }}
        >
          <Link to="/create-admin" className="link" style={{ color: "white" }}>
            Create Admin Account
          </Link>
          <Link to="/forgot-password" className="link" style={{ color: "white" }}>
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}
