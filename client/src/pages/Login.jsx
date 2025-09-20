import React, { useState, useEffect } from "react";
import API from "../services/api";

// ✅ import local assets (inside src/assets/)
 import logo from "../assets/logo.png";
//<img src={require("../assets/logo.png")} alt="logo" className="logo" />
import img1 from "../assets/1.png";
import img2 from "../assets/2.png";
import img3 from "../assets/3.png";

const images = [img1, img2, img3];

export default function Login() {
  const [email, setEmail] = useState("admin@dsa.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      location.href = "/dashboard";
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        {/* ✅ FIX: use imported logo variable */}
        <img src={logo} alt="logo" className="logo" />
        <h2>Login into your account</h2>
        <form onSubmit={submit}>
          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div style={{ color: "red" }}>{error}</div>}
          <button className="btn" type="submit">
            Sign In
          </button>
        </form>
      </div>
      <div className="login-right">
        <img src={images[current]} alt="slide" className="carousel-img" />
      </div>
    </div>
  );
}
