import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';

const GestureInterface = ({ onRegistrationStart, onGuestAccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [message, setMessage] = useState('Move your head LEFT for Yes, RIGHT for No');
  const [gestureDetected, setGestureDetected] = useState(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const streamRef = useRef(null);

  useEffect(() => {
    initializeCamera();
    startGestureDetection();
    
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
      setMessage('Error accessing camera. Please allow camera permissions.');
      console.error('Camera error:', error);
    }
  };

  const captureFrame = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!video || video.videoWidth === 0) return null;
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg');
  };

  const startGestureDetection = () => {
    const detectionInterval = setInterval(async () => {
      if (!isDetecting) {
        clearInterval(detectionInterval);
        return;
      }

      const imageData = captureFrame();
      if (!imageData) return;

      try {
        const response = await axios.post('http://localhost:5000/api/detect-gesture', {
          image: imageData
        });

        if (response.data.success && response.data.detected) {
          const gesture = response.data.gesture;
          setGestureDetected(gesture);
          
          // Auto-proceed after gesture is detected
          if (gesture === 'left') {
            setIsDetecting(false);
            setMessage('✅ Yes detected! Starting registration...');
            setTimeout(() => {
              onRegistrationStart();
            }, 2000);
          } else if (gesture === 'right') {
            setIsDetecting(false);
            setMessage('❌ No detected. Redirecting to guest access...');
            setTimeout(() => {
              onGuestAccess();
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Gesture detection error:', error);
        // Fallback to manual buttons if API fails
        if (!message.includes('Use buttons below')) {
          setMessage('Gesture detection unavailable. Use buttons below.');
        }
      }
    }, 1000); // Check every second

    return detectionInterval;
  };

  // Manual fallback buttons
  const handleManualYes = () => {
    setIsDetecting(false);
    setGestureDetected('left');
    setMessage('✅ Yes selected! Starting registration...');
    setTimeout(() => onRegistrationStart(), 1500);
  };

  const handleManualNo = () => {
    setIsDetecting(false);
    setGestureDetected('right');
    setMessage('❌ No selected. Redirecting to guest access...');
    setTimeout(() => onGuestAccess(), 1500);
  };

  return (
    <div className="gesture-interface">
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-feed"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      
      <div className="gesture-ui">
        <div className="prompt-message">
          <h2>Face Not Recognized</h2>
          <p>Do you want to register with New Era AI?</p>
        </div>
        
        <div className="gesture-instructions">
          <div className={`gesture-option ${gestureDetected === 'left' ? 'active' : ''}`}>
            <div className="gesture-icon">👈</div>
            <span>Move Head LEFT = YES</span>
            <div className="gesture-demo">Tilt head to left shoulder</div>
          </div>
          
          <div className={`gesture-option ${gestureDetected === 'right' ? 'active' : ''}`}>
            <div className="gesture-icon">👉</div>
            <span>Move Head RIGHT = NO</span>
            <div className="gesture-demo">Tilt head to right shoulder</div>
          </div>
        </div>
        
        <div className="detection-status">
          {gestureDetected ? (
            <div className="detection-feedback">
              Detected: {gestureDetected === 'left' ? 'YES ✅' : 'NO ❌'}
            </div>
          ) : (
            <div className="detection-hint">
              🔍 Looking for head movements...
            </div>
          )}
        </div>

        {/* Manual Fallback Buttons */}
        <div className="manual-fallback">
          <p style={{ margin: '1rem 0', color: '#6b7280' }}>
            Or use manual selection:
          </p>
          <div className="manual-buttons">
            <button 
              onClick={handleManualYes}
              className="btn-primary"
              disabled={!isDetecting}
            >
              Yes, Register
            </button>
            <button 
              onClick={handleManualNo}
              className="btn-secondary"
              disabled={!isDetecting}
            >
              No, Guest Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestureInterface;