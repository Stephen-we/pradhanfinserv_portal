// client/src/components/ExportButton.jsx
import React, { useState } from "react";
import API from "../services/api";

export default function ExportButton({ endpoint, filename }) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Step 1: Request OTP
  const handleRequestOtp = async () => {
    try {
      setLoading(true);
      const { data } = await API.post(`${endpoint}/export/request-otp`);
      alert(data.message || "✅ OTP sent successfully!");
      setOtpSent(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Step 2: Verify OTP and Download
  const handleVerifyAndExport = async () => {
    if (!otp) return alert("Please enter the OTP");
    try {
      setLoading(true);
      const { data } = await API.post(`${endpoint}/export/verify`, { otp });
      if (!data.ok) return alert("OTP verification failed");

      // 🔹 Convert data to Excel or CSV (you can customize)
      const exportData = data.items || [];
      if (exportData.length === 0) return alert("No records to export");

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().slice(0, 19)}.json`;
      link.click();

      alert("🎉 Export successful!");
      setOtp("");
      setOtpSent(false);
    } catch (err) {
      alert(err.response?.data?.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
      {!otpSent ? (
        <button
          onClick={handleRequestOtp}
          disabled={loading}
          className="btn"
          style={{ backgroundColor: "#10b981" }}
        >
          {loading ? "Sending..." : "Export"}
        </button>
      ) : (
        <>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            style={{
              padding: "6px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              width: "100px",
            }}
          />
          <button
            onClick={handleVerifyAndExport}
            disabled={loading}
            className="btn"
            style={{ backgroundColor: "#2563eb" }}
          >
            {loading ? "Verifying..." : "Verify & Export"}
          </button>
        </>
      )}
    </div>
  );
}
