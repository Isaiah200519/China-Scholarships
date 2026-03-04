// ===== SCHOLARSHIP APPLICATION FORM JAVASCRIPT =====

let currentStep = 1;
const totalSteps = 1;
let uploadedFiles = {
    passport: [],
    transcript: [],
    diploma: [],
    english: [],
    recommendation: []
};

// Initialize the form
document.addEventListener('DOMContentLoaded', function () {
    // LocalStorage persistence for application form
    const form = document.getElementById('applicationForm');
    const formKey = 'applicationFormData';
    if (form) {
        // Restore saved values
        const saved = localStorage.getItem(formKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.keys(data).forEach(id => {
                    const el = form.querySelector(`[name="${id}"]`) || document.getElementById(id);
                    if (el && el.type !== 'file') el.value = data[id];
                });
            } catch (e) { }
        }
        // Save values on change
        form.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'file') return;
            input.addEventListener('input', function () {
                const formData = {};
                form.querySelectorAll('input, select, textarea').forEach(i => {
                    if (i.type !== 'file') formData[i.name || i.id] = i.value;
                });
                localStorage.setItem(formKey, JSON.stringify(formData));
            });
        });
    }
    initForm();
    addFormValidation();
    setupFormSubmit();
});

function initForm() {
    updateProgress();
    updateStepDisplay();
}

/**
 * Add real-time field validation to all form fields
 */
function addFormValidation() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    // Get all form inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        // Clear error on input/focus
        input.addEventListener('input', function () {
            clearFieldError(this);
        });

        input.addEventListener('focus', function () {
            clearFieldError(this);
        });

        // Validate on blur for better UX
        input.addEventListener('blur', function () {
            validateField(this);
        });
    });
}

/**
 * Setup form submit handler
 */
function setupFormSubmit() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate all required fields
        if (!validateAllFields()) {
            return;
        }

        // Check terms agreement
        if (!document.getElementById('terms').checked) {
            showFormError('Please agree to Terms & Conditions');
            return;
        }

        if (!document.getElementById('information').checked) {
            showFormError('Please confirm that all information is accurate');
            return;
        }

        // Collect form data
        const formData = collectFormData();

        // Basic password checks (we added password fields to the form)
        const password = formData.password || '';
        const confirm = formData.confirmPassword || '';
        if (!password || password.length < 6) {
            showFormError('Please choose a password with at least 6 characters');
            return;
        }
        if (password !== confirm) {
            showFormError('Passwords do not match');
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            await waitForFirebase();
            // ...existing code for registration and application...
            // Split full name into first/last
            const fullName = formData.fullName || '';
            const nameParts = fullName.trim().split(/\s+/);
            const firstName = nameParts.shift() || '';
            const lastName = nameParts.join(' ') || '';
            const userData = {
                firstName,
                lastName,
                phone: formData.whatsapp || formData.phone || '',
                country: formData.nationality || ''
            };
            // Register Auth user and create users/{uid}
            const reg = await registerUserWithRole(formData.email, password, userData, USER_ROLES.STUDENT, null);
            if (!reg.success) {
                showFormError(reg.error || 'Failed to create account');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }
            // Create scholarship application linked to the newly created user
            const appPayload = {
                ...formData,
                uploadedFiles,
                timestamp: new Date().toISOString()
            };
            const appResult = await createScholarshipApplication(appPayload);
            if (appResult.success) {
                // Clear form fields and localStorage
                form.reset();
                localStorage.removeItem(formKey);
                showSuccessMessage(appResult.applicationId || '');
                // Show confirmation for 5 seconds, then hide form
                setTimeout(() => {
                    form.style.display = 'none';
                }, 5000);
            } else {
                showFormError(appResult.error || 'Failed to create application.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        } catch (error) {
            console.error('Application submission error:', error);
            showFormError('An error occurred while submitting your application. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
}

/**
 * Validate a single field
 */
function validateField(field) {
    const name = field.name;
    const value = field.value.trim();
    let error = null;

    if (field.hasAttribute('required') && !value) {
        error = `${field.previousElementSibling?.textContent || name} is required`;
    } else {
        switch (name) {
            case 'fullName':
                if (value && !/^[a-zA-Z\s'-]{2,}$/.test(value)) {
                    error = 'Full name can only contain letters, spaces, hyphens, and apostrophes';
                }
                break;
            case 'email':
                if (value && !isValidEmail(value)) {
                    error = 'Please enter a valid email address';
                }
                break;
            case 'phone':
            case 'whatsapp':
                if (value && !/^[\d\s\-\+\(\)]{7,}$/.test(value)) {
                    error = 'Please enter a valid phone/WhatsApp number';
                }
                break;
            case 'dob':
                if (value) {
                    const age = calculateAge(new Date(value));
                    if (age < 16) {
                        error = 'You must be at least 16 years old';
                    }
                    if (age > 100) {
                        error = 'Please enter a valid date of birth';
                    }
                }
                break;
            case 'passport':
                if (value && value.length < 5) {
                    error = 'Please enter a valid passport number';
                }
                break;
            case 'gpa':
                if (value && !/^\d+(\.\d{1,2})?(\/?[0-9]+)?$/.test(value)) {
                    error = 'Please enter a valid GPA (e.g., 3.5/4.0 or 85%)';
                }
                break;
            case 'sop':
                if (value && value.length < 100) {
                    error = 'Statement of Purpose must be at least 100 words';
                }
                break;
        }
    }

    if (error) {
        showFieldError(field, error);
        return false;
    } else {
        clearFieldError(field);
        return true;
    }
}

/**
 * Validate all form fields in current step
 */
function validateAllFields() {
    const currentStepDiv = document.getElementById(`formStep${currentStep}`);
    if (!currentStepDiv) return true;

    const inputs = currentStepDiv.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });

    return isValid;
}

/**
 * Show field error
 */
function showFieldError(field, message) {
    field.classList.add('error-field');
    let errorElement = field.parentElement.querySelector('.field-error-message');

    if (!errorElement) {
        errorElement = document.createElement('small');
        errorElement.className = 'field-error-message';
        field.parentElement.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

/**
 * Clear field error
 */
function clearFieldError(field) {
    field.classList.remove('error-field');
    const errorElement = field.parentElement.querySelector('.field-error-message');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

/**
 * Show form-level error message
 */
function showFormError(message) {
    let errorBox = document.getElementById('formErrorMessage');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'formErrorMessage';
        errorBox.className = 'alert alert-error';
        errorBox.style.marginBottom = '20px';
        const container = document.querySelector('.form-card') || document.querySelector('.agent-container') || document.body;
        const referenceNode = document.querySelector('.form-step') || container.firstElementChild;
        try {
            if (referenceNode && container.contains(referenceNode)) {
                container.insertBefore(errorBox, referenceNode);
            } else {
                container.insertBefore(errorBox, container.firstElementChild);
            }
        } catch (e) {
            // Fallback: append to body
            document.body.appendChild(errorBox);
        }
    }

    errorBox.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <i class="fas fa-times-circle" style="flex-shrink: 0; margin-top: 2px; font-size: 18px;"></i>
            <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 2px;">${message}</strong>
            </div>
        </div>
    `;
    errorBox.style.display = 'block';

    // Auto-scroll to error
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorBox.style.display === 'block') {
            errorBox.style.display = 'none';
        }
    }, 5000);
}

/**
 * Collect all form data
 */
function collectFormData() {
    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    const data = {
        timestamp: new Date().toISOString(),
        status: 'pending',
        uploadedFiles: uploadedFiles
    };

    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    return data;
}

/**
 * Submit application to Firebase
 */
async function submitApplicationToFirebase(applicationData) {
    try {
        // Wait for Firebase to be initialized
        await waitForFirebase();

        const db = firebase.firestore();

        // Check if email already exists in `users` collection
        const existingEmail = await db.collection('users').where('email', '==', applicationData.email).get();

        if (!existingEmail.empty) {
            return {
                success: false,
                error: 'An application with this email address already exists. Please use a different email address.'
            };
        }

        // Add user document to `users` collection (lightweight applicant record)
        const userDoc = {
            ...applicationData,
            userId: 'USR-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Use the generated userId as the document ID for easier lookup
        const docId = userDoc.userId;
        await db.collection('users').doc(docId).set(userDoc);

        return {
            success: true,
            applicationId: docId
        };
    } catch (error) {
        console.error('Firebase submission error:', error);
        return {
            success: false,
            error: error.message || 'Failed to submit application'
        };
    }
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
    let toast = document.getElementById('applicationToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'applicationToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--secondary);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            animation: slideUp 0.3s ease;
            max-width: 90%;
            text-align: center;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

/**
 * Reset application form for new submission
 */
function resetApplicationForm() {
    const successDiv = document.getElementById('successMessage');
    const formCard = document.querySelector('.form-card');
    const form = document.getElementById('applicationForm');

    if (successDiv) {
        successDiv.style.display = 'none';
    }

    if (formCard) {
        formCard.style.display = 'block';
    }

    if (form) {
        form.reset();
        form.style.display = 'block';
    }

    currentStep = 1;
    updateProgress();
    updateStepDisplay();

    const errorMessages = document.querySelectorAll('.field-error-message');
    errorMessages.forEach(err => err.style.display = 'none');

    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Show success message
 */
function showSuccessMessage(applicationId) {
    const successDiv = document.getElementById('successMessage');
    const formCard = document.querySelector('.form-card');

    showToast('✓ Application submitted successfully!', 4000);

    const form = document.getElementById('applicationForm');
    if (form) {
        form.reset();
    }

    document.getElementById('applicationId').textContent = applicationId;

    if (successDiv) {
        if (formCard) {
            formCard.style.display = 'none';
        }

        successDiv.style.display = 'block';
        successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Handle file uploads
 */
function handleFileUpload(input, type) {
    const file = input.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showFormError(`File size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        input.value = '';
        return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        showFormError('Only PDF, JPG, and PNG files are allowed');
        input.value = '';
        return;
    }

    if (!uploadedFiles[type]) {
        uploadedFiles[type] = [];
    }

    uploadedFiles[type].push({
        name: file.name,
        size: file.size,
        type: file.type
    });

    // Display uploaded file
    displayUploadedFile(type, file);
}

/**
 * Display uploaded file in UI
 */
function displayUploadedFile(type, file) {
    const container = document.getElementById(`${type}Files`);
    if (!container) return;

    const fileDiv = document.createElement('div');
    fileDiv.className = 'uploaded-file';
    fileDiv.innerHTML = `
        <div style="display: flex; align-items: center;">
            <i class="fas fa-file"></i>
            <span>${file.name}</span>
            <small style="margin-left: 10px; color: var(--gray);">(${(file.size / 1024).toFixed(2)}KB)</small>
        </div>
        <button type="button" class="remove-file" onclick="removeFile('${type}', this)">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(fileDiv);
}

/**
 * Remove file
 */
function removeFile(type, button) {
    button.closest('.uploaded-file').remove();
    uploadedFiles[type] = uploadedFiles[type].slice(0, -1);
}

/**
 * Navigate to next step
 */
function nextStep() {
    if (validateAllFields()) {
        if (currentStep < totalSteps) {
            currentStep++;
            updateStepDisplay();
            updateProgress();
            autoPopulateReview();
        }
    }
}

/**
 * Navigate to previous step  
 */
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
        updateProgress();
    }
}

/**
 * Update step display
 */
function updateStepDisplay() {
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
        const step = document.getElementById(`formStep${i}`);
        if (step) {
            step.classList.remove('active');
        }
    }

    // Show current step
    const currentStepDiv = document.getElementById(`formStep${currentStep}`);
    if (currentStepDiv) {
        currentStepDiv.classList.add('active');
        currentStepDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Update progress bar
 */
function updateProgress() {
    const percentage = (currentStep / totalSteps) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }

    document.getElementById('currentStep').textContent = currentStep;
    document.getElementById('progressPercentage').textContent = Math.round(percentage) + '% Complete';

    // Update step indicators
    for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.getElementById(`stepIndicator${i}`);
        if (indicator) {
            indicator.classList.remove('active', 'completed');
            if (i === currentStep) {
                indicator.classList.add('active');
            } else if (i < currentStep) {
                indicator.classList.add('completed');
            }
        }
    }
}

/**
 * Auto-populate review section
 */
function autoPopulateReview() {
    if (currentStep === totalSteps) {
        const reviewer = document.getElementById('reviewContent');
        if (reviewer) {
            const form = document.getElementById('applicationForm');
            const formData = new FormData(form);
            let reviewHTML = '';

            for (let [key, value] of formData.entries()) {
                if (value && key !== 'sop') {
                    reviewHTML += `
                        <div class="summary-item">
                            <span class="summary-label">${formatFieldName(key)}:</span>
                            <span class="summary-value">${formatFieldValue(key, value)}</span>
                        </div>
                    `;
                }
            }

            if (reviewHTML) {
                reviewer.innerHTML = `<div>${reviewHTML}</div>`;
            }
        }
    }
}

/**
 * Format field name for display
 */
function formatFieldName(name) {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Format field value for display
 */
function formatFieldValue(key, value) {
    if (key === 'dob') {
        return new Date(value).toLocaleDateString();
    }
    return value;
}

/**
 * Calculate age from date
 */
function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * Generate application ID
 */
function generateApplicationId() {
    return 'APP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
if (document.head) {
    document.head.appendChild(style);
} else {
    window.addEventListener('DOMContentLoaded', function () { document.head.appendChild(style); });
}
