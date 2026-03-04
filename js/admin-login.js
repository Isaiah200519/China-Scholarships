// ===== ADMIN LOGIN JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function () {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Add real-time field validation
    addAdminLoginFieldValidation();

    // Clear error message when user starts typing
    emailInput.addEventListener('input', function () {
        clearFieldError('email');
        if (errorMessage.style.display === 'block') {
            errorMessage.style.display = 'none';
            errorMessage.innerHTML = '';
        }
    });

    passwordInput.addEventListener('input', function () {
        clearFieldError('password');
        if (errorMessage.style.display === 'block') {
            errorMessage.style.display = 'none';
            errorMessage.innerHTML = '';
        }
    });

    adminLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get form data
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validation
        const emailError = validateAdminEmail();
        if (emailError) {
            showFieldError('email', emailError);
            showError(errorMessage, emailError);
            return;
        }

        const passwordError = validateAdminPassword();
        if (passwordError) {
            showFieldError('password', passwordError);
            showError(errorMessage, passwordError);
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        document.getElementById('btnText').style.display = 'none';
        document.getElementById('btnLoader').style.display = 'inline-block';

        // Attempt login
        const result = await loginUser(email, password);

        if (result.success) {
            // Check if user is an admin
            if (result.role !== USER_ROLES.ADMIN) {
                showError(errorMessage, 'Access denied. This account is not an administrator account.');
                loginBtn.disabled = false;
                document.getElementById('btnText').style.display = 'inline';
                document.getElementById('btnLoader').style.display = 'none';
                return;
            }

            showSuccess(successMessage, 'Login successful! Redirecting to admin dashboard...');

            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);
        } else {
            showError(errorMessage, result.error || 'Login failed. Please try again.', result.error);
            // Clear password field for security
            document.getElementById('password').value = '';
            clearFieldError('password');
            loginBtn.disabled = false;
            document.getElementById('btnText').style.display = 'inline';
            document.getElementById('btnLoader').style.display = 'none';
            // Focus on email field
            document.getElementById('email').focus();
            document.getElementById('email').select();
        }
    });
});

/**
 * Add real-time field validation
 */
function addAdminLoginFieldValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (emailInput) {
        emailInput.addEventListener('blur', function () {
            const error = validateAdminEmail();
            if (error) {
                showFieldError('email', error);
            } else {
                clearFieldError('email');
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('blur', function () {
            const error = validateAdminPassword();
            if (error) {
                showFieldError('password', error);
            } else {
                clearFieldError('password');
            }
        });
    }
}

/**
 * Validate admin email field
 */
function validateAdminEmail() {
    const email = document.getElementById('email').value.trim();

    if (!email) {
        return 'Email address is required';
    }
    if (!isValidEmail(email)) {
        return 'Please enter a valid email address';
    }
    return null;
}

/**
 * Validate admin password field
 */
function validateAdminPassword() {
    const password = document.getElementById('password').value;

    if (!password) {
        return 'Password is required';
    }
    if (password.length < 6) {
        return 'Password must be at least 6 characters';
    }
    return null;
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
 * Toggle password visibility
 */
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

/**
 * Show error message with professional styling
 */
function showError(element, message, fullError = null) {
    // Create professional error message structure
    let errorHTML = '<div style="display: flex; align-items: flex-start; gap: 12px;">';
    errorHTML += '<i class="fas fa-times-circle" style="flex-shrink: 0; margin-top: 2px; font-size: 18px;"></i>';
    errorHTML += '<div style="flex: 1;">';
    errorHTML += '<strong style="display: block; margin-bottom: 2px;">' + message + '</strong>';

    // Add note for non-admin accounts
    if (fullError && fullError.includes('not an administrator account')) {
        errorHTML += '<div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">If you believe this is an error, please contact the system administrator.</div>';
    }

    errorHTML += '</div></div>';

    element.innerHTML = errorHTML;
    element.style.display = 'block';

    // Don't auto-hide for these errors
    if (fullError && (fullError.includes('not an administrator account') || fullError.includes('Incorrect password'))) {
        return; // Don't auto-hide
    }

    setTimeout(() => {
        if (element.style.display === 'block') {
            element.style.display = 'none';
        }
    }, 6000);
}

/**
 * Show success message
 */
function showSuccess(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}
