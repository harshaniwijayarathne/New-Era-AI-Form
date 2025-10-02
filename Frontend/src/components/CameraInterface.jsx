import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';

const CameraInterface = ({ onLoginSuccess, onRegisterPrompt }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [message, setMessage] = useState('Initializing camera...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraQuality, setCameraQuality] = useState('high');
  const streamRef = useRef(null);

  useEffect(() => {
    initializeCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getCameraConstraints = (quality = 'high') => {
    const constraints = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60, max: 60 },
        facingMode: 'user',
        // Enhanced focus settings
        focusMode: 'continuous', // Continuous auto-focus
        exposureMode: 'continuous', // Continuous exposure
        whiteBalanceMode: 'continuous' // Continuous white balance
      },
      audio: false
    };

    // Quality presets
    switch (quality) {
      case 'ultra':
        constraints.video.width = { ideal: 3840 };
        constraints.video.height = { ideal: 2160 };
        constraints.video.frameRate = { ideal: 30, max: 30 };
        break;
      case 'high':
        constraints.video.width = { ideal: 1920 };
        constraints.video.height = { ideal: 1080 };
        constraints.video.frameRate = { ideal: 60, max: 60 };
        break;
      case 'medium':
        constraints.video.width = { ideal: 1280 };
        constraints.video.height = { ideal: 720 };
        constraints.video.frameRate = { ideal: 30, max: 30 };
        break;
      default:
        break;
    }

    return constraints;
  };

  const initializeCamera = async () => {
    try {
      setMessage('🔄 Accessing camera with optimal settings...');
      
      // Try high quality first, fallback to lower qualities
      let stream;
      const qualities = ['high', 'medium', 'default'];
      
      for (const quality of qualities) {
        try {
          const constraints = getCameraConstraints(quality);
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (stream) {
            setCameraQuality(quality);
            console.log(`✅ Camera initialized with ${quality} quality`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ ${quality} quality failed, trying next...`);
          continue;
        }
      }

      if (!stream) {
        throw new Error('Could not access camera with any quality setting');
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      videoRef.current.onloadedmetadata = () => {
        setMessage('✅ Camera ready! Positioning face in center...');
        startFaceValidation();
      };

      // Apply additional video enhancements
      enhanceVideoQuality();

    } catch (error) {
      console.error('Camera error:', error);
      setMessage('❌ Camera access failed. Please check permissions and try again.');
    }
  };

  const enhanceVideoQuality = () => {
    if (!videoRef.current) return;
    
    // Apply CSS filters for better clarity
    videoRef.current.style.filter = `
      contrast(1.1) 
      brightness(1.05) 
      saturate(1.1)
      sharpness(1.2)
    `;
    
    // Ensure video plays smoothly
    videoRef.current.playsInline = true;
    videoRef.current.muted = true;
    videoRef.current.setAttribute('autoplay', '');
    videoRef.current.setAttribute('playsinline', '');
  };

  const captureFrame = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!video || video.videoWidth === 0) {
      return null;
    }
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply image enhancement for better detection
    enhanceImage(context, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.9); // 90% quality
  };

  const enhanceImage = (context, width, height) => {
    // Get image data for processing
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Simple contrast enhancement
    const contrast = 1.2;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < data.length; i += 4) {
      // Enhance contrast
      data[i] = factor * (data[i] - 128) + 128;     // Red
      data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
      data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
      
      // Slight brightness boost
      data[i] = Math.min(255, data[i] * 1.05);
      data[i + 1] = Math.min(255, data[i + 1] * 1.05);
      data[i + 2] = Math.min(255, data[i + 2] * 1.05);
    }
    
    context.putImageData(imageData, 0, 0);
  };

  const startFaceValidation = () => {
    const interval = setInterval(async () => {
      if (isProcessing) return;
      
      const imageData = captureFrame();
      if (!imageData) return;
      
      setIsProcessing(true);
      
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await axios.post(`${API_BASE_URL}/api/validate-face`, {
          image: imageData,
          quality: cameraQuality,
          timestamp: Date.now()
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
    }, 1500); // Faster checking (1.5 seconds)
  };

  const retryWithBetterQuality = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setMessage('🔄 Retrying with enhanced camera settings...');
    await initializeCamera();
  };

  return (
    <div className="camera-interface">
      <div className="camera-header">
        <h2>New Era AI Authentication</h2>
        <div className="camera-quality">
          <span>Camera Quality: {cameraQuality.toUpperCase()}</span>
          <button 
            onClick={retryWithBetterQuality}
            className="btn-secondary btn-small"
          >
            Enhance Quality
          </button>
        </div>
      </div>
      
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-feed enhanced-camera"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Focus guide overlay */}
        <div className="focus-guide">
          <div className="focus-circle"></div>
          <div className="focus-text">Position face in circle</div>
        </div>
      </div>
      
      <div className="message-container">
        <div className="status-message">{message}</div>
        {isProcessing && (
          <div className="processing-indicator">
            <span>🔍 Analyzing face...</span>
          </div>
        )}
      </div>
      
      <div className="camera-tips">
        <h3>📸 Tips for Better Detection:</h3>
        <ul>
          <li>✅ Ensure good lighting on your face</li>
          <li>✅ Position face in the center circle</li>
          <li>✅ Keep steady and look directly at camera</li>
          <li>✅ Avoid backlighting or shadows</li>
          <li>✅ Use "Enhance Quality" if detection is poor</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraInterface;