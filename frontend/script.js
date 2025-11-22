// ========================================
// CONFIG
// ========================================
const API_URL = 'http://localhost:5000';
let currentUser = null;
console.log('Script loaded successfully');

// ========================================
// AUTH FUNCTIONS
// ========================================
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.querySelectorAll('.tab')[1].classList.remove('active');
    document.getElementById('login-message').innerHTML = '';
    document.getElementById('signup-message').innerHTML = '';
}

function showSignup() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
    document.querySelectorAll('.tab')[0].classList.remove('active');
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('login-message').innerHTML = '';
    document.getElementById('signup-message').innerHTML = '';
}

async function signup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    const msgDiv = document.getElementById('signup-message');

    if (!name || !email || !password || !role) {
        msgDiv.innerHTML = 'Please fill all fields!';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await response.json();
        if (response.ok) {
            msgDiv.innerHTML = 'Account created! Logging you in...';
            setTimeout(() => {
                currentUser = { name, email, role };
                showDashboard();
            }, 1000);
        } else {
            msgDiv.innerHTML = data.error;
        }
    } catch (error) {
        msgDiv.innerHTML = 'Server error! Make sure backend is running';
        console.error(error);
    }
}

async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const msgDiv = document.getElementById('login-message');

    if (!email || !password) {
        msgDiv.innerHTML = 'Please fill all fields!';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            currentUser = {
                name: data.name || 'User',
                email: data.email,
                role: data.role || 'jobseeker'
            };
            showDashboard();
        } else {
            msgDiv.innerHTML = 'Invalid credentials!';
        }
    } catch (error) {
        msgDiv.innerHTML = 'Server error!';
        console.error(error);
    }
}

function logout() {
    if (window.confirm('Are you sure you want to logout?')) {
        currentUser = null;
        
        // Clear all form fields
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('signup-name').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-role').value = '';
        
        // Clear messages
        document.getElementById('login-message').innerHTML = '';
        document.getElementById('signup-message').innerHTML = '';
        
        // Switch pages
        document.getElementById('dashboard-page').classList.remove('active');
        document.getElementById('auth-page').classList.add('active');
        
        // Show login form
        showLogin();
    }
}

// ========================================
// DASHBOARD
// ========================================
function showDashboard() {
    document.getElementById('auth-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');

    document.getElementById('sidebar-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('sidebar-name').textContent = currentUser.name;
    document.getElementById('sidebar-role').textContent = currentUser.role === 'jobseeker' ? 'Job Seeker' : 'Employer';
    document.getElementById('home-user-name').textContent = currentUser.name;

    if (currentUser.role === 'employer') {
        document.getElementById('nav-resume').style.display = 'none';
        document.getElementById('nav-jobs').style.display = 'none';
        document.getElementById('nav-post-job').style.display = 'block';
        document.getElementById('nav-my-jobs').style.display = 'block';
    } else {
        document.getElementById('nav-resume').style.display = 'block';
        document.getElementById('nav-jobs').style.display = 'block';
        document.getElementById('nav-post-job').style.display = 'none';
        document.getElementById('nav-my-jobs').style.display = 'none';
    }

    loadHomePage();
    loadProfileData();
}

function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const map = {
        home: 'home-section',
        jobs: 'jobs-section',
        resume: 'resume-section',
        'post-job': 'post-job-section',
        'my-jobs': 'my-jobs-section',
        notifications: 'notifications-section',
        profile: 'profile-section'
    };
    document.getElementById(map[section]).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(section)) {
            item.classList.add('active');
        }
    });

    // Clear resume review results and form when leaving resume section
    if (section !== 'resume') {
        const resumeResult = document.getElementById('resume-result');
        const resumeFile = document.getElementById('resume-file');
        const jobRoleSelect = document.getElementById('job-role-select');
        if (resumeResult) resumeResult.innerHTML = '';
        if (resumeFile) resumeFile.value = '';
        if (jobRoleSelect) jobRoleSelect.value = '';
    }

    if (section === 'home') loadHomePage();
    if (section === 'jobs') searchJobs();
    if (section === 'notifications') loadNotifications();
    if (section === 'my-jobs') loadEmployerJobs();
    if (section === 'profile') loadProfileData();
}

// ========================================
// HOME PAGE
// ========================================
async function loadHomePage() {
    try {
        const jobs = await (await fetch(`${API_URL}/search-jobs?search=`)).json();
        document.getElementById('total-jobs').textContent = jobs.length;
        document.getElementById('new-jobs').textContent = Math.min(jobs.length, 5);

        const homeJobsList = document.getElementById('home-jobs-list');
        homeJobsList.innerHTML = '';
        jobs.slice(0, 5).forEach(job => {
            const div = document.createElement('div');
            div.className = 'job-card';
            div.innerHTML = '<h4>' + job.title + '</h4>' +
                '<p><strong>Company:</strong> ' + job.company + '</p>' +
                '<p><strong>Location:</strong> ' + job.location + '</p>' +
                '<p><strong>Salary:</strong> ' + job.salary + '</p>';
            homeJobsList.appendChild(div);
        });

        const notifications = await (await fetch(`${API_URL}/notifications`)).json();
        const filtered = currentUser.role === 'employer'
            ? notifications.filter(n => n.message.includes('applied'))
            : notifications.filter(n => n.message.includes('New job posted'));

        document.getElementById('total-notifications').textContent = filtered.length;

        const notifList = document.getElementById('home-notifications-list');
        notifList.innerHTML = '';
        filtered.slice(0, 5).forEach(notif => {
            const div = document.createElement('div');
            div.className = 'notification';
            div.innerHTML = '<p>' + notif.message + '</p><small>' + notif.created_at + '</small>';
            notifList.appendChild(div);
        });
    } catch (err) { console.error(err); }
}

// ========================================
// SEARCH JOBS
// ========================================
async function searchJobs() {
    const term = document.getElementById('search-input') ? document.getElementById('search-input').value : '';
    const container = document.getElementById('jobs-list');
    container.innerHTML = 'Loading...';

    try {
        const jobs = await (await fetch(`${API_URL}/search-jobs?search=${term}`)).json();
        if (!jobs || jobs.length === 0) { 
            container.innerHTML = '<p class="empty-state">No jobs found</p>'; 
            return; 
        }

        container.innerHTML = '';
        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'job-card';
            
            let html = '<h4>' + job.title + '</h4>' +
                '<p><strong>Company:</strong> ' + job.company + '</p>' +
                '<p><strong>Location:</strong> ' + job.location + '</p>' +
                '<p><strong>Salary:</strong> ' + job.salary + '</p>' +
                '<p><strong>Description:</strong> ' + job.description + '</p>';
            
            if (currentUser.role === 'jobseeker') {
                const btn = document.createElement('button');
                btn.textContent = 'Apply for this Job';
                btn.style.background = '#28a745';
                btn.style.marginTop = '10px';
                btn.onclick = function() { applyForJob(job._id, job.title, job.company); };
                div.innerHTML = html;
                div.appendChild(btn);
            } else {
                div.innerHTML = html;
            }
            
            container.appendChild(div);
        });
    } catch (err) { container.innerHTML = 'Error loading jobs'; console.error(err); }
}

// ========================================
// APPLY FOR JOB
// ========================================
function applyForJob(jobId, jobTitle, company) {
    const modal = document.createElement('div');
    modal.id = 'apply-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:white;padding:30px;border-radius:12px;max-width:500px;width:90%;';
    
    const title = document.createElement('h3');
    title.textContent = 'Apply for ' + jobTitle;
    content.appendChild(title);
    
    const companyText = document.createElement('p');
    companyText.style.marginBottom = '15px';
    companyText.textContent = 'Company: ' + company;
    content.appendChild(companyText);
    
    const label = document.createElement('p');
    label.innerHTML = '<strong>Upload Resume (PDF only)*</strong>';
    content.appendChild(label);
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'apply-resume';
    fileInput.accept = '.pdf';
    fileInput.style.cssText = 'margin-bottom:20px;width:100%;padding:10px;border:2px dashed #667eea;';
    content.appendChild(fileInput);
    
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:10px;';
    
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    submitBtn.style.cssText = 'flex:1;background:#28a745;color:white;border:none;padding:12px;border-radius:8px;cursor:pointer;';
    submitBtn.onclick = function() { submitApplication(jobId, jobTitle, company); };
    btnContainer.appendChild(submitBtn);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'flex:1;background:#e74c3c;color:white;border:none;padding:12px;border-radius:8px;cursor:pointer;';
    cancelBtn.onclick = closeApplyModal;
    btnContainer.appendChild(cancelBtn);
    
    content.appendChild(btnContainer);
    
    const msgDiv = document.createElement('div');
    msgDiv.id = 'apply-message';
    msgDiv.style.marginTop = '15px';
    content.appendChild(msgDiv);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function closeApplyModal() { 
    const m = document.getElementById('apply-modal'); 
    if(m) m.remove(); 
}

async function submitApplication(jobId, jobTitle, company) {
    const fileInput = document.getElementById('apply-resume');
    const msgDiv = document.getElementById('apply-message');
    
    if (!fileInput.files[0]) { 
        msgDiv.innerHTML = '<p style="color:red;">Resume required</p>'; 
        return; 
    }
    
    const file = fileInput.files[0];
    if (file.type !== 'application/pdf') { 
        msgDiv.innerHTML = '<p style="color:red;">Only PDF allowed</p>'; 
        return; 
    }

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_id', jobId);
    formData.append('job_title', jobTitle);
    formData.append('company', company);
    formData.append('applicant_name', currentUser.name);
    formData.append('applicant_email', currentUser.email);

    msgDiv.innerHTML = '<p style="color:#667eea;">Submitting...</p>';
    
    try {
        const res = await fetch(`${API_URL}/apply-job`, { method:'POST', body:formData });
        const data = await res.json();
        if (res.ok) { 
            msgDiv.innerHTML = '<p style="color:green;">Submitted!</p>'; 
            setTimeout(function() {
                closeApplyModal(); 
                alert('Application submitted successfully!');
            }, 1500); 
        } else {
            msgDiv.innerHTML = '<p style="color:red;">' + data.error + '</p>';
        }
    } catch(e) { 
        msgDiv.innerHTML = '<p style="color:red;">Server error</p>'; 
        console.error(e);
    }
}

// ========================================
// POST JOB
// ========================================
async function postJob() {
    const title = document.getElementById('job-title').value.trim();
    const company = document.getElementById('job-company').value.trim();
    const location = document.getElementById('job-location').value.trim();
    const salary = document.getElementById('job-salary').value.trim();
    const description = document.getElementById('job-description').value.trim();
    const msgDiv = document.getElementById('post-job-message');
    
    if(!title || !company || !location || !salary || !description) { 
        msgDiv.innerHTML = 'Fill all fields!'; 
        msgDiv.style.color = 'red'; 
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/post-job`, {
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body:JSON.stringify({
                title, company, location, salary, description,
                employer_email: currentUser.email
            })
        });
        const data = await res.json();
        if(res.ok) {
            msgDiv.innerHTML = 'Job posted!';
            msgDiv.style.color = 'green';
            document.getElementById('job-title').value = '';
            document.getElementById('job-company').value = '';
            document.getElementById('job-location').value = '';
            document.getElementById('job-salary').value = '';
            document.getElementById('job-description').value = '';
            loadEmployerJobs();
            loadHomePage();
            setTimeout(function() { msgDiv.innerHTML = ''; }, 3000);
        } else { 
            msgDiv.innerHTML = data.error; 
            msgDiv.style.color = 'red';
        }
    } catch(e) { 
        msgDiv.innerHTML = 'Server error'; 
        msgDiv.style.color = 'red'; 
        console.error(e);
    }
}

// ========================================
// LOAD EMPLOYER JOBS
// ========================================
async function loadEmployerJobs() {
    const container = document.getElementById('my-jobs-list'); 
    container.innerHTML = 'Loading...';
    
    try {
        const jobs = await (await fetch(`${API_URL}/my-jobs?email=${currentUser.email}`)).json();
        if(!jobs || jobs.length === 0) { 
            container.innerHTML = '<p class="empty-state">No jobs posted yet</p>'; 
            return;
        }
        
        container.innerHTML = '';
        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'job-card';
            div.innerHTML = '<h4>' + job.title + '</h4>' +
                '<p><strong>Company:</strong> ' + job.company + '</p>' +
                '<p><strong>Location:</strong> ' + job.location + '</p>' +
                '<p><strong>Salary:</strong> ' + job.salary + '</p>' +
                '<p><strong>Description:</strong> ' + job.description + '</p>';
            
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display:flex;gap:10px;margin-top:10px;';
            
            const viewBtn = document.createElement('button');
            viewBtn.textContent = 'View Applicants';
            viewBtn.style.cssText = 'background:#667eea;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;';
            viewBtn.onclick = function() { viewApplicants(job._id); };
            btnContainer.appendChild(viewBtn);
            
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete Job';
            delBtn.style.cssText = 'background:#e74c3c;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;';
            delBtn.onclick = function() { deleteJob(job._id); };
            btnContainer.appendChild(delBtn);
            
            div.appendChild(btnContainer);
            container.appendChild(div);
        });
    } catch(e) {
        container.innerHTML = '<p style="color:red;">Error loading jobs</p>'; 
        console.error(e);
    }
}

// ========================================
// DELETE JOB
// ========================================
async function deleteJob(jobId) {
    if(!confirm('Delete this job?')) return;
    try {
        const res = await fetch(`${API_URL}/delete-job?job_id=${jobId}`, {method:'DELETE'});
        if(res.ok) { 
            alert('Deleted!'); 
            loadEmployerJobs(); 
            loadHomePage();
        } else { 
            alert('Could not delete'); 
        }
    } catch(e) { 
        alert('Server error'); 
        console.error(e);
    }
}

// ========================================
// VIEW APPLICANTS
// ========================================
async function viewApplicants(jobId) {
    const modal = document.createElement('div'); 
    modal.id = 'applicants-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:white;padding:30px;border-radius:12px;width:90%;max-width:600px;max-height:80%;overflow-y:auto;';
    
    const title = document.createElement('h3');
    title.style.marginBottom = '20px';
    title.textContent = 'Job Applicants';
    content.appendChild(title);
    
    const listDiv = document.createElement('div');
    listDiv.id = 'applicants-list';
    listDiv.textContent = 'Loading...';
    content.appendChild(listDiv);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'margin-top:20px;width:100%;padding:12px;background:#e74c3c;color:white;border:none;border-radius:8px;cursor:pointer;';
    closeBtn.onclick = closeApplicantsModal;
    content.appendChild(closeBtn);
    
    modal.appendChild(content);
    document.body.appendChild(modal);

    try {
        const apps = await (await fetch(`${API_URL}/job-applications?job_id=${jobId}`)).json();
        if(!apps || apps.length === 0) { 
            listDiv.innerHTML = '<p class="empty-state">No applicants yet</p>'; 
            return;
        }
        
        listDiv.innerHTML = '';
        apps.forEach(app => {
            const div = document.createElement('div'); 
            div.style.cssText = 'border:1px solid #ddd;padding:15px;margin-bottom:10px;border-radius:6px;background:#f9f9f9;';
            div.innerHTML = '<p style="margin-bottom:5px;"><strong>Name:</strong> ' + app.applicant_name + '</p>' +
                '<p style="margin-bottom:10px;"><strong>Email:</strong> ' + app.applicant_email + '</p>';
            
            const viewResumeBtn = document.createElement('button');
            viewResumeBtn.textContent = 'View Resume';
            viewResumeBtn.style.cssText = 'background:#667eea;color:white;padding:8px 15px;border:none;border-radius:4px;cursor:pointer;';
            viewResumeBtn.onclick = function() { viewResume(app.resume_url); };
            div.appendChild(viewResumeBtn);
            
            listDiv.appendChild(div);
        });
    } catch(e) {
        document.getElementById('applicants-list').innerHTML = '<p style="color:red;">Error loading applicants</p>';
        console.error(e);
    }
}

function closeApplicantsModal() { 
    const m = document.getElementById('applicants-modal'); 
    if(m) m.remove(); 
}

function viewResume(url) { 
    if(!url) { 
        alert('Resume not available'); 
        return;
    } 
    window.open(url, '_blank'); 
}

// ========================================
// NOTIFICATIONS
// ========================================
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    container.innerHTML = 'Loading...';
    
    try {
        const notifications = await (await fetch(`${API_URL}/notifications`)).json();
        const filtered = currentUser.role === 'employer'
            ? notifications.filter(n => n.message.includes('applied'))
            : notifications.filter(n => n.message.includes('New job posted'));
        
        if(!filtered || filtered.length === 0) { 
            container.innerHTML = '<p class="empty-state">No notifications yet</p>'; 
            return;
        }
        
        container.innerHTML = '';
        filtered.forEach(notif => {
            const div = document.createElement('div');
            div.className = 'notification';
            div.innerHTML = '<p>' + notif.message + '</p><small>' + notif.created_at + '</small>';
            container.appendChild(div);
        });
    } catch(e) { 
        container.innerHTML = '<p style="color:red;">Error loading notifications</p>'; 
        console.error(e);
    }
}

// ========================================
// RESUME REVIEW
// ========================================
async function reviewResume() {
    const fileInput = document.getElementById('resume-file');
    const jobRole = document.getElementById('job-role-select').value;
    const resultDiv = document.getElementById('resume-result');

    if (!fileInput.files[0]) {
        resultDiv.innerHTML = '<p style="color:red;">Please select a file!</p>';
        return;
    }
    if (!jobRole) {
        resultDiv.innerHTML = '<p style="color:red;">Please select a job role!</p>';
        return;
    }

    const formData = new FormData();
    formData.append('resume', fileInput.files[0]);
    formData.append('job_role', jobRole);
    resultDiv.innerHTML = '<p>Analyzing your resume...</p>';

    try {
        const response = await fetch(`${API_URL}/review-resume`, {method: 'POST', body: formData});
        const data = await response.json();
        if (response.ok) {
            let html = '<h4>Resume Score: ' + data.score + '/100</h4><div style="margin: 15px 0;">';
            data.feedback.forEach(f => {
                html += '<p>' + f + '</p>';
            });
            html += '</div>';
            if (data.found_keywords && data.found_keywords.length > 0) {
                html += '<p><strong>Found Skills:</strong> ' + data.found_keywords.join(', ') + '</p>';
            }
            if (data.missing_keywords && data.missing_keywords.length > 0) {
                html += '<p><strong>Missing Skills:</strong> ' + data.missing_keywords.join(', ') + '</p>';
            }
            resultDiv.innerHTML = html;
            
            // Clear the file input and job role after successful review
            fileInput.value = '';
            document.getElementById('job-role-select').value = '';
        } else {
            resultDiv.innerHTML = '<p style="color:red;">' + data.error + '</p>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<p style="color:red;">Server error!</p>';
        console.error(error);
    }
}

// ========================================
// PROFILE
// ========================================
function loadProfileData() {
    document.getElementById('profile-name-input').value = currentUser.name;
    document.getElementById('profile-email-input').value = currentUser.email;
    document.getElementById('profile-role-input').value = currentUser.role === 'jobseeker' ? 'Job Seeker' : 'Employer';

    const initial = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('profile-avatar').textContent = initial;
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-role-text').textContent = currentUser.role === 'jobseeker' ? 'Job Seeker' : 'Employer';
}

// ========================================
// EXPORT TO WINDOW
// ========================================
window.showLogin = showLogin;
window.showSignup = showSignup;
window.signup = signup;
window.login = login;
window.logout = logout;
window.showSection = showSection;
window.postJob = postJob;
window.searchJobs = searchJobs;
window.reviewResume = reviewResume;
window.deleteJob = deleteJob;
window.applyForJob = applyForJob;
window.closeApplyModal = closeApplyModal;
window.submitApplication = submitApplication;
window.viewApplicants = viewApplicants;
window.closeApplicantsModal = closeApplicantsModal;
window.viewResume = viewResume;

console.log('All functions loaded successfully!');