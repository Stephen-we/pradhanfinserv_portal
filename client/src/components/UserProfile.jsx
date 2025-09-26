import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';

const UserProfile = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="user-profile">
      <div 
        className="profile-trigger" 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="user-avatar">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <span className="user-name">{user.name}</span>
        <span className="dropdown-arrow">▼</span>
      </div>

      {isDropdownOpen && (
        <div className="profile-dropdown">
          <div className="dropdown-item" onClick={handleLogout}>
            Logout
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;