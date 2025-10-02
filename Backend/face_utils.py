import cv2
import mediapipe as mp
import numpy as np
from typing import Tuple, Optional

class EnhancedFaceDetector:
    def __init__(self):
        self.sensitivity = 0.5  # 0-1 scale, higher = more sensitive
        self.min_detection_confidence = 0.6
        self.min_tracking_confidence = 0.6
        
        try:
            import mediapipe as mp
            self.mp_face_detection = mp.solutions.face_detection
            self.mp_face_mesh = mp.solutions.face_mesh
            self.mp_drawing = mp.solutions.drawing_utils
            
            # Enhanced face detection with adjustable sensitivity
            self.face_detection = self.mp_face_detection.FaceDetection(
                model_selection=1,  # 1 for better range detection
                min_detection_confidence=self.min_detection_confidence
            )
            
            # Enhanced face mesh for better head pose
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=self.min_detection_confidence,
                min_tracking_confidence=self.min_tracking_confidence
            )
            
            self.mediapipe_available = True
            print("✅ Enhanced Face Detector initialized")
            
        except ImportError:
            self.mediapipe_available = False
            print("⚠️ MediaPipe not available, using OpenCV fallback")
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    def set_sensitivity(self, sensitivity: float):
        """Set detection sensitivity (0.0 to 1.0)"""
        self.sensitivity = max(0.0, min(1.0, sensitivity))
        self.min_detection_confidence = 0.7 - (self.sensitivity * 0.4)  # Higher sensitivity = lower confidence threshold
        print(f"🔧 Sensitivity set to {sensitivity}, confidence threshold: {self.min_detection_confidence}")
    
    def preprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """Enhance frame for better detection"""
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Apply image enhancements based on sensitivity
        if self.sensitivity > 0.7:  # High sensitivity mode
            # Increase contrast
            alpha = 1.0 + (self.sensitivity * 0.5)  # 1.0 to 1.5
            beta = 30 * self.sensitivity  # 0 to 30
            enhanced = cv2.convertScaleAbs(rgb_frame, alpha=alpha, beta=beta)
            
            # Apply sharpening
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
            
            return enhanced
        else:
            return rgb_frame
    
    def detect_face(self, frame: np.ndarray) -> Tuple[bool, Optional[list]]:
        """Enhanced face detection with sensitivity control"""
        try:
            if self.mediapipe_available:
                enhanced_frame = self.preprocess_frame(frame)
                results = self.face_detection.process(enhanced_frame)
                
                if results.detections:
                    # Get the best detection (highest confidence)
                    best_detection = max(results.detections, 
                                       key=lambda det: det.score[0])
                    
                    if best_detection.score[0] >= self.min_detection_confidence:
                        bbox = best_detection.location_data.relative_bounding_box
                        h, w, _ = frame.shape
                        
                        x = int(bbox.xmin * w)
                        y = int(bbox.ymin * h)
                        width = int(bbox.width * w)
                        height = int(bbox.height * h)
                        
                        # Expand bounding box for better coverage (based on sensitivity)
                        expand_factor = 0.1 + (self.sensitivity * 0.1)  # 10% to 20%
                        x = max(0, int(x - (width * expand_factor)))
                        y = max(0, int(y - (height * expand_factor)))
                        width = min(w - x, int(width * (1 + 2 * expand_factor)))
                        height = min(h - y, int(height * (1 + 2 * expand_factor)))
                        
                        return True, [x, y, width, height, best_detection.score[0]]
                
                return False, None
            else:
                # OpenCV fallback with sensitivity adjustment
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
                # Adjust scaleFactor based on sensitivity
                scale_factor = 1.3 - (self.sensitivity * 0.2)  # 1.3 to 1.1
                min_neighbors = max(3, int(8 - (self.sensitivity * 5)))  # 8 to 3
                
                faces = self.face_cascade.detectMultiScale(
                    gray, 
                    scaleFactor=scale_factor, 
                    minNeighbors=min_neighbors,
                    minSize=(50, 50)
                )
                
                if len(faces) > 0:
                    x, y, w, h = faces[0]
                    return True, [x, y, w, h, 0.8]  # Default confidence
                return False, None
                
        except Exception as e:
            print(f"Face detection error: {e}")
            return False, None
    
    def get_head_pose(self, frame: np.ndarray) -> str:
        """Enhanced head pose detection with sensitivity"""
        try:
            if self.mediapipe_available:
                enhanced_frame = self.preprocess_frame(frame)
                results = self.face_mesh.process(enhanced_frame)
                
                if not results.multi_face_landmarks:
                    return "center"
                
                landmarks = results.multi_face_landmarks[0].landmark
                
                # Use multiple landmarks for better accuracy
                nose_tip = landmarks[1]
                left_eye_inner = landmarks[133]
                right_eye_inner = landmarks[362]
                left_mouth_corner = landmarks[61]
                right_mouth_corner = landmarks[291]
                
                # Calculate face center using multiple points
                face_center_x = (left_eye_inner.x + right_eye_inner.x + 
                               left_mouth_corner.x + right_mouth_corner.x) / 4
                
                # Calculate horizontal offset
                horizontal_offset = nose_tip.x - face_center_x
                
                # Adjust thresholds based on sensitivity
                left_threshold = -0.03 - (self.sensitivity * 0.04)   # -0.03 to -0.07
                right_threshold = 0.03 + (self.sensitivity * 0.04)   # 0.03 to 0.07
                
                if horizontal_offset < left_threshold:
                    return "left"
                elif horizontal_offset > right_threshold:
                    return "right"
                else:
                    return "center"
                    
            else:
                # Fallback simulation
                import random
                return random.choice(["left", "right", "center"])
                
        except Exception as e:
            print(f"Head pose detection error: {e}")
            return "center"

# Initialize enhanced detector
face_detector = EnhancedFaceDetector()