import React from 'react';

const GuestPage = ({ user, onBack }) => {
  return (
    <div className="guest-page">
      <div className="welcome-message">
        <h2>Guest Access Activated 🎭</h2>
        <p>You're exploring New Era AI as a guest user.</p>
      </div>
      
      <div className="user-info">
        <h3>Guest Mode</h3>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Access Level:</strong> Limited Features</p>
      </div>
      
      <div className="features">
        <div className="feature">
          <h4>🔍 Explore Features</h4>
          <p>Experience the AI authentication system</p>
        </div>
        <div className="feature">
          <h4>🚀 Try Registration</h4>
          <p>Register to unlock full capabilities</p>
        </div>
        <div className="feature">
          <h4>💡 Learn More</h4>
          <p>See how next-gen authentication works</p>
        </div>
      </div>
      
      <div className="guest-actions">
        <button 
          className="btn-primary"
          onClick={onBack}
        >
          Try Full Registration
        </button>
        <button 
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          Restart Demo
        </button>
      </div>
    </div>
  );
};

export default GuestPage;