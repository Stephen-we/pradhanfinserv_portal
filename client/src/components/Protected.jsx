//client/src/components/Protected.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export const Protected = ({ children, roles }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!token) return <Navigate to="/login" replace />;
  if (roles && (!user || !roles.includes(user.role))) return <div>Forbidden</div>;
  return children;
};
