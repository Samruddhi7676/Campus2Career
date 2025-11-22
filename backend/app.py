# main.py - Fixed Backend
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import users_collection, jobs_collection, notifications_collection, applications_collection
from resume_reviewer import review_resume_file
from datetime import datetime
from bson.objectid import ObjectId
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
APPLICATIONS_FOLDER = os.path.join(BASE_DIR, 'applications')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(APPLICATIONS_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['APPLICATIONS_FOLDER'] = APPLICATIONS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

# -------------------------
# Serve Frontend
# -------------------------
@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# -------------------------
# SIGNUP / LOGIN
# -------------------------
@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        if users_collection.find_one({'email': data['email']}):
            return jsonify({'error': 'User already exists'}), 400
        new_user = {
            'name': data['name'],
            'email': data['email'],
            'password': data['password'],
            'role': data['role'],
            'created_at': datetime.now()
        }
        users_collection.insert_one(new_user)
        return jsonify({'message': 'User registered successfully!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        user = users_collection.find_one({'email': data['email'], 'password': data['password']})
        if user:
            return jsonify({
                'message': 'Login successful!',
                'name': user['name'],
                'role': user['role'],
                'email': user['email']
            }), 200
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------
# REVIEW RESUME
# -------------------------
@app.route('/review-resume', methods=['POST'])
def review():
    try:
        if 'resume' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        file = request.files['resume']
        job_role = request.form.get('job_role', 'other')
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        allowed_extensions = {'pdf', 'doc', 'docx', 'txt'}
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({'error': 'Invalid file type'}), 400
        filename = f"resume_{datetime.now().timestamp()}.{file_ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        result = review_resume_file(filepath, job_role)
        os.remove(filepath)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------
# POST JOB
# -------------------------
@app.route('/post-job', methods=['POST'])
def post_job():
    try:
        data = request.json
        new_job = {
            'title': data['title'],
            'company': data['company'],
            'location': data['location'],
            'salary': data['salary'],
            'description': data['description'],
            'posted_by': data['employer_email'],
            'posted_at': datetime.now()
        }
        jobs_collection.insert_one(new_job)
        notification = {
            'message': f"New job posted: {data['title']} at {data['company']}",
            'created_at': datetime.now()
        }
        notifications_collection.insert_one(notification)
        return jsonify({'message': 'Job posted successfully!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/search-jobs', methods=['GET'])
def search_jobs():
    try:
        search_term = request.args.get('search', '')
        jobs = list(jobs_collection.find({
            "$or": [
                {"title": {"$regex": search_term, "$options": "i"}},
                {"company": {"$regex": search_term, "$options": "i"}},
                {"location": {"$regex": search_term, "$options": "i"}}
            ]
        }))
        for job in jobs:
            job['_id'] = str(job['_id'])
            job['posted_at'] = str(job['posted_at'])
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/my-jobs', methods=['GET'])
def my_jobs():
    try:
        email = request.args.get('email')
        jobs = list(jobs_collection.find({'posted_by': email}))
        for job in jobs:
            job['_id'] = str(job['_id'])
            job['posted_at'] = str(job['posted_at'])
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------
# DELETE JOB
# -------------------------
@app.route('/delete-job', methods=['DELETE'])
def delete_job():
    try:
        job_id = request.args.get('job_id')
        if not job_id:
            return jsonify({'error': 'Job ID is required'}), 400
        result = jobs_collection.delete_one({'_id': ObjectId(job_id)})
        if result.deleted_count == 0:
            return jsonify({'error': 'Job not found'}), 404
        applications_collection.delete_many({'job_id': job_id})
        return jsonify({'message': 'Job deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------
# APPLY JOB
# -------------------------
@app.route('/apply-job', methods=['POST'])
def apply_job():
    try:
        if 'resume' not in request.files:
            return jsonify({'error': 'No resume uploaded'}), 400
        file = request.files['resume']
        job_id = request.form.get('job_id')
        job_title = request.form.get('job_title')
        company = request.form.get('company')
        applicant_name = request.form.get('applicant_name')
        applicant_email = request.form.get('applicant_email')

        if applications_collection.find_one({'job_id': job_id, 'applicant_email': applicant_email}):
            return jsonify({'error': 'already_applied'}), 400
        if not file.filename.endswith('.pdf'):
            return jsonify({'error': 'Only PDF files allowed'}), 400

        filename = f"application_{applicant_email}_{job_id}.pdf"
        filepath = os.path.join(app.config['APPLICATIONS_FOLDER'], filename)
        file.save(filepath)

        application = {
            'job_id': job_id,
            'job_title': job_title,
            'company': company,
            'applicant_name': applicant_name,
            'applicant_email': applicant_email,
            'resume_path': filepath,
            'applied_at': datetime.now(),
            'status': 'pending'
        }
        applications_collection.insert_one(application)

        notification = {
            'message': f"{applicant_name} applied for {job_title}",
            'created_at': datetime.now()
        }
        notifications_collection.insert_one(notification)

        return jsonify({'message': 'applied'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------
# VIEW APPLICANTS
# -------------------------
@app.route('/job-applications', methods=['GET'])
def job_applications():
    try:
        job_id = request.args.get('job_id')
        apps = list(applications_collection.find({'job_id': job_id}))
        for a in apps:
            a['_id'] = str(a['_id'])
            a['applied_at'] = str(a['applied_at'])
            a['resume_url'] = f"/applications/{os.path.basename(a['resume_path'])}"
        return jsonify(apps), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/applications/<filename>')
def serve_application_file(filename):
    return send_from_directory(app.config['APPLICATIONS_FOLDER'], filename)

# -------------------------
# NOTIFICATIONS
# -------------------------
@app.route('/notifications', methods=['GET'])
def get_notifications():
    try:
        notifications = list(notifications_collection.find().sort('created_at', -1).limit(10))
        for notif in notifications:
            notif['_id'] = str(notif['_id'])
            notif['created_at'] = str(notif['created_at'])
        return jsonify(notifications), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------
# HEALTH CHECK
# -------------------------
@app.route('/health')
def health():
    return jsonify({'status': 'OK'}), 200

# -------------------------
# RUN SERVER
# -------------------------
if __name__ == '__main__':
    print("🚀 Server running at http://localhost:5000")
    print("📁 Frontend:", FRONTEND_DIR)
    print("📁 Uploads:", UPLOAD_FOLDER)
    print("📁 Applications:", APPLICATIONS_FOLDER)
    app.run(debug=True, port=5000, use_reloader=False)
