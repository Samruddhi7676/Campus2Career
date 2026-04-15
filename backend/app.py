# main.py - Backend
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import users_collection, jobs_collection, notifications_collection, applications_collection, internships_collection, internship_applications_collection
from resume_reviewer import review_resume_file
from datetime import datetime, timedelta
from bson.objectid import ObjectId
import random
import string
import smtplib
import threading
import urllib.request
from urllib.parse import quote
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# -------------------------
# EMAIL CONFIGURATION
# -------------------------
# Reads sender credentials from a .env file in the same folder.
# Create a file called  .env  next to app.py with these two lines:
#
#   MAIL_SENDER=your_gmail@gmail.com
#   MAIL_PASSWORD=your_gmail_app_password
#
# HOW TO GET A GMAIL APP PASSWORD (required):
#   1. Go to myaccount.google.com > Security
#   2. Turn ON 2-Step Verification
#   3. Then go to Security > App passwords
#   4. Create one for "Mail" and paste it as MAIL_PASSWORD
#
# The OTP will be sent to WHATEVER email the user registers with.
# Only MAIL_SENDER/MAIL_PASSWORD identify WHO sends it.
# -------------------------

import os as _os

def _load_env(path='.env'):
    """Simple .env loader — no extra packages needed."""
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    env[key.strip()] = val.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return env

_env = _load_env(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '.env'))

MAIL_SENDER   = _env.get('MAIL_SENDER',   os.environ.get('MAIL_SENDER', ''))
BREVO_API_KEY = _env.get('BREVO_API_KEY', os.environ.get('BREVO_API_KEY', ''))
print(f"📧 Email config — sender: {MAIL_SENDER or 'NOT SET'}, api_key_set: {bool(BREVO_API_KEY)}")

# In-memory OTP store: { email: { otp: str, expires_at: datetime, verified: bool } }
otp_store = {}

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
# SERVE FRONTEND
# -------------------------

@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # Don't intercept /applications/ — those are handled by serve_application_file
    if path.startswith('applications/'):
        return jsonify({'error': 'Not found'}), 404
    # Don't intercept API routes — only serve actual static frontend files
    file_path = os.path.join(app.static_folder, path)
    if os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    return jsonify({'error': 'Not found'}), 404


# -------------------------
# SIGNUP
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


# -------------------------
# LOGIN
# -------------------------

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json

        user = users_collection.find_one({
            'email': data['email'],
            'password': data['password']
        })

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
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'error': 'Invalid file type'}), 400

        filename = f"resume_{datetime.now().timestamp()}.{file.filename.rsplit('.', 1)[1].lower()}"
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
            'company_email': data.get('company_email', ''),
            'posted_by': data['employer_email'],
            'posted_at': datetime.now()
        }

        jobs_collection.insert_one(new_job)

        # ✅ Send only to JOB SEEKERS
        job_seekers = users_collection.find({'role': 'jobseeker'})

        for seeker in job_seekers:
            notification = {
                'message': f"New job posted: {data['title']} at {data['company']}",
                'recipient_email': seeker['email'],
                'type': 'new_job',
                'created_at': datetime.now()
            }

            notifications_collection.insert_one(notification)

        return jsonify({'message': 'Job posted successfully!'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -------------------------
# POST INTERNSHIP
# -------------------------

@app.route('/post-internship', methods=['POST'])
def post_internship():
    try:
        data = request.json

        new_internship = {
            'title': data['title'],
            'company': data['company'],
            'location': data['location'],
            'duration': data['duration'],
            'stipend_type': data['stipend_type'],
            'stipend_amount': data.get('stipend_amount', ''),
            'description': data['description'],
            'company_email': data.get('company_email', ''),
            'posted_by': data['employer_email'],
            'posted_at': datetime.now()
        }

        internships_collection.insert_one(new_internship)

        # Send notification to job seekers
        job_seekers = users_collection.find({'role': 'jobseeker'})

        for seeker in job_seekers:
            notification = {
                'message': f"New internship posted: {data['title']} at {data['company']}",
                'recipient_email': seeker['email'],
                'type': 'new_internship',
                'created_at': datetime.now()
            }

            notifications_collection.insert_one(notification)

        return jsonify({'message': 'Internship posted successfully!'}), 201

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
# DELETE INTERNSHIP
# -------------------------

@app.route('/delete-internship', methods=['DELETE'])
def delete_internship():
    try:
        internship_id = request.args.get('internship_id')

        if not internship_id:
            return jsonify({'error': 'Internship ID is required'}), 400

        result = internships_collection.delete_one({'_id': ObjectId(internship_id)})

        if result.deleted_count == 0:
            return jsonify({'error': 'Internship not found'}), 404

        internship_applications_collection.delete_many({'internship_id': internship_id})

        return jsonify({'message': 'Internship deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -------------------------
# SEARCH JOBS
# -------------------------
@app.route('/search-jobs', methods=['GET'])
def search_jobs():
    search_term = request.args.get('search', '').lower()
    jobs = list(jobs_collection.find())
    if search_term:
        jobs = [job for job in jobs if search_term in job['title'].lower() or search_term in job['company'].lower()]
    for job in jobs:
        job['_id'] = str(job['_id'])
        job['posted_at'] = str(job['posted_at'])
    return jsonify(jobs), 200


# -------------------------
# SEARCH INTERNSHIPS
# -------------------------
@app.route('/search-internships', methods=['GET'])
def search_internships():
    search_term = request.args.get('search', '').lower()
    internships = list(internships_collection.find())
    if search_term:
        internships = [internship for internship in internships if search_term in internship['title'].lower() or search_term in internship['company'].lower()]
    for internship in internships:
        internship['_id'] = str(internship['_id'])
        internship['posted_at'] = str(internship['posted_at'])
    return jsonify(internships), 200


# -------------------------
# GET MY JOBS (EMPLOYER)
# -------------------------
@app.route('/my-jobs', methods=['GET'])
def my_jobs():
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400

        jobs = list(jobs_collection.find({'posted_by': email}))
        for job in jobs:
            job['_id'] = str(job['_id'])
            job['posted_at'] = str(job['posted_at'])
        return jsonify(jobs), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------
# GET MY INTERNSHIPS (EMPLOYER)
# -------------------------------
@app.route('/my-internships', methods=['GET'])
def my_internships():
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400

        internships = list(internships_collection.find({'posted_by': email}))
        for internship in internships:
            internship['_id'] = str(internship['_id'])
            internship['posted_at'] = str(internship['posted_at'])
        return jsonify(internships), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -------------------------
# DELETE NOTIFICATION
# -------------------------

@app.route('/delete-notification', methods=['DELETE'])
def delete_notification():
    try:
        notification_id = request.args.get('notification_id')

        if not notification_id:
            return jsonify({'error': 'Notification ID is required'}), 400

        result = notifications_collection.delete_one({'_id': ObjectId(notification_id)})

        if result.deleted_count == 0:
            return jsonify({'error': 'Notification not found'}), 404

        return jsonify({'message': 'Notification deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500    


# -------------------------
# APPLY JOB
# -------------------------
@app.route('/apply-job', methods=['POST'])
def apply_job():
    try:
        import base64

        if 'resume' not in request.files:
            return jsonify({'error': 'No resume uploaded'}), 400

        resume_file = request.files['resume']
        cert_files = request.files.getlist('certifications') if 'certifications' in request.files else []

        job_id = request.form.get('job_id')
        job_title = request.form.get('job_title')
        company = request.form.get('company')
        applicant_name = request.form.get('applicant_name')
        applicant_email = request.form.get('applicant_email')
        education = request.form.get('education')
        institution = request.form.get('institution')
        year = request.form.get('year')
        skills = request.form.get('skills')
        projects = request.form.get('projects', '')
        portfolio_url = request.form.get('portfolio_url', '')
        github_url = request.form.get('github_url', '')

        if not all([job_id, job_title, company, applicant_name, applicant_email,
                    education, institution, year, skills]):
            return jsonify({'error': 'Missing required fields'}), 400

        if applications_collection.find_one({'job_id': job_id, 'applicant_email': applicant_email}):
            return jsonify({'error': 'already_applied'}), 400

        if not resume_file.filename:
            return jsonify({'error': 'No resume file selected'}), 400

        if not resume_file.filename.endswith('.pdf'):
            return jsonify({'error': 'Only PDF files allowed for resume'}), 400

        # Store resume as base64 in MongoDB instead of disk
        safe_email = applicant_email.replace('@', '_at_').replace('.', '_')
        resume_filename = f"resume_{safe_email}_{job_id}.pdf"
        resume_data = base64.b64encode(resume_file.read()).decode('utf-8')

        # Store certifications as base64 in MongoDB
        certs_data = []
        if cert_files:
            for i, cert_file in enumerate(cert_files):
                if cert_file and cert_file.filename:
                    cert_ext = cert_file.filename.rsplit('.', 1)[1].lower()
                    if cert_ext in ['pdf', 'doc', 'docx']:
                        cert_filename = f"cert_{safe_email}_{job_id}_{i+1}.{cert_ext}"
                        cert_data = base64.b64encode(cert_file.read()).decode('utf-8')
                        certs_data.append({'filename': cert_filename, 'data': cert_data, 'ext': cert_ext})

        application = {
            'job_id': job_id,
            'job_title': job_title,
            'company': company,
            'applicant_name': applicant_name,
            'applicant_email': applicant_email,
            'resume_path': resume_filename,
            'resume_data': resume_data,
            'certifications_paths': [c['filename'] for c in certs_data],
            'certifications_data': certs_data,
            'education': {
                'qualification': education,
                'institution': institution,
                'year': year
            },
            'skills': skills,
            'projects': projects,
            'portfolio_url': portfolio_url,
            'github_url': github_url,
            'applied_at': datetime.now(),
            'status': 'pending'
        }

        applications_collection.insert_one(application)

        job = jobs_collection.find_one({'_id': ObjectId(job_id)})
        notification = {
            'message': f"{applicant_name} applied for {job_title}",
            'recipient_email': job['posted_by'],
            'type': 'applied',
            'created_at': datetime.now()
        }
        notifications_collection.insert_one(notification)

        return jsonify({'message': 'applied'}), 201

    except Exception as e:
        print(f"Error in apply_job: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
# -------------------------
# APPLY INTERNSHIP
# -------------------------
@app.route('/apply-internship', methods=['POST'])
def apply_internship():
    try:
        import base64

        internship_id = request.form.get('internship_id')
        internship_title = request.form.get('internship_title')
        company = request.form.get('company')
        applicant_name = request.form.get('applicant_name')
        applicant_email = request.form.get('applicant_email')
        stipend_type = request.form.get('stipend_type')
        education = request.form.get('education')
        institution = request.form.get('institution')
        portfolio_url = request.form.get('portfolio_url', '')
        github_url = request.form.get('github_url', '')

        if not all([internship_id, internship_title, company, applicant_name, applicant_email,
                    education, institution]):
            return jsonify({'error': 'Missing required fields'}), 400

        if internship_applications_collection.find_one({'internship_id': internship_id, 'applicant_email': applicant_email}):
            return jsonify({'error': 'already_applied'}), 400

        if 'resume' not in request.files:
            return jsonify({'error': 'Resume is required for all internships'}), 400

        resume_file = request.files['resume']

        if not resume_file.filename:
            return jsonify({'error': 'Resume is required for all internships'}), 400

        if not resume_file.filename.endswith('.pdf'):
            return jsonify({'error': 'Only PDF files allowed for resume'}), 400

        # Store resume as base64 in MongoDB instead of disk
        safe_email = applicant_email.replace('@', '_at_').replace('.', '_')
        resume_filename = f"internship_resume_{safe_email}_{internship_id}.pdf"
        resume_data = base64.b64encode(resume_file.read()).decode('utf-8')

        application = {
            'internship_id': internship_id,
            'internship_title': internship_title,
            'company': company,
            'applicant_name': applicant_name,
            'applicant_email': applicant_email,
            'resume_path': resume_filename,
            'resume_data': resume_data,
            'education': {
                'qualification': education,
                'institution': institution
            },
            'portfolio_url': portfolio_url,
            'github_url': github_url,
            'applied_at': datetime.now(),
            'status': 'pending'
        }

        internship_applications_collection.insert_one(application)

        internship = internships_collection.find_one({'_id': ObjectId(internship_id)})
        notification = {
            'message': f"{applicant_name} applied for {internship_title}",
            'recipient_email': internship['posted_by'],
            'type': 'applied_internship',
            'created_at': datetime.now()
        }
        notifications_collection.insert_one(notification)

        return jsonify({'message': 'applied'}), 201

    except Exception as e:
        print(f"Error in apply_internship: {str(e)}")
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
            a['resume_url'] = f"https://campus2career-n7tv.onrender.com/applications/{a['resume_path']}"
            a['resume_data'] = None  # don't send raw base64 in list view
            a['certifications_urls'] = [f"https://campus2career-n7tv.onrender.com/applications/{fn}" for fn in a.get('certifications_paths', [])]
            a['certifications_data'] = None  # don't send raw base64 in list view

        return jsonify(apps), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ------------------------------
# VIEW INTERNSHIP APPLICANTS
# ------------------------------
@app.route('/internship-applications', methods=['GET'])
def internship_applications():
    try:
        internship_id = request.args.get('internship_id')
        apps = list(internship_applications_collection.find({'internship_id': internship_id}))

        for a in apps:
            a['_id'] = str(a['_id'])
            a['applied_at'] = str(a['applied_at'])
            a['resume_url'] = f"https://campus2career-n7tv.onrender.com/applications/{a['resume_path']}" if a.get('resume_path') else None
            a['resume_data'] = None  # don't send raw base64 in list view

        return jsonify(apps), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -------------------------
# SERVE RESUME / CERT FILES
# -------------------------
@app.route('/applications/<filename>')
def serve_application_file(filename):
    import base64
    from flask import Response

    # Search in job applications
    app_doc = applications_collection.find_one({'resume_path': filename})
    if app_doc and app_doc.get('resume_data'):
        file_data = base64.b64decode(app_doc['resume_data'])
        return Response(file_data, mimetype='application/pdf',
                        headers={'Content-Disposition': f'inline; filename={filename}'})

    # Search certifications
    app_doc = applications_collection.find_one({'certifications_paths': filename})
    if app_doc and app_doc.get('certifications_data'):
        for cert in app_doc['certifications_data']:
            if cert['filename'] == filename:
                file_data = base64.b64decode(cert['data'])
                mime = 'application/pdf' if cert['ext'] == 'pdf' else 'application/msword'
                return Response(file_data, mimetype=mime,
                                headers={'Content-Disposition': f'inline; filename={filename}'})

    # Search in internship applications
    app_doc = internship_applications_collection.find_one({'resume_path': filename})
    if app_doc and app_doc.get('resume_data'):
        file_data = base64.b64decode(app_doc['resume_data'])
        return Response(file_data, mimetype='application/pdf',
                        headers={'Content-Disposition': f'inline; filename={filename}'})

    return jsonify({'error': 'File not found'}), 404


# -------------------------
# SELECT JOB APPLICANT
# -------------------------

@app.route('/select-applicant', methods=['POST'])
def select_applicant():
    try:
        data = request.json

        application_id = data.get('application_id')

        result = applications_collection.update_one(
            {'_id': ObjectId(application_id)},
            {'$set': {'status': 'selected'}}
        )

        if result.modified_count == 0:
            return jsonify({'error': 'Application not found'}), 404

        application = applications_collection.find_one({'_id': ObjectId(application_id)})
        job = jobs_collection.find_one({'_id': ObjectId(application['job_id'])})

        company_email = job.get('company_email') or job.get('posted_by')

        notification = {
            'message': f"Congratulations! You have been selected for the interview round for {application['job_title']} at {application['company']}. Contact: {company_email}",
            'recipient_email': application['applicant_email'],
            'type': 'selection',
            'created_at': datetime.now()
        }

        notifications_collection.insert_one(notification)

        return jsonify({'message': 'Applicant selected successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ------------------------------
# SELECT INTERNSHIP APPLICANT
# ------------------------------

@app.route('/select-internship-applicant', methods=['POST'])
def select_internship_applicant():
    try:
        data = request.json

        application_id = data.get('application_id')

        result = internship_applications_collection.update_one(
            {'_id': ObjectId(application_id)},
            {'$set': {'status': 'selected'}}
        )

        if result.modified_count == 0:
            return jsonify({'error': 'Application not found'}), 404

        application = internship_applications_collection.find_one({'_id': ObjectId(application_id)})
        internship = internships_collection.find_one({'_id': ObjectId(application['internship_id'])})

        company_email = internship.get('company_email') or internship.get('posted_by')

        notification = {
            'message': f"Congratulations! You have been selected for {application['internship_title']} at {application['company']}. Contact: {company_email}",
            'recipient_email': application['applicant_email'],
            'type': 'selection',
            'created_at': datetime.now()
        }

        notifications_collection.insert_one(notification)

        return jsonify({'message': 'Applicant selected successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------
# REJECT JOB APPLICANT
# -------------------------

@app.route('/reject-applicant', methods=['POST'])
def reject_applicant():
    try:
        data = request.json
        application_id = data.get('application_id')

        if not application_id:
            return jsonify({'error': 'Application ID is required'}), 400

        # Update application status to rejected
        result = applications_collection.update_one(
            {'_id': ObjectId(application_id)},
            {'$set': {'status': 'rejected'}}
        )

        if result.modified_count == 0:
            return jsonify({'error': 'Application not found'}), 404

        # Get application details
        application = applications_collection.find_one({'_id': ObjectId(application_id)})
        
        if not application:
            return jsonify({'error': 'Application not found'}), 404

        # Get job title and company from application (they're stored in the application itself)
        job_title = application.get('job_title', 'the position')
        company = application.get('company', 'our company')
        applicant_email = application.get('applicant_email')

        if not applicant_email:
            return jsonify({'error': 'Applicant email not found'}), 400

        # Send rejection notification to job seeker
        notification = {
            'message': f"Thank you for your interest in {job_title} at {company}. Unfortunately, we have decided to move forward with other candidates. We wish you the best in your job search!",
            'recipient_email': applicant_email,
            'type': 'rejection',
            'created_at': datetime.now()
        }

        notifications_collection.insert_one(notification)

        return jsonify({'message': 'Applicant rejected successfully'}), 200

    except Exception as e:
        print(f"Error in reject_applicant: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ------------------------------
# REJECT INTERNSHIP APPLICANT
# ------------------------------

@app.route('/reject-internship-applicant', methods=['POST'])
def reject_internship_applicant():
    try:
        data = request.json
        application_id = data.get('application_id')

        if not application_id:
            return jsonify({'error': 'Application ID is required'}), 400

        # Update application status to rejected
        result = internship_applications_collection.update_one(
            {'_id': ObjectId(application_id)},
            {'$set': {'status': 'rejected'}}
        )

        if result.modified_count == 0:
            return jsonify({'error': 'Application not found'}), 404

        # Get application details
        application = internship_applications_collection.find_one({'_id': ObjectId(application_id)})
        
        if not application:
            return jsonify({'error': 'Application not found'}), 404

        # Get internship title and company from application (they're stored in the application itself)
        internship_title = application.get('internship_title', 'the internship')
        company = application.get('company', 'our company')
        applicant_email = application.get('applicant_email')

        if not applicant_email:
            return jsonify({'error': 'Applicant email not found'}), 400

        # Send rejection notification to job seeker
        notification = {
            'message': f"Thank you for your interest in {internship_title} at {company}. Unfortunately, we have decided to move forward with other candidates. We encourage you to apply for future opportunities!",
            'recipient_email': applicant_email,
            'type': 'rejection',
            'created_at': datetime.now()
        }

        notifications_collection.insert_one(notification)

        return jsonify({'message': 'Applicant rejected successfully'}), 200

    except Exception as e:
        print(f"Error in reject_internship_applicant: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
# -------------------------
# GET NOTIFICATIONS 
# -------------------------

@app.route('/notifications', methods=['GET'])
def get_notifications():
    try:
        user_email = request.args.get('email')

        if not user_email:
            return jsonify({'error': 'Email is required'}), 400

        notifications = list(
            notifications_collection.find(
                {'recipient_email': user_email}
            ).sort('created_at', -1).limit(50)
        )

        for notif in notifications:
            notif['_id'] = str(notif['_id'])
            notif['created_at'] = str(notif['created_at'])

        return jsonify(notifications), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -------------------------
# FORGOT PASSWORD - STEP 1: Send confirmation email (Is that you?)
# -------------------------

def send_email(to_email, subject, html_body):
    """Send email via Brevo HTTP API (avoids SMTP port blocks on Render)."""
    print(f"📧 Attempting to send email to: {to_email}")
    if not MAIL_SENDER or not BREVO_API_KEY:
        print("❌ MAIL_SENDER or BREVO_API_KEY not configured.")
        return False
    try:
        import json as _json
        payload = _json.dumps({
            "sender": {"name": "Campus2Career", "email": MAIL_SENDER},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_body
        }).encode('utf-8')

        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "api-key": BREVO_API_KEY
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            print(f"✅ Email sent to {to_email} — status: {response.status}")
            return True

    except Exception as e:
        print(f"❌ Email send error: {type(e).__name__}: {e}")
        return False


@app.route('/forgot-password/request', methods=['POST'])
def forgot_password_request():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        user = users_collection.find_one({'email': email})
        if not user:
            return jsonify({'message': 'If this email is registered, you will receive an OTP shortly.'}), 200

        # Generate confirmation token - stored in MongoDB so it survives server restarts
        confirm_token = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
        token_expires = datetime.now() + timedelta(minutes=15)

        # Always overwrite with fresh token (invalidates any previous link)
        users_collection.update_one(
            {'email': email},
            {'$set': {
                'reset_confirm_token': confirm_token,
                'reset_expires_at': token_expires,
                'reset_confirmed': False,
                'reset_otp': None,
                'reset_otp_expires_at': None
            }}
        )

        encoded_email = quote(email, safe="")
        confirm_url_yes = f"https://campus2career-n7tv.onrender.com/forgot-password/confirm?email={encoded_email}&token={confirm_token}&action=yes"
        confirm_url_no  = f"https://campus2career-n7tv.onrender.com/forgot-password/confirm?email={encoded_email}&token={confirm_token}&action=no"

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f9f9f9; border-radius: 10px;">
            <h2 style="color: #6b5b95; text-align: center;">Campus2Career - Password Reset Request</h2>
            <p style="color: #555; font-size: 16px;">Hi <strong>{user['name']}</strong>,</p>
            <p style="color: #555; font-size: 16px;">We received a request to reset your password. Was this you?</p>
            <div style="text-align: center; margin: 30px 0; display: flex; gap: 15px; justify-content: center;">
                <a href="{confirm_url_yes}" style="background: #6b5b95; color: white; padding: 14px 35px; border-radius: 8px; font-size: 16px; font-weight: bold; text-decoration: none;">✅ Yes, it's me</a>
                <a href="{confirm_url_no}" style="background: #e74c3c; color: white; padding: 14px 35px; border-radius: 8px; font-size: 16px; font-weight: bold; text-decoration: none;">❌ No, it wasn't me</a>
            </div>
            <p style="color: #999; font-size: 13px; text-align: center;">This link expires in 15 minutes.</p>
        </div>
        """

        threading.Thread(
            target=send_email,
            args=(email, "Campus2Career - Password Reset Request", html_body),
            daemon=True
        ).start()

        return jsonify({'message': "Confirmation email sent! Click 'Yes, it's me' in the email, then check your inbox for the OTP."}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/forgot-password/confirm', methods=['GET'])
def forgot_password_confirm():
    """Step 2 - User clicked Yes/No in email. Send OTP if Yes."""
    try:
        email = request.args.get('email', '').strip().lower()
        token = request.args.get('token', '')
        action = request.args.get('action', '')

        print(f"DEBUG confirm - email: {email}, token: {token}, action: {action}")
        user = users_collection.find_one({'email': email})
        print(f"DEBUG confirm - user found: {user is not None}, stored token: {user.get('reset_confirm_token') if user else 'N/A'}")

        if not user or not user.get('reset_confirm_token'):
            return """<html><body style="font-family:Arial;text-align:center;padding:50px;">
                <h2 style="color:#e74c3c;">❌ Invalid or expired link.</h2>
                <p>Please request a new password reset from the app.</p></body></html>"""

        if user['reset_confirm_token'] != token:
            return """<html><body style="font-family:Arial;text-align:center;padding:50px;font-family:Arial;">
                <div style="max-width:450px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);margin-top:50px;">
                <h2 style="color:#e74c3c;">❌ Link Expired</h2>
                <p style="color:#555;font-size:16px;">This link is no longer valid. You may have requested a newer reset email — please use the <strong>latest email</strong> you received.</p>
                <p style="color:#999;font-size:13px;">Go back to the app and request a new password reset if needed.</p>
                </div></body></html>"""

        if datetime.now() > user['reset_expires_at']:
            users_collection.update_one({'email': email}, {'$unset': {'reset_confirm_token': '', 'reset_expires_at': '', 'reset_confirmed': '', 'reset_otp': '', 'reset_otp_expires_at': ''}})
            return """<html><body style="font-family:Arial;text-align:center;padding:50px;">
                <h2 style="color:#e74c3c;">⏰ This link has expired.</h2>
                <p>Please request a new password reset from the app.</p></body></html>"""

        if action == 'no':
            users_collection.update_one({'email': email}, {'$unset': {'reset_confirm_token': '', 'reset_expires_at': '', 'reset_confirmed': '', 'reset_otp': '', 'reset_otp_expires_at': ''}})
            return """<html><body style="font-family:Arial;text-align:center;padding:50px;">
                <h2 style="color:#6b5b95;">🔒 Your account is safe!</h2>
                <p>No changes were made to your account. If you have concerns, please contact support.</p></body></html>"""

        if action == 'yes':
            # Generate 6-digit OTP
            otp = ''.join(random.choices(string.digits, k=6))
            otp_expires = datetime.now() + timedelta(minutes=10)

            users_collection.update_one(
                {'email': email},
                {'$set': {
                    'reset_confirmed': True,
                    'reset_otp': otp,
                    'reset_otp_expires_at': otp_expires
                }}
            )
            html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 30px; background: #f9f9f9; border-radius: 10px;">
                <h2 style="color: #6b5b95; text-align: center;">Your OTP Code</h2>
                <p style="color: #555;">Hi <strong>{user['name'] if user else email}</strong>, here is your one-time password:</p>
                <div style="text-align: center; margin: 25px 0;">
                    <span style="font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #6b5b95; background: #f0ecf9; padding: 15px 25px; border-radius: 10px; display: inline-block;">{otp}</span>
                </div>
                <p style="color: #777; font-size: 13px; text-align: center;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
                <p style="color: #999; font-size: 12px; text-align: center;">Go back to the Campus2Career app and enter this OTP to reset your password.</p>
            </div>
            """
            threading.Thread(target=send_email, args=(email, "Campus2Career - Your OTP Code", html_body), daemon=True).start()

            return """<html><body style="font-family:Arial;text-align:center;padding:50px;background:#f9f9f9;">
                <div style="max-width:450px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                    <h2 style="color:#6b5b95;">✅ Identity Confirmed!</h2>
                    <p style="color:#555;font-size:16px;">An OTP has been sent to your email address.</p>
                    <p style="color:#555;font-size:16px;">Please go back to the <strong>Campus2Career app</strong> and enter your OTP to reset your password.</p>
                    <p style="color:#999;font-size:13px;">The OTP expires in 10 minutes.</p>
                </div></body></html>"""

        return """<html><body style="font-family:Arial;text-align:center;padding:50px;">
            <h2 style="color:#e74c3c;">❌ Invalid action.</h2></body></html>"""

    except Exception as e:
        return f"""<html><body style="font-family:Arial;text-align:center;padding:50px;">
            <h2 style="color:#e74c3c;">❌ Error: {str(e)}</h2></body></html>"""


@app.route('/forgot-password/reset', methods=['POST'])
def forgot_password_reset():
    """Step 3 - Verify OTP and update password"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        otp = data.get('otp', '').strip()
        new_password = data.get('new_password', '')

        if not email or not otp or not new_password:
            return jsonify({'error': 'Email, OTP, and new password are required'}), 400

        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        print(f"DEBUG reset - email: '{email}', otp: '{otp}'")
        user = users_collection.find_one({'email': email})
        print(f"DEBUG reset - user found: {user is not None}, reset_confirmed: {user.get('reset_confirmed') if user else 'N/A'}")

        if not user or not user.get('reset_confirm_token'):
            return jsonify({'error': 'No password reset request found. Please start over.'}), 400

        if not user.get('reset_confirmed'):
            return jsonify({'error': 'Please confirm your identity via email first.'}), 400

        if datetime.now() > user.get('reset_otp_expires_at', datetime.min):
            users_collection.update_one({'email': email}, {'$unset': {'reset_confirm_token': '', 'reset_expires_at': '', 'reset_confirmed': '', 'reset_otp': '', 'reset_otp_expires_at': ''}})
            return jsonify({'error': 'OTP has expired. Please request a new password reset.'}), 400

        stored_otp = str(user.get('reset_otp', '')).strip()
        entered_otp = str(otp).strip()
        print(f"DEBUG OTP - stored: '{stored_otp}', entered: '{entered_otp}', email: '{email}'")
        if stored_otp != entered_otp:
            return jsonify({'error': 'Invalid OTP. Please check and try again.'}), 400

        # OTP is correct — update password and clean up reset fields
        result = users_collection.update_one(
            {'email': email},
            {
                '$set': {'password': new_password},
                '$unset': {'reset_confirm_token': '', 'reset_expires_at': '', 'reset_confirmed': '', 'reset_otp': '', 'reset_otp_expires_at': ''}
            }
        )

        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'message': 'Password updated successfully! You can now log in.'}), 200

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

# Keep Render free tier awake by pinging every 10 minutes
def keep_alive():
    import time
    while True:
        time.sleep(600)  # 10 minutes
        try:
            urllib.request.urlopen("https://campus2career-n7tv.onrender.com/")
            print("🏓 Keep-alive ping sent")
        except Exception as e:
            print(f"Keep-alive ping failed: {e}")

threading.Thread(target=keep_alive, daemon=True).start()

if __name__ == '__main__':
    print("🚀 Server running at http://localhost:5000")
    print("📱 On same WiFi? Use your laptop IP e.g. http://192.168.x.x:5000")
    print("📁 Frontend:", FRONTEND_DIR)
    print("📁 Uploads:", UPLOAD_FOLDER)
    print("📁 Applications:", APPLICATIONS_FOLDER)
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
