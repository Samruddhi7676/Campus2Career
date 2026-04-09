import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()  # loads from .env file automatically

try:
    mongo_uri = os.environ.get("MONGO_URI", "")
    if not mongo_uri:
        raise ValueError("MONGO_URI is not set! Check your .env file.")
    
    client = MongoClient(mongo_uri)
    db = client["Campus2Career"]

    users_collection = db["users"]
    jobs_collection = db["jobs"]
    notifications_collection = db["notifications"]
    applications_collection = db["applications"]
    internships_collection = db["internships"]
    internship_applications_collection = db["internship_applications"]

    print("🌐 Connected to MongoDB Atlas Successfully!")

except Exception as e:
    print("❌ Failed to connect to MongoDB Atlas:", e)
    raise e