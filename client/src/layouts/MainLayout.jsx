// client/src/layoout/Mainlayout.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import UserProfile from "../components/UserProfile";
import "./MainLayout.css";

export default function MainLayout({ children }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Handle resize (switch between desktop/mobile)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar isMobile={isMobile} open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Content Area */}
      <div className="content">
        {/* Header */}
        <header className="main-header">
          <div className="company-name">
            {/* Mobile toggle button */}
            {isMobile && (
              <button
                className="icon-btn toggle-btn-mobile"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                ☰
              </button>
            )}
            <h2>PRADHAN FINSERV</h2>
          </div>
          <div className="header-content">
            <UserProfile />
          </div>
        </header>

        {/* Main content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
