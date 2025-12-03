from pymongo import MongoClient
import os

MONGO_URI = os.environ.get("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client['job_portal']

users_collection = db['users']
jobs_collection = db['jobs']
notifications_collection = db['notifications']
applications_collection = db['applications']

print("✅ Database Connected Successfully!")
