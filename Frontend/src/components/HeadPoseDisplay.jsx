import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';

const HeadPoseDisplay = ({ onBack }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [headPose, setHeadPose] = useState('center');
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectionCount, setDetectionCount] = useState(0);
  const streamRef = useRef(null);

  useEffect(() => {
    initializeCamera();
    startHeadPoseDetection();
    
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

  const startHeadPoseDetection = () => {
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

        if (response.data.success) {
          setHeadPose(response.data.gesture);
          setDetectionCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Head pose detection error:', error);
        setHeadPose('error');
      }
    }, 500);
  };

  const getHeadPoseColor = () => {
    switch (headPose) {
      case 'left': return '#10b981';
      case 'right': return '#ef4444';
      case 'center': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getHeadPoseEmoji = () => {
    switch (headPose) {
      case 'left': return '👈 LEFT';
      case 'right': return '👉 RIGHT';
      case 'center': return '🎯 CENTER';
      default: return '❌ ERROR';
    }
  };

  return (
    <div className="head-pose-display">
      <h2>Head Pose Detection Test</h2>
      <p>Move your head left and right to see real-time detection</p>
      
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-feed"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div className="pose-overlay">
          <div 
            className={`pose-indicator ${headPose}`}
            style={{ backgroundColor: getHeadPoseColor() }}
          >
            <span className="pose-text">{getHeadPoseEmoji()}</span>
            <span className="pose-subtext">Head Position: {headPose.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="pose-instructions">
        <div className="instruction-item">
          <div className="instruction-demo left">👈</div>
          <span>Tilt Head LEFT</span>
        </div>
        <div className="instruction-item">
          <div className="instruction-demo center">🎯</div>
          <span>Keep Head CENTER</span>
        </div>
        <div className="instruction-item">
          <div className="instruction-demo right">👉</div>
          <span>Tilt Head RIGHT</span>
        </div>
      </div>

      <div className="detection-stats">
        <div className="stat-item">
          <span className="stat-label">Detection Status:</span>
          <span className="stat-value">{isDetecting ? 'ACTIVE ✅' : 'INACTIVE ❌'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Update Frequency:</span>
          <span className="stat-value">500ms</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Detections:</span>
          <span className="stat-value">{detectionCount}</span>
        </div>
      </div>

      <div className="action-buttons">
        <button 
          className="btn-primary"
          onClick={onBack}
        >
          Back to Main App
        </button>
        <button 
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          Restart Detection
        </button>
      </div>
    </div>
  );
};

export default HeadPoseDisplay;