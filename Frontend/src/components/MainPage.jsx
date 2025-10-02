import React from 'react';

const MainPage = ({ user, onLogout }) => {
  return (
    <div className="main-page">
      <div className="welcome-message">
        <div className="success-animation">
          <h2>Welcome to New Era AI! 👋</h2>
        </div>
        <p>You have successfully authenticated using advanced AI technology.</p>
      </div>
      
      <div className="user-info">
        <h3>User Information</h3>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Login Method:</strong> Face Recognition</p>
      </div>
      
      <div className="features">
        <div className="feature">
          <h4>🔒 Secure Access</h4>
          <p>Your identity is verified using cutting-edge AI</p>
        </div>
        <div className="feature">
          <h4>⚡ Instant Login</h4>
          <p>No passwords to remember or type</p>
        </div>
        <div className="feature">
          <h4>🎯 Gesture Control</h4>
          <p>Natural head movements for interaction</p>
        </div>
      </div>
      
      <div className="action-buttons">
        <button 
          className="btn-primary"
          onClick={onLogout}
        >
          Logout & Start Over
        </button>
        <button 
          className="btn-secondary"
          onClick={() => setCurrentView('health')}
        >
          Test Head Detection
        </button>
      </div>
    </div>
  );
};

export default MainPage;