// client/src/pages/EditPartner.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function EditPartner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: "", 
    contactNumber: "", 
    email: "",
    products: [], 
    commission: 0 
  });
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false); // ✅ Success modal state

  useEffect(() => {
    // Load partner data for editing
    API.get("/channel-partners")
      .then((response) => {
        const allPartners = response.data.items || [];
        const foundPartner = allPartners.find(p => p._id === id);
        
        if (foundPartner) {
          setForm({
            name: foundPartner.name || "",
            contactNumber: foundPartner.contactNumber || "",
            email: foundPartner.email || "",
            products: foundPartner.products || [],
            commission: foundPartner.commission || 0
          });
        } else {
          alert("Partner not found");
          navigate("/partners");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching partner:", error);
        alert("Error loading partner details");
        setLoading(false);
      });
  }, [id, navigate]);

  const updatePartner = async () => {
    if (!form.name || !form.contactNumber) {
      alert("Please enter name and contact number");
      return;
    }
    if (!/^\d{10}$/.test(form.contactNumber)) {
      alert("Contact number must be exactly 10 digits");
      return;
    }

    try {
      await API.put(`/channel-partners/${id}`, form);
      setShowSuccess(true); // ✅ Show success modal instead of alert
    } catch (error) {
      alert("Error updating partner");
      console.error("Update error:", error);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate(`/partners/${id}/view`);
  };

  const cancelEdit = () => {
    navigate(`/partners/${id}/view`);
  };

  const handleBack = () => {
    navigate("/partners");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* ✅ HEADER WITH BACK BUTTON */}
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button 
            className="btn secondary"
            onClick={handleBack}
            style={{ 
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0 }}>Edit Partner</h1>
        </div>
      </header>

      <div className="card" style={{ padding: "20px" }}>
        <div className="toolbar" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Name *</label>
              <input 
                className="input" 
                placeholder="Enter partner name" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Contact Number *</label>
              <input 
                className="input" 
                type="tel"
                placeholder="10-digit number"
                value={form.contactNumber} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) {
                    setForm({...form, contactNumber: val});
                  }
                }}
                pattern="[0-9]{10}"
                title="Please enter a 10-digit number"
                required
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Email</label>
              <input 
                className="input" 
                placeholder="partner@email.com"
                type="email"
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Commission %</label>
              <input 
                className="input" 
                placeholder="Commission percentage" 
                type="number"
                value={form.commission} 
                onChange={e => setForm({...form, commission: Number(e.target.value || 0)})} 
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Products</label>
            <input 
              className="input" 
              placeholder="Product1, Product2, Product3 (comma separated)" 
              value={(form.products || []).join(", ")} 
              onChange={e => setForm({...form, products: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})} 
              style={{ width: "100%" }}
            />
          </div>
          
          <div className="button-group" style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
            <button className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={updatePartner}>
              Update Partner
            </button>
          </div>
        </div>
      </div>

      {/* ✅ SUCCESS MODAL - Like branches delete modal */}
      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal" style={{ background: "white" }}>
            <h3>✅ Success!</h3>
            <p>Partner details updated successfully.</p>
            <div className="actions">
              <button className="btn primary" onClick={handleSuccessClose}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}