import os
from pymongo import MongoClient

try:
    client = MongoClient(os.environ.get("MONGO_URI", ""))

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