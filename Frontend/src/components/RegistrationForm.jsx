import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const RegistrationForm = ({ onRegistrationComplete, onGuestAccess, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedFace, setCapturedFace] = useState(null);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    initializeCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const captureFace = async () => {
    setIsCapturingFace(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Send to backend for face processing
      const response = await axios.post('http://localhost:5000/api/capture-face', {
        image: imageData
      });
      
      if (response.data.success) {
        setCapturedFace(response.data.face_image);
        setErrors({ ...errors, face: null });
      } else {
        setErrors({ ...errors, face: response.data.message });
      }
    } catch (error) {
      setErrors({ ...errors, face: 'Failed to capture face. Please try again.' });
    } finally {
      setIsCapturingFace(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!capturedFace) {
      newErrors.face = 'Please capture your face before registering';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        ...formData,
        face_image: capturedFace,
        face_encoding: [] // Add actual encoding if available
      });
      
      if (response.data.success) {
        onRegistrationComplete(response.data.user);
      } else {
        setErrors({ submit: response.data.message });
      }
    } catch (error) {
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-form">
      <div className="form-header">
        <h2>Complete Registration</h2>
        <p>Capture your face and fill in your details</p>
      </div>
      
      {/* Face Capture Section */}
      <div className="face-capture-section">
        <h3>Face Capture</h3>
        
        <div className="camera-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-feed-small"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        
        <div className="capture-controls">
          <button
            type="button"
            onClick={captureFace}
            disabled={isCapturingFace}
            className="btn-primary"
          >
            {isCapturingFace ? 'Capturing...' : '📸 Capture Face'}
          </button>
        </div>
        
        {errors.face && (
          <div className="error-message face-error">{errors.face}</div>
        )}
        
        {capturedFace && (
          <div className="captured-face-preview">
            <h4>Captured Face:</h4>
            <img 
              src={capturedFace} 
              alt="Captured face" 
              className="face-preview-image"
            />
            <button
              type="button"
              onClick={() => setCapturedFace(null)}
              className="btn-secondary btn-small"
            >
              Retake Photo
            </button>
          </div>
        )}
      </div>
      
      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="ai-form">
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
            placeholder="Enter your full name"
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="Enter your email"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'error' : ''}
            placeholder="Create a password"
          />
          {errors.password && <span className="error-message">{errors.password}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? 'error' : ''}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <span className="error-message">{errors.confirmPassword}</span>
          )}
        </div>
        
        {errors.submit && (
          <div className="error-message submit-error">{errors.submit}</div>
        )}
        
        <div className="form-actions">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary"
          >
            Back to Camera
          </button>
          <button
            type="button"
            onClick={onGuestAccess}
            className="btn-secondary"
          >
            Continue as Guest
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !capturedFace}
            className="btn-primary"
          >
            {isSubmitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm;