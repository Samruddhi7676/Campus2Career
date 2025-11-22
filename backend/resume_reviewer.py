# Resume Reviewer with PDF, DOC, DOCX, TXT Support

import PyPDF2
import docx
import os

def extract_text_from_pdf(filepath):
    """Extract text from PDF file"""
    text = ""
    try:
        with open(filepath, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text()
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_docx(filepath):
    """Extract text from DOCX file"""
    text = ""
    try:
        doc = docx.Document(filepath)
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
    except Exception as e:
        print(f"Error reading DOCX: {e}")
    return text

def extract_text_from_txt(filepath):
    """Extract text from TXT file"""
    text = ""
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            text = file.read()
    except Exception as e:
        print(f"Error reading TXT: {e}")
    return text

def extract_text_from_file(filepath):
    """Extract text based on file extension"""
    file_ext = filepath.rsplit('.', 1)[1].lower()
    
    if file_ext == 'pdf':
        return extract_text_from_pdf(filepath)
    elif file_ext in ['docx', 'doc']:
        return extract_text_from_docx(filepath)
    elif file_ext == 'txt':
        return extract_text_from_txt(filepath)
    else:
        return ""

# Job role specific keywords
JOB_ROLE_KEYWORDS = {
    'software-developer': {
        'required': ['python', 'java', 'javascript', 'c++', 'programming', 'algorithms', 'data structures', 'git', 'api', 'debugging'],
        'preferred': ['react', 'node', 'angular', 'vue', 'spring', 'django', 'flask', 'rest', 'microservices', 'testing', 'agile', 'scrum']
    },
    'data-scientist': {
        'required': ['python', 'r', 'statistics', 'machine learning', 'data analysis', 'sql', 'pandas', 'numpy'],
        'preferred': ['tensorflow', 'pytorch', 'scikit-learn', 'deep learning', 'nlp', 'visualization', 'tableau', 'power bi', 'jupyter', 'keras']
    },
    'web-developer': {
        'required': ['html', 'css', 'javascript', 'responsive', 'web', 'frontend', 'backend'],
        'preferred': ['react', 'angular', 'vue', 'node', 'express', 'mongodb', 'mysql', 'bootstrap', 'tailwind', 'webpack', 'typescript']
    },
    'mobile-developer': {
        'required': ['mobile', 'android', 'ios', 'app development', 'ui', 'ux'],
        'preferred': ['kotlin', 'swift', 'react native', 'flutter', 'java', 'objective-c', 'firebase', 'api', 'restful']
    },
    'devops-engineer': {
        'required': ['devops', 'ci/cd', 'docker', 'kubernetes', 'cloud', 'linux', 'automation'],
        'preferred': ['aws', 'azure', 'gcp', 'jenkins', 'terraform', 'ansible', 'monitoring', 'git', 'scripting', 'bash', 'python']
    },
    'ui-ux-designer': {
        'required': ['ui', 'ux', 'design', 'figma', 'adobe', 'wireframe', 'prototype'],
        'preferred': ['sketch', 'xd', 'photoshop', 'illustrator', 'user research', 'usability', 'responsive', 'mobile', 'web design']
    },
    'product-manager': {
        'required': ['product management', 'roadmap', 'stakeholder', 'agile', 'scrum', 'requirements'],
        'preferred': ['jira', 'confluence', 'user stories', 'metrics', 'analytics', 'strategy', 'prioritization', 'leadership']
    },
    'business-analyst': {
        'required': ['business analysis', 'requirements', 'stakeholder', 'documentation', 'sql', 'data analysis'],
        'preferred': ['excel', 'power bi', 'tableau', 'jira', 'process improvement', 'reporting', 'agile', 'uml']
    },
    'project-manager': {
        'required': ['project management', 'planning', 'scheduling', 'budget', 'stakeholder', 'leadership'],
        'preferred': ['pmp', 'agile', 'scrum', 'risk management', 'ms project', 'jira', 'communication', 'team management']
    },
    'qa-tester': {
        'required': ['testing', 'qa', 'quality assurance', 'test cases', 'bug', 'defect'],
        'preferred': ['automation', 'selenium', 'jira', 'test plan', 'manual testing', 'regression', 'api testing', 'performance']
    },
    'cybersecurity': {
        'required': ['security', 'cybersecurity', 'network', 'firewall', 'encryption', 'vulnerability'],
        'preferred': ['penetration testing', 'ethical hacking', 'cissp', 'ceh', 'threat analysis', 'incident response', 'siem']
    },
    'database-admin': {
        'required': ['database', 'sql', 'mysql', 'postgresql', 'oracle', 'backup', 'recovery'],
        'preferred': ['nosql', 'mongodb', 'performance tuning', 'indexing', 'query optimization', 'data modeling', 'replication']
    },
    'other': {
        'required': ['experience', 'skills', 'project', 'teamwork', 'communication'],
        'preferred': ['leadership', 'problem solving', 'collaboration', 'management', 'analytical']
    }
}

def get_keywords_for_role(job_role):
    """Get required and preferred keywords for a job role"""
    return JOB_ROLE_KEYWORDS.get(job_role, JOB_ROLE_KEYWORDS['other'])

def review_resume_file(filepath, job_role='other'):
    """
    Review resume file based on job role and give score out of 100
    Supports PDF, DOC, DOCX, TXT
    """
    # Extract text from file
    resume_text = extract_text_from_file(filepath)
    
    if not resume_text:
        return {
            'score': 0,
            'feedback': ['❌ Could not extract text from file. Please check file format.'],
            'found_keywords': [],
            'missing_keywords': []
        }
    
    # Get role-specific keywords
    role_keywords = get_keywords_for_role(job_role)
    required_keywords = role_keywords['required']
    preferred_keywords = role_keywords['preferred']
    
    # Convert to lowercase
    resume_lower = resume_text.lower()
    
    # Check for required keywords (5 points each)
    found_required = []
    missing_required = []
    required_score = 0
    
    for keyword in required_keywords:
        if keyword in resume_lower:
            found_required.append(keyword)
            required_score += 5
        else:
            missing_required.append(keyword)
    
    # Check for preferred keywords (2 points each)
    found_preferred = []
    missing_preferred = []
    preferred_score = 0
    
    for keyword in preferred_keywords:
        if keyword in resume_lower:
            found_preferred.append(keyword)
            preferred_score += 2
        else:
            missing_preferred.append(keyword)
    
    # Calculate total score
    total_score = min(required_score + preferred_score, 100)
    
    # Calculate match percentages
    required_match = (len(found_required) / len(required_keywords) * 100) if required_keywords else 0
    preferred_match = (len(found_preferred) / len(preferred_keywords) * 100) if preferred_keywords else 0
    
    # Generate feedback
    feedback = []
    
    if total_score >= 80:
        feedback.append("✅ Excellent Resume! You have strong qualifications for this role.")
    elif total_score >= 60:
        feedback.append("👍 Good Resume! You meet many requirements but can improve.")
    elif total_score >= 40:
        feedback.append("⚠️ Average Resume. Consider adding more relevant skills and experience.")
    else:
        feedback.append("❌ Needs Significant Improvement! Add more role-specific keywords and experience.")
    
    # Add detailed insights
    feedback.append(f"Required Skills Match: {required_match:.0f}% ({len(found_required)}/{len(required_keywords)})")
    feedback.append(f"Preferred Skills Match: {preferred_match:.0f}% ({len(found_preferred)}/{len(preferred_keywords)})")
    
    # Add specific suggestions
    if missing_required:
        feedback.append(f"💡 Critical: Add these required skills: {', '.join(missing_required[:5])}")
    
    if missing_preferred and total_score < 80:
        feedback.append(f"💡 Recommended: Consider adding: {', '.join(missing_preferred[:5])}")
    
    return {
        'score': total_score,
        'feedback': feedback,
        'found_keywords': found_required + found_preferred,
        'missing_keywords': missing_required[:10]  # Limit to top 10 missing
    }

# For backward compatibility - if text is passed directly
def review_resume(resume_text):
    """
    Review resume text and give score out of 100
    """
    good_keywords = [
        'python', 'java', 'react', 'django', 'mysql', 'mongodb',
        'communication', 'teamwork', 'leadership', 'project',
        'experience', 'intern', 'graduate', 'skills', 'certificate'
    ]
    
    resume_lower = resume_text.lower()
    score = 0
    feedback = []
    
    for keyword in good_keywords:
        if keyword in resume_lower:
            score += 5
            
    if score > 100:
        score = 100
    
    if score >= 80:
        feedback.append("✅ Excellent Resume! Well structured.")
    elif score >= 60:
        feedback.append("👍 Good Resume! Add more technical skills.")
    else:
        feedback.append("⚠️ Needs Improvement! Add more relevant keywords.")
    
    return {
        'score': score,
        'feedback': feedback
    }