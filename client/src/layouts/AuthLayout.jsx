// layouts/AuthLayout.jsx
export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-content">
        {children}
      </div>
    </div>
  );
}
