import Sidebar from "../components/Sidebar";
import UserProfile from "../components/UserProfile";
import "./MainLayout.css";

export default function MainLayout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="content">
        {/* Header with company name and user profile */}
        <header className="main-header">
          <div className="company-name">
            <h2>PRADHAN FINSERV</h2>
          </div>
          <div className="header-content">
            <UserProfile />
          </div>
        </header>
        
        {/* Main content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}