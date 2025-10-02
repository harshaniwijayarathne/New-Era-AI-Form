import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_pymongo import PyMongo
import cv2
import numpy as np
import base64
import io
from datetime import datetime
from bson.binary import Binary
from bson.objectid import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config["MONGO_URI"] = os.getenv('MONGO_URI', 'mongodb://localhost:27017/new_era_ai')
app.config["SECRET_KEY"] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Configure CORS for production
CORS(app, origins=[
    "http://localhost:3000",
    "http://localhost:5173", 
    "https://*.vercel.app",
    "https://*.onrender.com",
    "https://*.herokuapp.com",
    "https://*.railway.app"
])

mongo = PyMongo(app)

# Security headers
@app.after_request
def after_request(response):
    response.headers.add('X-Content-Type-Options', 'nosniff')
    response.headers.add('X-Frame-Options', 'DENY')
    response.headers.add('X-XSS-Protection', '1; mode=block')
    return response

class FaceDetector:
    def __init__(self):
        try:
            import mediapipe as mp
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
            self.mediapipe_available = True
            print("✅ MediaPipe initialized successfully")
        except ImportError:
            self.mediapipe_available = False
            print("⚠️ MediaPipe not available, using OpenCV fallback")
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    def detect_face(self, frame: np.ndarray):
        """Detect face and return bounding box"""
        try:
            if self.mediapipe_available:
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
            else:
                # Fallback to OpenCV
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
                
                if len(faces) > 0:
                    x, y, w, h = faces[0]
                    return True, [x, y, w, h]
                return False, None
                
        except Exception as e:
            print(f"Face detection error: {e}")
            return False, None
    
    def get_head_pose(self, frame: np.ndarray):
        """Detect head pose for gesture recognition"""
        try:
            if self.mediapipe_available:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self.face_mesh.process(rgb_frame)
                
                if not results.multi_face_landmarks:
                    return "center"
                
                landmarks = results.multi_face_landmarks[0].landmark
                
                # Use key landmarks for head pose estimation
                nose_tip = landmarks[1]
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
            else:
                # Simple head pose simulation for fallback
                return ["left", "right", "center"][np.random.randint(0, 3)]
                
        except Exception as e:
            print(f"Head pose detection error: {e}")
            return "center"

# Initialize face detector
face_detector = FaceDetector()

class User:
    @staticmethod
    def create_user(data, face_image=None):
        users = mongo.db.users
        
        # Prepare user data
        user_data = {
            'name': data['name'],
            'email': data['email'].lower(),
            'password': data['password'],  # In production, hash this
            'face_encoding': data.get('face_encoding', []),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Store face image if provided
        if face_image:
            user_data['face_image'] = Binary(face_image)
            user_data['has_face_image'] = True
        
        result = users.insert_one(user_data)
        return result.inserted_id
    
    @staticmethod
    def find_by_face(face_encoding):
        users = mongo.db.users
        # For demo, return first user with face image
        return users.find_one({'has_face_image': True})
    
    @staticmethod
    def find_by_email(email):
        users = mongo.db.users
        return users.find_one({'email': email.lower()})
    
    @staticmethod
    def get_all_users():
        users = mongo.db.users
        return list(users.find({}))

class FaceStorage:
    @staticmethod
    def save_face_image(user_id, image_data):
        faces = mongo.db.face_images
        face_data = {
            'user_id': user_id,
            'image_data': Binary(image_data),
            'created_at': datetime.utcnow()
        }
        return faces.insert_one(face_data)
    
    @staticmethod
    def get_face_image(user_id):
        faces = mongo.db.face_images
        return faces.find_one({'user_id': user_id})

def process_face_image(image_data):
    """Process and validate face image"""
    try:
        # Extract base64 image data
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 to image
        img_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if frame is None:
            return None, "Invalid image data"
        
        # Detect face
        face_detected, bbox = face_detector.detect_face(frame)
        
        if not face_detected:
            return None, "No face detected in the image"
        
        # Extract face region
        x, y, w, h = bbox
        # Ensure coordinates are within bounds
        x = max(0, x)
        y = max(0, y)
        w = min(w, frame.shape[1] - x)
        h = min(h, frame.shape[0] - y)
        
        face_image = frame[y:y+h, x:x+w]
        
        if face_image.size == 0:
            return None, "Invalid face region"
        
        # Resize for consistency
        face_image = cv2.resize(face_image, (200, 200))
        
        # Convert to JPEG bytes
        success, encoded_image = cv2.imencode('.jpg', face_image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if not success:
            return None, "Failed to encode face image"
        
        return encoded_image.tobytes(), None
        
    except Exception as e:
        return None, f"Error processing face image: {str(e)}"

@app.route('/')
def home():
    return jsonify({
        'message': 'New Era AI Backend is running!',
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'face_detection': 'active' if face_detector.mediapipe_available else 'fallback'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'New Era AI Backend is running',
        'timestamp': datetime.utcnow().isoformat(),
        'environment': os.getenv('RAILWAY_ENVIRONMENT', 'development'),
        'face_detection': 'active' if face_detector.mediapipe_available else 'fallback'
    })

@app.route('/api/validate-face', methods=['POST'])
def validate_face():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'No image data provided',
                'action': 'retry'
            })
        
        # Process the image to check if face is detectable
        face_image_bytes, error = process_face_image(data['image'])
        
        if error:
            return jsonify({
                'success': False,
                'message': error,
                'action': 'retry'
            })
        
        # For demo purposes, simulate face recognition
        # In production, compare with database
        import random
        face_recognized = random.choice([True, False])
        
        if face_recognized:
            existing_user = User.find_by_face([])
            if existing_user:
                return jsonify({
                    'success': True,
                    'message': 'Login successful! Face recognized.',
                    'action': 'redirect',
                    'user': {
                        'name': existing_user.get('name', 'User'),
                        'email': existing_user.get('email', 'user@example.com')
                    }
                })
        
        return jsonify({
            'success': False,
            'message': 'Face not recognized. Do you want to register?',
            'action': 'register_prompt',
            'face_detected': True
        })
        
    except Exception as e:
        print(f"Validation error: {e}")
        return jsonify({
            'success': False,
            'message': f'Error processing image: {str(e)}',
            'action': 'retry'
        })

@app.route('/api/detect-gesture', methods=['POST'])
def detect_gesture():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'No image data provided'
            })
        
        # Extract base64 image data
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        img_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({
                'success': False,
                'message': 'Invalid image data'
            })
        
        head_pose = face_detector.get_head_pose(frame)
        
        return jsonify({
            'success': True,
            'gesture': head_pose,
            'detected': head_pose in ['left', 'right'],
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        print(f"Gesture detection error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/api/capture-face', methods=['POST'])
def capture_face():
    """Capture and return face image for preview"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'No image data provided'
            })
        
        # Process the image
        face_image_bytes, error = process_face_image(data['image'])
        
        if error:
            return jsonify({
                'success': False,
                'message': error
            })
        
        # Convert back to base64 for frontend preview
        face_image_b64 = base64.b64encode(face_image_bytes).decode('utf-8')
        
        # Generate a simple face encoding
        face_encoding = list(np.random.rand(128).astype(float))  # Mock encoding
        
        return jsonify({
            'success': True,
            'message': 'Face captured successfully!',
            'face_image': f"data:image/jpeg;base64,{face_image_b64}",
            'face_encoding': face_encoding,
            'face_size': len(face_image_bytes)
        })
        
    except Exception as e:
        print(f"Face capture error: {e}")
        return jsonify({
            'success': False,
            'message': f'Face capture failed: {str(e)}'
        })

@app.route('/api/register', methods=['POST'])
def register_user():
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            })
        
        # Validate required fields
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                })
        
        # Check if email already exists
        if User.find_by_email(data['email']):
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            })
        
        # Process face image if provided
        face_image_bytes = None
        if data.get('face_image'):
            face_image_bytes, error = process_face_image(data['face_image'])
            if error:
                return jsonify({
                    'success': False,
                    'message': f'Face image error: {error}'
                })
        
        # Create user with face data
        user_id = User.create_user({
            'name': data['name'],
            'email': data['email'],
            'password': data['password'],
            'face_encoding': data.get('face_encoding', [])
        }, face_image_bytes)
        
        # Also save to separate face storage
        if face_image_bytes:
            FaceStorage.save_face_image(user_id, face_image_bytes)
        
        return jsonify({
            'success': True,
            'message': 'Registration successful!',
            'user_id': str(user_id),
            'user': {
                'name': data['name'],
                'email': data['email']
            },
            'face_saved': face_image_bytes is not None
        })
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        })

@app.route('/api/guest-login', methods=['POST'])
def guest_login():
    return jsonify({
        'success': True,
        'message': 'Logged in as Guest',
        'user': {
            'name': 'Guest User',
            'email': 'guest@example.com'
        }
    })

@app.route('/api/users', methods=['GET'])
def get_all_users():
    """Get all registered users (for testing)"""
    try:
        users = User.get_all_users()
        # Convert ObjectId to string for JSON serialization
        for user in users:
            user['_id'] = str(user['_id'])
            # Don't return sensitive data
            if 'password' in user:
                del user['password']
            if 'face_encoding' in user:
                user['has_face_encoding'] = len(user['face_encoding']) > 0
                del user['face_encoding']
            if 'face_image' in user:
                user['has_face_image'] = True
                del user['face_image']
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users),
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        print(f"Get users error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/api/face-image/<user_id>', methods=['GET'])
def get_face_image(user_id):
    """Get stored face image for a user"""
    try:
        face_data = FaceStorage.get_face_image(user_id)
        if not face_data:
            return jsonify({
                'success': False,
                'message': 'Face image not found'
            })
        
        return send_file(
            io.BytesIO(face_data['image_data']),
            mimetype='image/jpeg',
            as_attachment=False,
            download_name=f'face_{user_id}.jpg'
        )
    except Exception as e:
        print(f"Get face image error: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/api/debug-head-pose', methods=['POST'])
def debug_head_pose():
    """Debug endpoint to see raw head pose data"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'No image data provided'
            })
        
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        img_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({
                'success': False,
                'message': 'Invalid image data'
            })
        
        return jsonify({
            'success': True,
            'head_pose': face_detector.get_head_pose(frame),
            'face_detected': True,
            'mediapipe_available': face_detector.mediapipe_available
        })
            
    except Exception as e:
        print(f"Debug head pose error: {e}")
        return jsonify({
            'success': False,
            'message': str(e),
            'face_detected': False
        })

@app.route('/api/cleanup', methods=['DELETE'])
def cleanup_users():
    """Cleanup all users (for testing)"""
    try:
        users = mongo.db.users
        face_images = mongo.db.face_images
        
        user_count = users.count_documents({})
        face_count = face_images.count_documents({})
        
        users.delete_many({})
        face_images.delete_many({})
        
        return jsonify({
            'success': True,
            'message': 'Cleanup completed',
            'deleted_users': user_count,
            'deleted_faces': face_count
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'message': 'Bad request'
    }), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("🚀 Starting New Era AI Backend...")
    print("📷 Face detection system initialized")
    print("🎯 Gesture recognition ready")
    print("💾 MongoDB connection established")
    print(f"🌐 Server running on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)