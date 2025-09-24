// client/src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import logo from "../assets/logo.png";
import img1 from "../assets/1.png";
import img2 from "../assets/2.png";
import img3 from "../assets/3.png";

// ✅ Slides with images + messages
const slides = [
  { img: img1, message: "Protect your family with the best insurance plans – safe, reliable, and affordable." },
  { img: img2, message: "Your perfect home loan awaits – low EMI, high eligibility, and fast processing." },
  { img: img3, message: "Business loans made simple – fuel your growth with trusted financial support." }
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  // ✅ Auto rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Manual navigation
  const goPrev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const goNext = () => setCurrent((c) => (c + 1) % slides.length);
  const goTo = (idx) => setCurrent(idx);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");   // ✅ cleaner redirect
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-page">
      {/* Left side */}
      <div className="login-left">
        <img src={logo} alt="logo" className="logo" />
        <h2>Login into your account</h2>
        <form onSubmit={submit}>
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

          {error && <div style={{ color: "red" }}>{error}</div>}
          <button className="btn" type="submit">Sign In</button>
        </form>

        <p className="forgot">
          Forgot password? <a href="#">Reset</a>
        </p>
      </div>

      {/* Right side (Carousel) */}
      <div className="login-right">
        <div className="carousel">
          <button className="arrow left" onClick={goPrev}>‹</button>
          <img src={slides[current].img} alt="slide" className="carousel-img" />
          <button className="arrow right" onClick={goNext}>›</button>
        </div>
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
      </div>
    </div>
  );
}
