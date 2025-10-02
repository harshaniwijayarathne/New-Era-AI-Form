import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';

const CameraInterface = ({ onLoginSuccess, onRegisterPrompt }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [message, setMessage] = useState('Initializing camera...');
  const [isProcessing, setIsProcessing] = useState(false);
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
      setMessage('Camera ready. Detecting face...');
      
      // Start face validation after camera is ready
      setTimeout(() => {
        startFaceValidation();
      }, 1000);
    } catch (error) {
      setMessage('Error accessing camera. Please check permissions.');
      console.error('Camera error:', error);
    }
  };

  const captureFrame = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!video || video.videoWidth === 0) {
      return null;
    }
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg');
  };

  const startFaceValidation = () => {
    const interval = setInterval(async () => {
      if (isProcessing) return;
      
      const imageData = captureFrame();
      if (!imageData) return;
      
      setIsProcessing(true);
      
      try {
        const response = await axios.post('http://localhost:5000/api/validate-face', {
          image: imageData
        });
        
        console.log('Face validation response:', response.data);
        
        if (response.data.success) {
          clearInterval(interval);
          onLoginSuccess(response.data.user);
        } else if (response.data.action === 'register_prompt') {
          clearInterval(interval);
          onRegisterPrompt();
        } else {
          setMessage(response.data.message);
        }
      } catch (error) {
        console.error('Validation error:', error);
        setMessage('Face detection service unavailable. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }, 3000); // Check every 3 seconds
  };

  return (
    <div className="camera-interface">
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
      <div className="message-container">
        <div className="status-message">{message}</div>
        {isProcessing && <div className="processing-indicator">Processing face detection...</div>}
      </div>
      <div className="instructions">
        <h3>How to use:</h3>
        <ul>
          <li>✅ Position your face in the camera view</li>
          <li>📷 Ensure good lighting</li>
          <li>🎯 Keep your face clearly visible</li>
          <li>⚡ System will automatically detect your face</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraInterface;