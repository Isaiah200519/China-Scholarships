// ===== REGISTER PAGE JAVASCRIPT =====

let selectedRole = 'student';
const REGISTER_FORM_KEY = 'registerFormData';

document.addEventListener('DOMContentLoaded', function () {
    // Form and messages
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const registerBtn = document.getElementById('registerBtn');

    // LocalStorage persistence for registration form
    if (registerForm) {
        // Restore saved values
        const saved = localStorage.getItem(REGISTER_FORM_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.keys(data).forEach(key => {
                    const elById = document.getElementById(key);
                    const elByName = registerForm.querySelector(`[name="${key}"]`);
                    const el = elById || elByName;
                    if (el && el.type !== 'file') el.value = data[key];
                });
            } catch (e) { }
        }

        // Save values on change
        registerForm.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'file') return;
            input.addEventListener('input', function () {
                const formData = {};
                registerForm.querySelectorAll('input, select, textarea').forEach(i => {
                    if (i.type !== 'file') formData[i.name || i.id] = i.value;
                });
                localStorage.setItem(REGISTER_FORM_KEY, JSON.stringify(formData));
            });
        });
    }
    selectedRole = 'student';

    // Profile photo file input
    const profilePhotoInput = document.getElementById('profilePhoto');
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', function () {
            const fileName = this.files[0]?.name || 'No file chosen';
            document.getElementById('photoFileName').textContent = fileName;
        });
    }

    // Add real-time validation to form fields
    addFieldValidation();

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate form
        const validationError = validateForm();
        if (validationError) {
            showError(errorMessage, validationError.message, validationError.field);
            return;
        }

        // Show loading state
        registerBtn.disabled = true;
        document.getElementById('btnText').style.display = 'none';
        document.getElementById('btnLoader').style.display = 'inline-block';

        try {
            if (selectedRole === 'student') {
                await handleStudentRegistration(registerForm, errorMessage, successMessage, registerBtn);
            } else {
                await handleAgentRegistration(registerForm, errorMessage, successMessage, registerBtn);
            }
        } catch (error) {
            console.error('Registration error:', error);
            showError(errorMessage, 'An unexpected error occurred. Please try again.');
            registerBtn.disabled = false;
            document.getElementById('btnText').style.display = 'inline';
            document.getElementById('btnLoader').style.display = 'none';
        }
    });
});

/**
 * Switch between student and agent registration
 */
function switchRegisterRole(role) {
    selectedRole = role;

    // Update tab styling
    const tabs = document.querySelectorAll('.auth-tab');
    if (tabs && tabs.length) {
        tabs.forEach(tab => tab.classList.remove('active'));
    }
    const activeTab = document.querySelector(`[data-role="${role}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Update form title and button
    const formTitle = document.getElementById('formTitle');
    const btnText = document.getElementById('btnText');

    if (role === 'student') {
        if (formTitle) formTitle.textContent = 'Create an Account';
        const formSubtitle = document.getElementById('formSubtitle');
        if (formSubtitle) formSubtitle.textContent = 'Register as a student';
        if (btnText) btnText.textContent = 'Register as Student';

        // Hide agent fields
        const agentFields = document.getElementById('agentFields');
        if (agentFields) agentFields.style.display = 'none';

        // Make common fields required
        const countryEl = document.getElementById('country'); if (countryEl) countryEl.required = true;
        const passwordEl = document.getElementById('password'); if (passwordEl) passwordEl.required = true;
        const confirmEl = document.getElementById('confirmPassword'); if (confirmEl) confirmEl.required = true;
    } else {
        if (formTitle) formTitle.textContent = 'Become an Agent';
        const formSubtitle = document.getElementById('formSubtitle');
        if (formSubtitle) formSubtitle.textContent = 'Join our network of education consultants';
        if (btnText) btnText.textContent = 'Apply to Become an Agent';

        // Show agent fields
        const agentFields = document.getElementById('agentFields'); if (agentFields) agentFields.style.display = 'block';

        // Make agent-specific fields required
        const agentCountryEl = document.getElementById('agentCountry'); if (agentCountryEl) agentCountryEl.required = true;
        const expEl = document.getElementById('experience'); if (expEl) expEl.required = true;
    }

    // Clear error message
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) errorMessage.style.display = 'none';
}

/**
 * Handle student registration
 */
async function handleStudentRegistration(form, errorMessage, successMessage, registerBtn) {
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        country: document.getElementById('country').value,
        role: 'student'
    };

    const password = document.getElementById('password').value;
    const result = await registerUser(formData.email, password, formData);

    if (result.success) {
        // Clear form fields and localStorage
        form.reset();
        localStorage.removeItem(REGISTER_FORM_KEY);
        showSuccess(successMessage, 'Registration successful!');
        try {
            const platformName = document.title || 'Our Platform';
            showWelcomeAndScholarship(platformName);
        } catch (e) {
            // Fallback redirect to login
            setTimeout(() => { window.location.href = 'login.html'; }, 4000);
        }
    } else {
        let errorMsg = result.error || 'Registration failed. Please try again.';
        if (result.error && result.error.includes('email-already-in-use')) {
            errorMsg = 'This email is already registered. Redirecting to login page...';
            showError(errorMessage, errorMsg);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        } else {
            showError(errorMessage, errorMsg);
            registerBtn.disabled = false;
            document.getElementById('btnText').style.display = 'inline';
            document.getElementById('btnLoader').style.display = 'none';
        }
    }
}

/**
 * Show welcome modal with scholarship table and payment procedure
 */
function showWelcomeAndScholarship(platformName) {
    if (document.getElementById('welcomeScholarModal')) return;
    const modal = document.createElement('div');
    modal.id = 'welcomeScholarModal';
    modal.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:12000;padding:16px;';
    modal.innerHTML = `
        <div style="background:#fff;max-width:760px;width:100%;border-radius:10px;padding:20px;overflow:auto;max-height:80vh;">
            <h2 style="margin-top:0;">Welcome to ${escapeHtml(platformName)}! 🎓</h2>
            <p>Your journey to studying in China starts here. This opportunity can transform your life by providing:</p>
            <ul>
                <li>Access to world-class education</li>
                <li>Cultural immersion experience</li>
                <li>Career advancement opportunities</li>
                <li>International network building</li>
            </ul>
            <h3>Scholarship Details</h3>
            <table style="width:100%;border-collapse:collapse;border:1px solid #eee;margin-bottom:12px;">
                <thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">Type</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">Amount</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">Application Fee</th></tr></thead>
                <tbody>
                    <tr><td style="padding:8px;border-bottom:1px solid #f6f6f6;">Type A</td><td style="padding:8px;border-bottom:1px solid #f6f6f6;">$500</td><td style="padding:8px;border-bottom:1px solid #f6f6f6;">$40 (40% upfront)</td></tr>
                    <tr><td style="padding:8px;border-bottom:1px solid #f6f6f6;">Type B</td><td style="padding:8px;border-bottom:1px solid #f6f6f6;">$400</td><td style="padding:8px;border-bottom:1px solid #f6f6f6;">$32 (40% upfront)</td></tr>
                    <tr><td style="padding:8px;">Type C</td><td style="padding:8px;">$350</td><td style="padding:8px;">$28 (40% upfront)</td></tr>
                </tbody>
            </table>
            <h3>Payment Procedure</h3>
            <p>40% upfront payment before starting application. Remaining 60% after admission is confirmed.</p>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
                <button id="welcomeGoLogin" class="btn-small btn-primary">Go to Login</button>
                <button id="welcomeClose" class="btn-small">Close</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    const goLogin = document.getElementById('welcomeGoLogin');
    if (goLogin) goLogin.addEventListener('click', function () { window.location.href = 'login.html'; });
    const closeBtn = document.getElementById('welcomeClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { const m = document.getElementById('welcomeScholarModal'); if (m) m.remove(); });
}

/**
 * Handle agent registration
 */
async function handleAgentRegistration(form, errorMessage, successMessage, registerBtn) {
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        experience: parseInt(document.getElementById('experience').value) || 0,
        bio: document.getElementById('bio').value.trim(),
        country: document.getElementById('agentCountry').value,
        // role/status managed when creating user
    };

    // Handle profile photo if provided
    let photoURL = null;
    const photoInput = document.getElementById('profilePhoto');
    if (photoInput.files.length > 0) {
        try {
            // keep the file for upload during registration
            var photoFile = photoInput.files[0];
        } catch (error) {
            showError(errorMessage, 'Failed to upload profile photo. Please try again.');
            registerBtn.disabled = false;
            document.getElementById('btnText').style.display = 'inline';
            document.getElementById('btnLoader').style.display = 'none';
            return;
        }
    }
    // Collect password
    const password = document.getElementById('password').value;
    // Create user account immediately and store profile with role 'agent'
    const res = await registerUserWithRole(formData.email, password, formData, 'agent', photoFile || null);

    if (res.success) {
        showSuccess(successMessage, 'Registration successful! Your account is pending verification by an administrator.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2500);
    } else {
        let errorMsg = res.error || 'Registration failed. Please try again.';
        showError(errorMessage, errorMsg);
        registerBtn.disabled = false;
        document.getElementById('btnText').style.display = 'inline';
        document.getElementById('btnLoader').style.display = 'none';
    }
}

/**
 * Add real-time field validation
 */
function addFieldValidation() {
    const fields = [
        { id: 'firstName', validator: validateFirstName },
        { id: 'lastName', validator: validateLastName },
        { id: 'email', validator: validateEmailField },
        { id: 'phone', validator: validatePhoneField },
        { id: 'country', validator: validateCountryField },
        { id: 'password', validator: validatePasswordField },
        { id: 'confirmPassword', validator: validateConfirmPasswordField }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.addEventListener('blur', function () {
                const error = field.validator();
                if (error) {
                    showFieldError(field.id, error);
                } else {
                    clearFieldError(field.id);
                }
            });

            element.addEventListener('input', function () {
                clearFieldError(field.id);
            });
        }
    });
}

/**
 * Show field-level error
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

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
 * Clear field-level error
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('error-field');
    const errorElement = field.parentElement.querySelector('.field-error-message');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

/**
 * Validate first name
 */
function validateFirstName() {
    const el = document.getElementById('firstName');
    const firstName = el ? el.value.trim() : '';

    if (!firstName) {
        return 'First name is required';
    }
    if (firstName.length < 2) {
        return 'First name must be at least 2 characters';
    }
    if (!/^[a-zA-Z\s'-]+$/.test(firstName)) {
        return 'First name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
}

/**
 * Validate last name
 */
function validateLastName() {
    const el = document.getElementById('lastName');
    const lastName = el ? el.value.trim() : '';

    if (!lastName) {
        return 'Last name is required';
    }
    if (lastName.length < 2) {
        return 'Last name must be at least 2 characters';
    }
    if (!/^[a-zA-Z\s'-]+$/.test(lastName)) {
        return 'Last name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
}

/**
 * Validate email field
 */
function validateEmailField() {
    const el = document.getElementById('email');
    const email = el ? el.value.trim() : '';

    if (!email) {
        return 'Email address is required';
    }
    if (!isValidEmail(email)) {
        return 'Please enter a valid email address (e.g., user@example.com)';
    }
    return null;
}

/**
 * Validate phone field
 */
function validatePhoneField() {
    const el = document.getElementById('phone');
    const phone = el ? el.value.trim() : '';

    if (!phone) {
        return 'Phone number is required';
    }
    if (!/^[\d\s\-\+\(\)]+$/.test(phone)) {
        return 'Phone number contains invalid characters';
    }
    if (phone.replace(/\D/g, '').length < 7) {
        return 'Phone number must contain at least 7 digits';
    }
    return null;
}

/**
 * Validate country field
 */
function validateCountryField() {
    const el = document.getElementById('country');
    if (!el) return null;
    const country = el.value && typeof el.value === 'string' ? el.value.trim() : '';
    if (!country) return 'Please enter your country';
    if (country.length > 100) return 'Country must be 100 characters or fewer';
    return null;
}

/**
 * Validate password field
 */
function validatePasswordField() {
    const el = document.getElementById('password');
    const password = el ? el.value : '';

    if (!password) {
        return 'Password is required';
    }
    if (password.length < 6) {
        return 'Password must be at least 6 characters';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }
    return null;
}

/**
 * Validate confirm password field
 */
function validateConfirmPasswordField() {
    const passwordEl = document.getElementById('password');
    const confirmEl = document.getElementById('confirmPassword');
    const password = passwordEl ? passwordEl.value : '';
    const confirmPassword = confirmEl ? confirmEl.value : '';

    if (!confirmPassword) {
        return 'Please confirm your password';
    }
    if (password !== confirmPassword) {
        return 'Passwords do not match';
    }
    return null;
}

/**
 * Validate registration form
 */
function validateForm() {
    const firstNameEl = document.getElementById('firstName');
    const lastNameEl = document.getElementById('lastName');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const countryEl = document.getElementById('country');
    const passwordEl = document.getElementById('password');
    const confirmEl = document.getElementById('confirmPassword');
    const agreeEl = document.getElementById('agreeTerms');

    const firstName = firstNameEl ? firstNameEl.value.trim() : '';
    const lastName = lastNameEl ? lastNameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const country = countryEl ? countryEl.value : '';
    const password = passwordEl ? passwordEl.value : '';
    const confirmPassword = confirmEl ? confirmEl.value : '';
    const agreeTerms = agreeEl ? agreeEl.checked : false;

    // Validate each field
    const firstNameError = validateFirstName();
    if (firstNameError) {
        return { message: firstNameError, field: 'firstName' };
    }

    const lastNameError = validateLastName();
    if (lastNameError) {
        return { message: lastNameError, field: 'lastName' };
    }

    const emailError = validateEmailField();
    if (emailError) {
        return { message: emailError, field: 'email' };
    }

    const phoneError = validatePhoneField();
    if (phoneError) {
        return { message: phoneError, field: 'phone' };
    }

    const countryError = validateCountryField();
    if (countryError) {
        return { message: countryError, field: 'country' };
    }

    const passwordError = validatePasswordField();
    if (passwordError) {
        return { message: passwordError, field: 'password' };
    }

    const confirmPasswordError = validateConfirmPasswordField();
    if (confirmPasswordError) {
        return { message: confirmPasswordError, field: 'confirmPassword' };
    }

    // Terms agreement validation
    if (!agreeTerms) {
        return { message: 'You must agree to the Terms & Conditions', field: 'agreeTerms' };
    }

    return null;
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const parent = input.parentElement;
    const toggleIcon = parent ? parent.querySelector('.toggle-password') : null;
    if (!toggleIcon) return;

    if (input.type === 'password') {
        input.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

/**
 * Show error message
 */
function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        if (element) element.style.display = 'none';
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
}
