from flask_pymongo import PyMongo
from datetime import datetime
import base64
import cv2
import numpy as np
from bson.binary import Binary
import io
from PIL import Image

mongo = PyMongo()

class User:
    @staticmethod
    def create_user(data, face_image=None):
        users = mongo.db.users
        
        # Prepare user data
        user_data = {
            'name': data['name'],
            'email': data['email'],
            'password': data['password'],  # In production, hash this
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Store face encoding if provided
        if data.get('face_encoding'):
            user_data['face_encoding'] = data['face_encoding']
        
        # Store face image if provided
        if face_image:
            user_data['face_image'] = Binary(face_image)
            user_data['has_face_image'] = True
        
        result = users.insert_one(user_data)
        return result.inserted_id
    
    @staticmethod
    def find_by_face(face_encoding):
        users = mongo.db.users
        # Simple face matching (in production, use proper face recognition)
        # For demo, just return the first user
        return users.find_one({'has_face_image': True})
    
    @staticmethod
    def find_by_email(email):
        users = mongo.db.users
        return users.find_one({'email': email})
    
    @staticmethod
    def get_all_users():
        users = mongo.db.users
        return list(users.find({}, {'password': 0}))  # Exclude passwords

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