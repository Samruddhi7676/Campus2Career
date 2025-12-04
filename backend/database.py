from pymongo import MongoClient

try:
    client = MongoClient(
        "mongodb+srv://samruddhi:UserPassword@campus2career.zbhnq2s.mongodb.net/Campus2Career?retryWrites=true&w=majority&appName=Campus2Career"
    )

    db = client["Campus2Career"]

    users_collection = db["users"]
    jobs_collection = db["jobs"]
    notifications_collection = db["notifications"]
    applications_collection = db["applications"]

    print("🌐 Connected to MongoDB Atlas Successfully!")

except Exception as e:
    print("❌ Failed to connect to MongoDB Atlas:", e)
    raise e
