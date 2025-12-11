// ========================================
// CONFIG
// ========================================
const API_URL = 'http://localhost:5000';
let currentUser = null;
console.log('Script loaded successfully');

// ========================================
// CUSTOM MODAL SYSTEM
// ========================================

// Custom Alert Modal
function showCustomAlert(message, type = 'info') {
    const existingModal = document.getElementById('custom-alert-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'custom-alert-modal';
    modal.className = 'custom-modal-overlay';
    
    const iconMap = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-icon">${iconMap[type] || iconMap.info}</div>
            <div class="custom-modal-message">${message}</div>
            <div class="custom-modal-buttons">
                <button class="custom-modal-btn custom-modal-btn-primary" onclick="closeCustomAlert()">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on clicking overlay
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeCustomAlert();
    });
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) modal.remove();
}

// Custom Confirm Modal
function showCustomConfirm(message, onConfirm, onCancel = null) {
    const existingModal = document.getElementById('custom-confirm-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'custom-confirm-modal';
    modal.className = 'custom-modal-overlay';
    
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-icon">❓</div>
            <div class="custom-modal-message">${message}</div>
            <div class="custom-modal-buttons">
                <button class="custom-modal-btn custom-modal-btn-success" id="confirm-yes">Yes</button>
                <button class="custom-modal-btn custom-modal-btn-secondary" id="confirm-no">No</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('confirm-yes').onclick = function() {
        closeCustomConfirm();
        if (onConfirm) onConfirm();
    };
    
    document.getElementById('confirm-no').onclick = function() {
        closeCustomConfirm();
        if (onCancel) onCancel();
    };
    
    // Close on clicking overlay
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeCustomConfirm();
            if (onCancel) onCancel();
        }
    });
}

function closeCustomConfirm() {
    const modal = document.getElementById('custom-confirm-modal');
    if (modal) modal.remove();
}

// Custom Toast Notification (auto-dismiss)
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast custom-toast-${type}`;
    
    const iconMap = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="custom-toast-icon">${iconMap[type] || iconMap.success}</div>
        <div class="custom-toast-message">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Override default alert and confirm (optional but recommended)
window.customAlert = showCustomAlert;
window.customConfirm = showCustomConfirm;
window.customToast = showToast;

// ========================================
// CHECK FOR SAVED SESSION ON PAGE LOAD
// ========================================
window.addEventListener('DOMContentLoaded', function() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
        // Always show home page first
        showSection('home');
    }
});

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
                // Save user to localStorage
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showDashboard();
                // Always show home page first
                showSection('home');
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
            // Save user to localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showDashboard();
            // Always show home page first
            showSection('home');
        } else {
            msgDiv.innerHTML = 'Invalid credentials!';
        }
    } catch (error) {
        msgDiv.innerHTML = 'Server error!';
        console.error(error);
    }
}

function logout() {
    showCustomConfirm('Are you sure you want to logout?', function() {
        currentUser = null;
        // Clear localStorage
        localStorage.removeItem('currentUser');
        
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('signup-name').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-role').value = '';
        document.getElementById('login-message').innerHTML = '';
        document.getElementById('signup-message').innerHTML = '';
        document.getElementById('dashboard-page').classList.remove('active');
        document.getElementById('auth-page').classList.add('active');
        
        // Remove mobile menu elements
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const overlay = document.querySelector('.sidebar-overlay');
        if (mobileToggle) mobileToggle.remove();
        if (overlay) overlay.remove();
        
        showLogin();
    });
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

    // Create mobile menu toggle
    createMobileMenuToggle();
    
    // Show logout button only on home page by default
    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach(btn => {
        btn.style.display = 'inline-block';
    });
    
    // Always load home page first
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

    // Show/Hide ALL logout buttons based on section
    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach(btn => {
        if (section === 'home' || section === 'profile') {
            btn.style.display = 'inline-block';
        } else {
            btn.style.display = 'none';
        }
    });

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
    
    // Close mobile menu when section changes (on mobile)
    if (window.innerWidth <= 768) {
        closeMobileMenu();
    }
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

        const notifications = await (await fetch(`${API_URL}/notifications?email=${currentUser.email}`)).json();
        document.getElementById('total-notifications').textContent = notifications.length;

        const notifList = document.getElementById('home-notifications-list');
        notifList.innerHTML = '';

        let homeNotifications;
        if (currentUser.role === 'jobseeker') {
            homeNotifications = notifications.filter(n => 
                ['selection', 'new_job'].includes(n.type)
             );
        } else {
            homeNotifications = notifications.filter(n => 
                ['applied'].includes(n.type)
            );
        }

        homeNotifications.slice(0, 5).forEach(notif => {
            const div = document.createElement('div');
            div.className = 'notification';
            if (notif.type === 'selection') div.classList.add('selection-notification');
            if (notif.type === 'rejection') div.style.background = '#f8d7da';
            if (notif.type === 'new_applicant') div.style.background = '#d1ecf1';
            if (notif.type === 'applied') div.style.background = '#d1ecf1';
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

function applyForJob(jobId, jobTitle, company) {
    const modal = document.createElement('div');
    modal.id = 'apply-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;overflow-y:auto;padding:20px;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:white;padding:30px;border-radius:12px;max-width:600px;width:90%;max-height:90vh;overflow-y:auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Apply for ' + jobTitle;
    title.style.marginBottom = '10px';
    content.appendChild(title);
    
    const companyText = document.createElement('p');
    companyText.style.marginBottom = '20px';
    companyText.style.color = '#666';
    companyText.textContent = 'Company: ' + company;
    content.appendChild(companyText);
    
    // Create form
    const form = document.createElement('div');
    
    // ===== COMPULSORY FIELDS =====
    const compulsoryTitle = document.createElement('h4');
    compulsoryTitle.textContent = '📋 Required Information';
    compulsoryTitle.style.cssText = 'color:#6b5b95;margin-bottom:15px;margin-top:10px;';
    form.appendChild(compulsoryTitle);
    
    // Education - Degree
    const degreeLabel = document.createElement('label');
    degreeLabel.innerHTML = '<strong>Degree *</strong>';
    degreeLabel.style.display = 'block';
    degreeLabel.style.marginBottom = '5px';
    form.appendChild(degreeLabel);
    
    const degreeInput = document.createElement('input');
    degreeInput.type = 'text';
    degreeInput.id = 'apply-degree';
    degreeInput.placeholder = 'e.g., B.Tech in Computer Science';
    degreeInput.style.cssText = 'width:100%;padding:10px;margin-bottom:15px;border:2px solid #ddd;border-radius:6px;';
    form.appendChild(degreeInput);
    
    // Education - Institution
    const institutionLabel = document.createElement('label');
    institutionLabel.innerHTML = '<strong>Institution *</strong>';
    institutionLabel.style.display = 'block';
    institutionLabel.style.marginBottom = '5px';
    form.appendChild(institutionLabel);
    
    const institutionInput = document.createElement('input');
    institutionInput.type = 'text';
    institutionInput.id = 'apply-institution';
    institutionInput.placeholder = 'e.g., ABC University';
    institutionInput.style.cssText = 'width:100%;padding:10px;margin-bottom:15px;border:2px solid #ddd;border-radius:6px;';
    form.appendChild(institutionInput);
    
    // Education - Year of Graduation
    const yearLabel = document.createElement('label');
    yearLabel.innerHTML = '<strong>Year of Graduation *</strong>';
    yearLabel.style.display = 'block';
    yearLabel.style.marginBottom = '5px';
    form.appendChild(yearLabel);
    
    const yearInput = document.createElement('input');
    yearInput.type = 'text';
    yearInput.id = 'apply-year';
    yearInput.placeholder = 'e.g., 2024';
    yearInput.style.cssText = 'width:100%;padding:10px;margin-bottom:15px;border:2px solid #ddd;border-radius:6px;';
    form.appendChild(yearInput);
    
    // Skills
    const skillsLabel = document.createElement('label');
    skillsLabel.innerHTML = '<strong>Skills (comma-separated) *</strong>';
    skillsLabel.style.display = 'block';
    skillsLabel.style.marginBottom = '5px';
    form.appendChild(skillsLabel);
    
    const skillsInput = document.createElement('textarea');
    skillsInput.id = 'apply-skills';
    skillsInput.placeholder = 'e.g., Python, JavaScript, React, Communication, Teamwork';
    skillsInput.rows = 3;
    skillsInput.style.cssText = 'width:100%;padding:10px;margin-bottom:15px;border:2px solid #ddd;border-radius:6px;resize:vertical;';
    form.appendChild(skillsInput);
    
    // Email
    const emailLabel = document.createElement('label');
    emailLabel.innerHTML = '<strong>Email ID *</strong>';
    emailLabel.style.display = 'block';
    emailLabel.style.marginBottom = '5px';
    form.appendChild(emailLabel);
    
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.id = 'apply-email';
    emailInput.value = currentUser.email;
    emailInput.placeholder = 'your.email@example.com';
    emailInput.style.cssText = 'width:100%;padding:10px;margin-bottom:15px;border:2px solid #ddd;border-radius:6px;';
    form.appendChild(emailInput);
    
    // Resume Upload
    const resumeLabel = document.createElement('label');
    resumeLabel.innerHTML = '<strong>Resume (PDF only) *</strong>';
    resumeLabel.style.display = 'block';
    resumeLabel.style.marginBottom = '5px';
    form.appendChild(resumeLabel);
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'apply-resume';
    fileInput.accept = '.pdf';
    fileInput.style.cssText = 'width:100%;padding:10px;margin-bottom:20px;border:2px dashed #667eea;border-radius:6px;';
    form.appendChild(fileInput);
    
    // ===== OPTIONAL FIELDS =====
    const optionalTitle = document.createElement('h4');
    optionalTitle.textContent = '✨ Optional (But Encouraged)';
    optionalTitle.style.cssText = 'color:#6b5b95;margin-bottom:15px;margin-top:20px;border-top:2px solid #f0f0f0;padding-top:20px;';
    form.appendChild(optionalTitle);
    
    // Certifications Upload
    const certLabel = document.createElement('label');
    certLabel.innerHTML = '<strong>Certifications (PDF/Word) - Multiple files allowed</strong>';
    certLabel.style.display = 'block';
    certLabel.style.marginBottom = '5px';
    form.appendChild(certLabel);
    
    const certInput = document.createElement('input');
    certInput.type = 'file';
    certInput.id = 'apply-certifications';
    certInput.accept = '.pdf,.doc,.docx';
    certInput.multiple = true; 
    certInput.style.cssText = 'width:100%;padding:10px;margin-bottom:15px;border:2px dashed #ddd;border-radius:6px;';
    form.appendChild(certInput);
    
    // ADD FILE COUNT DISPLAY - NEW CODE BLOCK
    const certCount = document.createElement('small');
    certCount.id = 'cert-count';
    certCount.style.cssText = 'color:#666;display:block;margin-bottom:15px;';
    form.appendChild(certCount);
    
    certInput.addEventListener('change', function() {
        const count = this.files.length;
        certCount.textContent = count > 0 ? `${count} file(s) selected` : '';
    });
    
    // Projects
    const projectsLabel = document.createElement('label');
    projectsLabel.innerHTML = '<strong>Projects</strong>';
    projectsLabel.style.display = 'block';
    projectsLabel.style.marginBottom = '5px';
    form.appendChild(projectsLabel);
    
    const projectsInput = document.createElement('textarea');
    projectsInput.id = 'apply-projects';
    projectsInput.placeholder = 'Describe your key projects (optional)';
    projectsInput.rows = 3;
    projectsInput.style.cssText = 'width:100%;padding:10px;margin-bottom:15px;border:2px solid #ddd;border-radius:6px;resize:vertical;';
    form.appendChild(projectsInput);
    
    // LinkedIn/Portfolio URL
    const urlLabel = document.createElement('label');
    urlLabel.innerHTML = '<strong>LinkedIn/Portfolio URL</strong>';
    urlLabel.style.display = 'block';
    urlLabel.style.marginBottom = '5px';
    form.appendChild(urlLabel);
    
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.id = 'apply-url';
    urlInput.placeholder = 'https://linkedin.com/in/yourprofile';
    urlInput.style.cssText = 'width:100%;padding:10px;margin-bottom:20px;border:2px solid #ddd;border-radius:6px;';
    form.appendChild(urlInput);
    
    content.appendChild(form);
    
    // Buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:10px;margin-top:20px;';
    
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit Application';
    submitBtn.style.cssText = 'flex:1;background:#28a745;color:white;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:600;';
    submitBtn.onclick = function() { submitApplication(jobId, jobTitle, company); };
    btnContainer.appendChild(submitBtn);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'flex:1;background:#e74c3c;color:white;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:600;';
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
    const msgDiv = document.getElementById('apply-message');
    
    // Get all form values
    const degree = document.getElementById('apply-degree').value.trim();
    const institution = document.getElementById('apply-institution').value.trim();
    const year = document.getElementById('apply-year').value.trim();
    const skills = document.getElementById('apply-skills').value.trim();
    const email = document.getElementById('apply-email').value.trim();
    const resumeFile = document.getElementById('apply-resume').files[0];
    
    // Optional fields
    const certFiles = document.getElementById('apply-certifications').files; // ⭐ CHANGED: Get ALL files
    const projects = document.getElementById('apply-projects').value.trim();
    const url = document.getElementById('apply-url').value.trim();
    
    // Validate required fields
    if (!degree || !institution || !year || !skills || !email || !resumeFile) {
        msgDiv.innerHTML = '<p style="color:red;">❌ Please fill all required fields!</p>';
        return;
    }
    
    // Validate resume file type
    if (resumeFile.type !== 'application/pdf') {
        msgDiv.innerHTML = '<p style="color:red;">❌ Resume must be a PDF file!</p>';
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        msgDiv.innerHTML = '<p style="color:red;">❌ Please enter a valid email address!</p>';
        return;
    }
    
    // Validate year format
    const yearRegex = /^\d{4}$/;
    if (!yearRegex.test(year)) {
        msgDiv.innerHTML = '<p style="color:red;">❌ Please enter a valid 4-digit year!</p>';
        return;
    }
    
    // Validate certification file type if provided
    // ⭐ CHANGED: Validate ALL certification files if provided
    if (certFiles.length > 0) {
        const validCertTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        for (let i = 0; i < certFiles.length; i++) {
            if (!validCertTypes.includes(certFiles[i].type)) {
                msgDiv.innerHTML = '<p style="color:red;">❌ All certifications must be PDF or Word files!</p>';
                return;
            }
        }
        
        // Check file size limit (5MB per file)
        for (let i = 0; i < certFiles.length; i++) {
            if (certFiles[i].size > 5 * 1024 * 1024) {
                msgDiv.innerHTML = '<p style="color:red;">❌ Each certificate file must be under 5MB!</p>';
                return;
            }
        }
    }
 
    // Create FormData
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('job_id', jobId);
    formData.append('job_title', jobTitle);
    formData.append('company', company);
    formData.append('applicant_name', currentUser.name);
    formData.append('applicant_email', email);
    
    // Add required fields
    formData.append('degree', degree);
    formData.append('institution', institution);
    formData.append('year', year);
    formData.append('skills', skills);
    
    // Add optional fields if provided
    if (certFiles.length > 0) {
        for (let i = 0; i < certFiles.length; i++) {
            formData.append('certifications', certFiles[i]);
        }
    }
    
    if (projects) {
        formData.append('projects', projects);
    }
    if (url) {
        formData.append('portfolio_url', url);
    }

    msgDiv.innerHTML = '<p style="color:#667eea;">📤 Submitting your application...</p>';
    
    try {
        const res = await fetch(`${API_URL}/apply-job`, { method:'POST', body:formData });
        const data = await res.json();
        
        if (res.ok) {
            msgDiv.innerHTML = '<p style="color:green;">✅ Application submitted successfully!</p>';
            setTimeout(function() {
                closeApplyModal();
                showToast('Application submitted successfully!', 'success');
            }, 1500);
        } else {
            msgDiv.innerHTML = '<p style="color:red;">❌ ' + data.error + '</p>';
        }
    } catch(e) {
        msgDiv.innerHTML = '<p style="color:red;">❌ Server error occurred</p>';
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
    const companyEmail = document.getElementById('job-company-email').value.trim();
    const description = document.getElementById('job-description').value.trim();
    const msgDiv = document.getElementById('post-job-message');
    
    if(!title || !company || !location || !salary || !companyEmail || !description) { 
        msgDiv.innerHTML = 'Fill all fields!'; 
        msgDiv.style.color = 'red'; 
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
        msgDiv.innerHTML = 'Please enter a valid company email!';
        msgDiv.style.color = 'red';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/post-job`, {
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body:JSON.stringify({
                title, company, location, salary, description,
                company_email: companyEmail,
                employer_email: currentUser.email
            })
        });
        const data = await res.json();
        
        // ⭐ CHANGE IS HERE - Added setTimeout with 500ms delay
        if(res.ok) {
            msgDiv.innerHTML = 'Job posted!';
            msgDiv.style.color = 'green';
            document.getElementById('job-title').value = '';
            document.getElementById('job-company').value = '';
            document.getElementById('job-location').value = '';
            document.getElementById('job-salary').value = '';
            document.getElementById('job-company-email').value = '';
            document.getElementById('job-description').value = '';
            
            // ⭐ NEW CODE: Add delay to ensure database update is complete
            setTimeout(function() {
                loadEmployerJobs();
                loadHomePage();
            }, 500);
            
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
// DELETE JOB
// ========================================
async function deleteJob(jobId) {
    showCustomConfirm('Are you sure you want to delete this job?', async function() {
        try {
            const res = await fetch(`${API_URL}/delete-job?job_id=${jobId}`, {method:'DELETE'});
            if(res.ok) { 
                showToast('Job deleted successfully!', 'success');
                loadEmployerJobs(); 
                loadHomePage();
            } else { 
                showCustomAlert('Could not delete job', 'error');
            }
        } catch(e) { 
            showCustomAlert('Server error occurred', 'error');
            console.error(e);
        }
    });
}

// ========================================
// VIEW APPLICANTS
// ========================================
async function viewApplicants(jobId) {
    const modal = document.createElement('div'); 
    modal.id = 'applicants-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;overflow-y:auto;padding:20px;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:white;padding:30px;border-radius:12px;width:90%;max-width:900px;max-height:85vh;overflow-y:auto;';
    
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
    closeBtn.style.cssText = 'margin-top:20px;width:100%;padding:12px;background:#e74c3c;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;';
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
            div.style.cssText = 'border:1px solid #ddd;padding:20px;margin-bottom:15px;border-radius:8px;background:#f9f9f9;';
            
            let statusBadge = '';
            if (app.status === 'selected') {
                statusBadge = '<span style="background:#28a745;color:white;padding:5px 12px;border-radius:4px;font-size:0.85em;margin-left:10px;">✓ Selected</span>';
            }
            
            // Basic Info
            let html = `
                <div style="margin-bottom:15px;border-bottom:2px solid #e0e0e0;padding-bottom:15px;">
                    <p style="margin-bottom:8px;font-size:1.1em;">
                        <strong>👤 Name:</strong> ${app.applicant_name} ${statusBadge}
                    </p>
                    <p style="margin-bottom:8px;">
                        <strong>📧 Email:</strong> ${app.applicant_email}
                    </p>
                </div>
            `;
            
            // Education Section
            if (app.education) {
                html += `
                    <div style="margin-bottom:15px;padding:12px;background:#e8f5e9;border-radius:6px;">
                        <p style="margin-bottom:5px;font-weight:600;color:#2e7d32;">🎓 Education</p>
                        <p style="margin-bottom:3px;"><strong>Degree:</strong> ${app.education.degree}</p>
                        <p style="margin-bottom:3px;"><strong>Institution:</strong> ${app.education.institution}</p>
                        <p><strong>Year:</strong> ${app.education.year}</p>
                    </div>
                `;
            }
            
            // Skills Section
            if (app.skills) {
                html += `
                    <div style="margin-bottom:15px;padding:12px;background:#e3f2fd;border-radius:6px;">
                        <p style="margin-bottom:5px;font-weight:600;color:#1976d2;">💼 Skills</p>
                        <p>${app.skills}</p>
                    </div>
                `;
            }
            
            // Projects Section (if provided)
            if (app.projects) {
                html += `
                    <div style="margin-bottom:15px;padding:12px;background:#fff3e0;border-radius:6px;">
                        <p style="margin-bottom:5px;font-weight:600;color:#f57c00;">🚀 Projects</p>
                        <p style="white-space:pre-wrap;">${app.projects}</p>
                    </div>
                `;
            }
            
            // Portfolio URL (if provided)
            if (app.portfolio_url) {
                html += `
                    <div style="margin-bottom:15px;padding:12px;background:#f3e5f5;border-radius:6px;">
                        <p style="margin-bottom:5px;font-weight:600;color:#7b1fa2;">🔗 Portfolio/LinkedIn</p>
                        <p><a href="${app.portfolio_url}" target="_blank" style="color:#667eea;text-decoration:none;font-weight:600;">${app.portfolio_url}</a></p>
                    </div>
                `;
            }
            
            div.innerHTML = html;
            
            // Action Buttons
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display:flex;gap:10px;margin-top:15px;flex-wrap:wrap;';
            
            // View Resume Button
            const viewResumeBtn = document.createElement('button');
            viewResumeBtn.textContent = '📄 View Resume';
            viewResumeBtn.style.cssText = 'background:#667eea;color:white;padding:10px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600;flex:1;min-width:140px;';
            viewResumeBtn.onclick = function() { viewResume(app.resume_url); };
            btnContainer.appendChild(viewResumeBtn);
            
            // View Certifications Button (if exists)
            if (app.certifications_urls && app.certifications_urls.length > 0) {
                app.certifications_urls.forEach((url, index) => {
                    const viewCertBtn = document.createElement('button');
                    viewCertBtn.textContent = `🏆 Certificate ${index + 1}`;
                    viewCertBtn.style.cssText = 'background:#8775ad;color:white;padding:10px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600;flex:1;min-width:140px;';
                    viewCertBtn.onclick = function() { viewResume(url); };
                    btnContainer.appendChild(viewCertBtn);
                });
            }
            
            // Select Applicant Button
            if (app.status !== 'selected') {
                const selectBtn = document.createElement('button');
                selectBtn.textContent = '✅ Select Applicant';
                selectBtn.style.cssText = 'background:#28a745;color:white;padding:10px 18px;border:none;border-radius:6px;cursor:pointer;font-weight:600;flex:1;min-width:140px;';
                selectBtn.onclick = function() { selectApplicant(app._id, app.applicant_name); };
                btnContainer.appendChild(selectBtn);
            }
            
            div.appendChild(btnContainer);
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
        showCustomAlert('Resume not available', 'warning');
        return;
    } 
    window.open(url, '_blank'); 
}

// ========================================
// SELECT APPLICANT 
// ========================================
async function selectApplicant(applicationId, applicantName) {
    showCustomConfirm(`Select ${applicantName} for this position?`, async function() {
        try {
            const res = await fetch(`${API_URL}/select-applicant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ application_id: applicationId })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                showToast(`${applicantName} has been selected! They will receive a notification.`, 'success');
                closeApplicantsModal();
            } else {
                showCustomAlert('Error: ' + data.error, 'error');
            }
        } catch (e) {
            showCustomAlert('Server error occurred', 'error');
            console.error(e);
        }
    });
}

// ========================================
// NOTIFICATIONS
// ========================================
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    container.innerHTML = 'Loading...';
    
    try {
        const notifications = await (await fetch(`${API_URL}/notifications?email=${currentUser.email}`)).json();
        if(!notifications || notifications.length === 0) { 
            container.innerHTML = '<p class="empty-state">No notifications yet</p>'; 
            return;
        }

        let filteredNotifications;
        if (currentUser.role === 'jobseeker') {
            filteredNotifications = notifications.filter(n => 
                ['selection', 'new_job'].includes(n.type)
            );
        } else {
            filteredNotifications = notifications.filter(n => 
                ['applied'].includes(n.type)
            );
        }

        if(filteredNotifications.length === 0) {
            container.innerHTML = '<p class="empty-state">No notifications for your role</p>';
            return;
        }

        container.innerHTML = '';
        filteredNotifications.forEach(notif => {
            const div = document.createElement('div');
            div.className = 'notification';
            if (notif.type === 'selection') div.classList.add('selection-notification');
            if (notif.type === 'rejection') div.style.background = '#f8d7da';
            if (notif.type === 'new_applicant') div.style.background = '#d1ecf1';
            if (notif.type === 'applied') div.style.background = '#d1ecf1';
            if (notif.type === 'new_job') div.style.background = '#fff3cd';
            div.innerHTML = '<p>' + notif.message + '</p><small>' + notif.created_at + '</small>';
            container.appendChild(div);
        });
    } catch(e) { 
        container.innerHTML = '<p style="color:red;">Error loading notifications</p>'; 
        console.error(e);
    }
}

// ========================================
// DELETE NOTIFICATION
// ========================================
async function deleteNotification(notificationId) {
    showCustomConfirm('Delete this notification?', async function() {
        try {
            const res = await fetch(`${API_URL}/delete-notification?notification_id=${notificationId}`, {
                method: 'DELETE'
            });
            
            if(res.ok) {
                showToast('Notification deleted', 'success');
                loadNotifications();
                loadHomePage();
            } else {
                showCustomAlert('Could not delete notification', 'error');
            }
        } catch(e) {
            showCustomAlert('Server error occurred', 'error');
            console.error(e);
        }
    });
}

// Update the loadNotifications function to include delete buttons
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    container.innerHTML = 'Loading...';
    
    try {
        const notifications = await (await fetch(`${API_URL}/notifications?email=${currentUser.email}`)).json();
        if(!notifications || notifications.length === 0) { 
            container.innerHTML = '<p class="empty-state">No notifications yet</p>'; 
            return;
        }

        let filteredNotifications;
        if (currentUser.role === 'jobseeker') {
            filteredNotifications = notifications.filter(n => 
                ['selection', 'new_job'].includes(n.type)
            );
        } else {
            filteredNotifications = notifications.filter(n => 
                ['applied'].includes(n.type)
            );
        }

        if(filteredNotifications.length === 0) {
            container.innerHTML = '<p class="empty-state">No notifications for your role</p>';
            return;
        }

        container.innerHTML = '';
        filteredNotifications.forEach(notif => {
            const div = document.createElement('div');
            div.className = 'notification';
            div.style.position = 'relative';
            div.style.paddingRight = '40px';
            
            if (notif.type === 'selection') div.classList.add('selection-notification');
            if (notif.type === 'rejection') div.style.background = '#f8d7da';
            if (notif.type === 'new_applicant') div.style.background = '#d1ecf1';
            if (notif.type === 'applied') div.style.background = '#d1ecf1';
            if (notif.type === 'new_job') div.style.background = '#fff3cd';
            
            div.innerHTML = '<p>' + notif.message + '</p><small>' + notif.created_at + '</small>';
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '✕';
            deleteBtn.className = 'notification-delete-btn';
            deleteBtn.onclick = function() { deleteNotification(notif._id); };
            div.appendChild(deleteBtn);
            
            container.appendChild(div);
        });
    } catch(e) { 
        container.innerHTML = '<p style="color:red;">Error loading notifications</p>'; 
        console.error(e);
    }
}

// Update loadHomePage function to add delete buttons to home notifications
async function loadHomePage() {
    try {
        const jobs = await (await fetch(`${API_URL}/search-jobs?search=`)).json();
        document.getElementById('total-jobs').textContent = jobs.length;
        document.getElementById('new-jobs').textContent = Math.min(jobs.length, 5);

        // ⭐ ONLY SHOW JOBS FOR JOB SEEKERS
        const homeJobsCard = document.getElementById('home-jobs-card');
        const homeJobsList = document.getElementById('home-jobs-list');
        
        if (currentUser.role === 'jobseeker') {
            // Show jobs card for job seekers
            if (homeJobsCard) homeJobsCard.style.display = 'block';
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
        } else {
            // Hide jobs card for employers
            if (homeJobsCard) homeJobsCard.style.display = 'none';
        }

        const notifications = await (await fetch(`${API_URL}/notifications?email=${currentUser.email}`)).json();
        document.getElementById('total-notifications').textContent = notifications.length;

        const notifList = document.getElementById('home-notifications-list');
        notifList.innerHTML = '';

        let homeNotifications;
        if (currentUser.role === 'jobseeker') {
            homeNotifications = notifications.filter(n => 
                ['selection', 'new_job'].includes(n.type)
             );
        } else {
            homeNotifications = notifications.filter(n => 
                ['applied'].includes(n.type)
            );
        }

        homeNotifications.slice(0, 5).forEach(notif => {
            const div = document.createElement('div');
            div.className = 'notification';
            div.style.position = 'relative';
            div.style.paddingRight = '40px';
            
            if (notif.type === 'selection') div.classList.add('selection-notification');
            if (notif.type === 'rejection') div.style.background = '#f8d7da';
            if (notif.type === 'new_applicant') div.style.background = '#d1ecf1';
            if (notif.type === 'applied') div.style.background = '#d1ecf1';
            
            div.innerHTML = '<p>' + notif.message + '</p><small>' + notif.created_at + '</small>';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '✕';
            deleteBtn.className = 'notification-delete-btn';
            deleteBtn.onclick = function() { deleteNotification(notif._id); };
            div.appendChild(deleteBtn);
            
            notifList.appendChild(div);
        });
    } catch (err) { console.error(err); }
}

// Export the new function
window.deleteNotification = deleteNotification;

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

async function loadEmployerJobs() {
    const container = document.getElementById('my-jobs-list');
    if (!container) return;

    container.innerHTML = 'Loading...';
    try {
        const jobs = await (await fetch(`${API_URL}/my-jobs?email=${currentUser.email}`)).json();
        if (!jobs || jobs.length === 0) {
            container.innerHTML = '<p class="empty-state">No jobs posted yet</p>';
            return;
        }

        container.innerHTML = '';
        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'job-card';
            div.innerHTML = `<h4>${job.title}</h4>
                             <p><strong>Company:</strong> ${job.company}</p>
                             <p><strong>Location:</strong> ${job.location}</p>
                             <p><strong>Salary:</strong> ${job.salary}</p>
                             <p><strong>Description:</strong> ${job.description}</p>`;

            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display:flex;gap:10px;margin-top:10px;';

            const viewApplicantsBtn = document.createElement('button');
            viewApplicantsBtn.textContent = 'View Applicants';
            viewApplicantsBtn.style.cssText = 'background:#667eea;color:white;padding:8px 15px;border:none;border-radius:4px;cursor:pointer;';
            viewApplicantsBtn.onclick = () => viewApplicants(job._id);
            btnContainer.appendChild(viewApplicantsBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.cssText = 'background:#e74c3c;color:white;padding:8px 15px;border:none;border-radius:4px;cursor:pointer;';
            deleteBtn.onclick = () => deleteJob(job._id);
            btnContainer.appendChild(deleteBtn);

            div.appendChild(btnContainer);
            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = '<p style="color:red;">Error loading jobs</p>';
        console.error(err);
    }
}

// ========================================
// MOBILE MENU TOGGLE
// ========================================

// Create mobile menu toggle button
function createMobileMenuToggle() {
    // Check if button already exists
    if (document.querySelector('.mobile-menu-toggle')) return;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-menu-toggle';
    toggleBtn.innerHTML = '☰';
    toggleBtn.onclick = toggleMobileMenu;
    document.body.appendChild(toggleBtn);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = closeMobileMenu;
    document.body.appendChild(overlay);
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    
    if (sidebar.classList.contains('mobile-active')) {
        closeMobileMenu();
    } else {
        sidebar.classList.add('mobile-active');
        overlay.classList.add('active');
        toggleBtn.innerHTML = '✕';
    }
}

function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    
    sidebar.classList.remove('mobile-active');
    overlay.classList.remove('active');
    if (toggleBtn) toggleBtn.innerHTML = '☰';
}

// Handle window resize
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        if (window.innerWidth > 768) {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar) sidebar.classList.remove('mobile-active');
            if (overlay) overlay.classList.remove('active');
        }
    }, 250);
});

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
window.selectApplicant = selectApplicant;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.loadEmployerJobs = loadEmployerJobs;

console.log('All functions loaded successfully including mobile menu!');