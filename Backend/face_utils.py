import cv2
import mediapipe as mp
import numpy as np
from typing import Tuple, Optional

class FaceDetector:
    def __init__(self):
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_detection = self.mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
    
    def detect_face(self, frame: np.ndarray) -> Tuple[bool, Optional[list]]:
        """Detect face and return bounding box"""
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_detection.process(rgb_frame)
            
            if results.detections:
                detection = results.detections[0]
                bbox = detection.location_data.relative_bounding_box
                h, w, _ = frame.shape
                
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)
                
                return True, [x, y, width, height]
            
            return False, None
        except Exception as e:
            print(f"Face detection error: {e}")
            return False, None
    
    def get_head_pose(self, frame: np.ndarray) -> str:
        """Detect head pose for gesture recognition"""
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
            
            if not results.multi_face_landmarks:
                return "center"
            
            landmarks = results.multi_face_landmarks[0].landmark
            
            # Use key landmarks for head pose estimation
            nose_tip = landmarks[1]
            
            # Get eye landmarks (approximate indices)
            left_eye_inner = landmarks[133]  # Left eye inner corner
            right_eye_inner = landmarks[362] # Right eye inner corner
            
            # Calculate face center
            face_center_x = (left_eye_inner.x + right_eye_inner.x) / 2
            
            # Calculate horizontal offset
            horizontal_offset = nose_tip.x - face_center_x
            
            # Adjust thresholds for better sensitivity
            if horizontal_offset < -0.05:  # Head tilted left
                return "left"
            elif horizontal_offset > 0.05:  # Head tilted right
                return "right"
            else:
                return "center"
                
        except Exception as e:
            print(f"Head pose detection error: {e}")
            return "center"
    
    def get_face_encoding(self, frame: np.ndarray, bbox: list) -> Optional[list]:
        """Extract face encoding for recognition"""
        try:
            x, y, w, h = bbox
            # Ensure coordinates are within frame bounds
            x = max(0, x)
            y = max(0, y)
            w = min(w, frame.shape[1] - x)
            h = min(h, frame.shape[0] - y)
            
            face_image = frame[y:y+h, x:x+w]
            
            if face_image.size == 0:
                return None
            
            # For now, return a simple encoding (in production, use face_recognition library)
            # Convert face to grayscale and flatten as a simple encoding
            gray_face = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
            resized_face = cv2.resize(gray_face, (50, 50))
            encoding = resized_face.flatten().tolist()
            
            return encoding
            
        except Exception as e:
            print(f"Face encoding error: {e}")
            return None

# Create global instance
face_detector = FaceDetector()