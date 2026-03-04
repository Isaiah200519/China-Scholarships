// ===== AGENT APPLICATION FORM JAVASCRIPT =====

// Uploaded files storage
let agentUploadedFiles = {
    idProof: [],
    reference: [],
    photo: []
};

document.addEventListener('DOMContentLoaded', function () {
    const agentForm = document.getElementById('agentForm');
    if (!agentForm) return;

    addFormValidation();
    setupFormSubmit();
});

/**
 * Add real-time field validation
 */
function addFormValidation() {
    const form = document.getElementById('agentForm');
    if (!form) return;

    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        // Clear error on input/focus
        input.addEventListener('input', function () {
            clearFieldError(this);
        });

        input.addEventListener('focus', function () {
            clearFieldError(this);
        });

        // Validate on blur
        input.addEventListener('blur', function () {
            validateField(this);
        });
    });
}

/**
 * Setup form submit handler
 */
function setupFormSubmit() {
    const form = document.getElementById('agentForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate all fields
        if (!validateAllFields()) {
            return;
        }

        // Check terms agreement
        const agentTerms = document.getElementById('agentTerms') || document.querySelector('[name="terms"]');
        const agentAgreement = document.getElementById('agentAgreement') || document.querySelector('[name="partnership"]');

        if (agentTerms && !agentTerms.checked) {
            showFormError('Please agree to Terms & Conditions');
            return;
        }

        if (agentAgreement && !agentAgreement.checked) {
            showFormError('Please confirm your commitment to our partnership');
            return;
        }

        // Collect form data
        const formData = collectAgentFormData();

        // Basic password checks
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

            // Prepare user data for auth/register
            const fullName = formData.fullName || '';
            const nameParts = fullName.trim().split(/\s+/);
            const firstName = nameParts.shift() || '';
            const lastName = nameParts.join(' ') || '';

            const userData = {
                firstName,
                lastName,
                phone: formData.phone || '',
                country: formData.country || '',
                city: formData.city || '',
                address: formData.address || '',
                company: formData.company || '',
                experience: formData.experience || '',
                bio: formData.motivation || formData.bio || ''
            };

            // Use the first photo file if available
            const photoFile = (agentUploadedFiles.photo && agentUploadedFiles.photo.length > 0) ? agentUploadedFiles.photo[0] : null;

            // Create auth user and users/{uid} with role agent (status = pending)
            const regResult = await registerUserWithRole(formData.email, password, userData, USER_ROLES.AGENT, photoFile);

            if (!regResult.success) {
                showFormError(regResult.error || 'Failed to create account.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                return;
            }

            const uid = regResult.uid;

            // Read profilePhoto from users doc if available
            let profilePhoto = null;
            try {
                const udoc = await firebase.firestore().collection('users').doc(uid).get();
                if (udoc.exists) profilePhoto = udoc.data().profilePhoto || null;
            } catch (e) {
                console.warn('Could not read user profile after registration', e);
            }

            // Create agents document (use uid as doc id for easier mapping)
            const agentDoc = {
                uid: uid,
                firstName: firstName,
                lastName: lastName,
                email: formData.email,
                phone: formData.phone || '',
                experience: formData.experience || '',
                bio: formData.motivation || formData.bio || '',
                country: formData.country || '',
                profilePhoto: profilePhoto || null,
                status: AGENT_STATUS.PENDING,
                assignedStudentCount: 0,
                successfulStudents: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
                approvedAt: null
            };

            await firebase.firestore().collection('agents').doc(uid).set(agentDoc);

            showSuccessMessage(uid);
            form.style.display = 'none';
        } catch (error) {
            console.error('Agent application submission error:', error);
            showFormError(error.message || 'An error occurred while submitting your application. Please try again.');
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
            case 'firstName':
                if (value && !/^[a-zA-Z\s'-]{2,}$/.test(value)) {
                    error = 'First name can only contain letters, spaces, hyphens, and apostrophes';
                }
                break;
            case 'lastName':
                if (value && !/^[a-zA-Z\s'-]{2,}$/.test(value)) {
                    error = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
                }
                break;
            case 'email':
                if (value && !isValidEmail(value)) {
                    error = 'Please enter a valid email address';
                }
                break;
            case 'phone':
                if (value && !/^[\d\s\-\+\(\)]{7,}$/.test(value)) {
                    error = 'Please enter a valid phone number';
                }
                break;
            case 'experience':
                if (value) {
                    const expYears = parseInt(value);
                    if (expYears < 0 || expYears > 70) {
                        error = 'Please enter a valid number of years of experience';
                    }
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
 * Validate all form fields and required files
 */
function validateAllFields() {
    const form = document.getElementById('agentForm');
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });

    // Check required files
    if (agentUploadedFiles.idProof.length === 0) {
        showFormError('Please upload your government ID proof.');
        isValid = false;
    }

    if (agentUploadedFiles.photo.length === 0) {
        showFormError('Please upload your profile photo.');
        isValid = false;
    }

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
    let errorBox = document.getElementById('agentFormErrorMessage');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'agentFormErrorMessage';
        errorBox.className = 'alert alert-error';
        errorBox.style.marginBottom = '20px';
        const form = document.getElementById('agentForm');
        form.parentElement.insertBefore(errorBox, form);
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
 * Collect agent form data
 */
function collectAgentFormData() {
    const form = document.getElementById('agentForm');
    const formData = new FormData(form);
    const data = {
        applicationType: 'agent',
        timestamp: new Date().toISOString(),
        status: 'pending'
    };

    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    return data;
}

/**
 * Submit agent application to Firebase
 */
async function submitAgentApplicationToFirebase(applicationData) {
    try {
        // Wait for Firebase to be initialized
        await waitForFirebase();

        const db = firebase.firestore();

        // Add application document to applications collection
        const docRef = await db.collection('applications').add({
            ...applicationData,
            applicationId: generateApplicationId(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            applicationId: 'AGT-' + docRef.id.substring(0, 8).toUpperCase()
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
 * Show success message
 */
function showSuccessMessage(applicationId) {
    const form = document.getElementById('agentForm');
    const successDiv = document.getElementById('agentSuccessMessage');

    if (successDiv) {
        document.getElementById('agentApplicationId').textContent = applicationId;
        successDiv.style.display = 'block';
    }

    // Auto-scroll to success message
    document.querySelector('.agent-container').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Handle file uploads - supports multiple files
 */
function handleAgentFileUpload(input, type) {
    const files = input.files;
    const container = document.getElementById(type + 'Files');

    if (!container) return;

    // Clear previous files
    agentUploadedFiles[type] = [];
    container.innerHTML = '';

    // Add new files
    for (let file of files) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showFormError('File ' + file.name + ' is too large. Maximum size is 5MB.');
            continue;
        }

        // For photos, check if it's an image
        if (type === 'photo') {
            if (!file.type.match('image.*')) {
                showFormError('Profile photo must be an image file (JPG, PNG, etc.)');
                continue;
            }
        }

        agentUploadedFiles[type].push(file);

        const fileElement = document.createElement('div');
        fileElement.className = 'uploaded-file';
        fileElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-file"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)}KB)</span>
            </div>
            <button type="button" class="remove-file" onclick="removeAgentFile('${type}', '${file.name}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(fileElement);
    }

    // Reset input to allow uploading same file again
    input.value = '';
}

/**
 * Remove uploaded file
 */
function removeAgentFile(type, fileName) {
    agentUploadedFiles[type] = agentUploadedFiles[type].filter(file => file.name !== fileName);
    const container = document.getElementById(type + 'Files');
    container.innerHTML = '';

    // Re-add remaining files
    agentUploadedFiles[type].forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'uploaded-file';
        fileElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-file"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)}KB)</span>
            </div>
            <button type="button" class="remove-file" onclick="removeAgentFile('${type}', '${file.name}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(fileElement);
    });
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
}

/**
 * Toggle area of operation
 */
function toggleAreaOfOperation() {
    const select = document.getElementById('areaOfOperation');
    const otherInput = document.getElementById('otherArea');

    if (select && otherInput) {
        if (select.value === 'other') {
            otherInput.style.display = 'block';
            otherInput.setAttribute('required', '');
        } else {
            otherInput.style.display = 'none';
            otherInput.removeAttribute('required');
            otherInput.value = '';
        }
    }
}

/**
 * Generate application ID
 */
function generateApplicationId() {
    return 'AGT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Initialize on page load
 */
function initializeAgent() {
    // Set up area of operation toggle
    const areaSelect = document.getElementById('areaOfOperation');
    if (areaSelect) {
        areaSelect.addEventListener('change', toggleAreaOfOperation);
        toggleAreaOfOperation(); // Initialize on load
    }

    // Set up form validation
    const agentForm = document.getElementById('agentForm');
    if (agentForm) {
        addFormValidation();
        setupFormSubmit();
    }
}

// Call initializer on page load
window.addEventListener('load', initializeAgent);
