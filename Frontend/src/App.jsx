import React, { useState } from 'react';
import CameraInterface from './components/CameraInterface';
import GestureInterface from './components/GestureInterface';
import RegistrationForm from './components/RegistrationForm';
import MainPage from './components/MainPage';
import GuestPage from './components/GuestPage';
import HeadPoseDisplay from './components/HeadPoseDisplay';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('camera');
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentView('main');
  };

  const handleRegisterPrompt = () => {
    setCurrentView('gesture');
  };

  const handleGuestAccess = () => {
    setUser({ name: 'Guest', email: 'guest@example.com' });
    setCurrentView('guest');
  };

  const handleRegistrationComplete = (userData) => {
    setUser(userData);
    setCurrentView('main');
  };

  const handleBackToCamera = () => {
    setCurrentView('camera');
  };

  const renderView = () => {
    switch (currentView) {
      case 'camera':
        return (
          <CameraInterface
            onLoginSuccess={handleLoginSuccess}
            onRegisterPrompt={handleRegisterPrompt}
          />
        );
      case 'gesture':
        return (
          <GestureInterface
            onRegistrationStart={() => setCurrentView('register')}
            onGuestAccess={handleGuestAccess}
            onBack={handleBackToCamera}
          />
        );
      case 'register':
        return (
          <RegistrationForm
            onRegistrationComplete={handleRegistrationComplete}
            onGuestAccess={handleGuestAccess}
            onBack={handleBackToCamera}
          />
        );
      case 'main':
        return <MainPage user={user} onLogout={handleBackToCamera} />;
      case 'guest':
        return <GuestPage user={user} onBack={handleBackToCamera} />;
      case 'health':
        return <HeadPoseDisplay onBack={handleBackToCamera} />;
      default:
        return (
          <CameraInterface
            onLoginSuccess={handleLoginSuccess}
            onRegisterPrompt={handleRegisterPrompt}
          />
        );
    }
  };

  const getNavButtonStyle = (view) => {
    return currentView === view ? 'btn-primary' : 'btn-secondary';
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>New Era AI Form</h1>
            <p>Next-generation authentication</p>
          </div>
          
          <nav className="nav-buttons">
            <button 
              className={getNavButtonStyle('camera')}
              onClick={() => setCurrentView('camera')}
            >
              📷 Main App
            </button>
            <button 
              className={getNavButtonStyle('health')}
              onClick={() => setCurrentView('health')}
            >
              🧠 Test Head Detection
            </button>
            {user && (
              <button 
                className="btn-secondary"
                onClick={handleBackToCamera}
              >
                🔄 Restart
              </button>
            )}
          </nav>
        </div>

        <div className="view-indicator">
          <div className={`indicator-dot ${currentView === 'camera' ? 'active' : ''}`}>
            <span>📷 Camera</span>
          </div>
          <div className="indicator-line"></div>
          <div className={`indicator-dot ${currentView === 'gesture' ? 'active' : ''}`}>
            <span>👋 Gesture</span>
          </div>
          <div className="indicator-line"></div>
          <div className={`indicator-dot ${currentView === 'register' ? 'active' : ''}`}>
            <span>📝 Register</span>
          </div>
          <div className="indicator-line"></div>
          <div className={`indicator-dot ${currentView === 'main' ? 'active' : ''}`}>
            <span>🎯 Success</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {renderView()}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>New Era AI Authentication System</p>
          <div className="footer-links">
            <span>🔒 Secure</span>
            <span>⚡ Fast</span>
            <span>🤖 AI-Powered</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;