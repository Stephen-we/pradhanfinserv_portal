// client/src/pages/PartnerView.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function PartnerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ REMOVED role check - Edit button for everyone

  useEffect(() => {
    // Fetch all partners and find the one we need
    API.get("/channel-partners")
      .then((response) => {
        const allPartners = response.data.items || [];
        const foundPartner = allPartners.find(p => p._id === id);
        
        if (foundPartner) {
          setPartner(foundPartner);
        } else {
          console.error("Partner not found with ID:", id);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching partners:", error);
        setLoading(false);
      });
  }, [id]);

  const handleEdit = () => {
    navigate(`/partners/${id}/edit`);
  };

  const handleBack = () => {
    navigate("/partners");
  };

  if (loading) return <div>Loading partner details...</div>;
  if (!partner) return <div>Partner not found</div>;

  return (
    <div>
      {/* ✅ HEADER WITH BACK BUTTON - Same as branches */}
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
          <h1 style={{ margin: 0 }}>Partner Details</h1>
        </div>
        
        {/* ✅ EDIT BUTTON - For everyone (removed role check) */}
        <button className="btn primary" onClick={handleEdit}>
          Edit Partner
        </button>
      </header>

      {/* ✅ CARD STYLING - Same as branches */}
      <div className="card" style={{ padding: "20px" }}>
        <div className="details" style={{ display: "grid", gap: "15px" }}>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div style={{ minWidth: "200px" }}>
              <strong>Partner ID:</strong>
              <div style={{ marginTop: "5px", fontSize: "16px" }}>{partner.partnerId}</div>
            </div>
            <div style={{ minWidth: "200px" }}>
              <strong>Name:</strong>
              <div style={{ marginTop: "5px", fontSize: "16px" }}>{partner.name}</div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div style={{ minWidth: "200px" }}>
              <strong>Contact Number:</strong>
              <div style={{ marginTop: "5px", fontSize: "16px" }}>
                {partner.contactNumber}
                {partner.contactNumber && (
                  <a 
                    className="whatsapp" 
                    href={`https://wa.me/91${partner.contactNumber}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ marginLeft: "10px", fontSize: "14px" }}
                  >
                    📱 WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div style={{ minWidth: "200px" }}>
              <strong>Email:</strong>
              <div style={{ marginTop: "5px", fontSize: "16px" }}>
                {partner.email || "N/A"}
                {partner.email && (
                  <a 
                    href={`mailto:${partner.email}`}
                    style={{ marginLeft: "10px", fontSize: "14px" }}
                  >
                    📧 Email
                  </a>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div style={{ minWidth: "200px" }}>
              <strong>Products:</strong>
              <div style={{ marginTop: "5px", fontSize: "16px" }}>
                {(partner.products || []).join(", ") || "None"}
              </div>
            </div>
            <div style={{ minWidth: "200px" }}>
              <strong>Commission:</strong>
              <div style={{ marginTop: "5px", fontSize: "16px" }}>
                {partner.commission}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}