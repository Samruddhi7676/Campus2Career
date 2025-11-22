# Simple MongoDB Connection File with Applications Collection

from pymongo import MongoClient

try:
    # Connect to MongoDB and verify connection
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    client.admin.command('ping')  # Test connection
    db = client['job_portal']

    # Collections (Tables)
    users_collection = db['users']
    jobs_collection = db['jobs']
    notifications_collection = db['notifications']
    applications_collection = db['applications']  # New collection for job applications

    print("✅ Database Connected Successfully!")

except Exception as e:
    print("❌ Failed to connect to MongoDB:", e)
    raise e  # Stop the app if DB is unreachable