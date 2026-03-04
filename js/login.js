// ===== LOGIN PAGE JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Add real-time field validation
    addLoginFieldValidation();

    // Clear error message when user starts typing
    if (emailInput) {
        emailInput.addEventListener('input', function () {
            clearFieldError('email');
            if (errorMessage && errorMessage.style.display === 'block') {
                errorMessage.style.display = 'none';
                errorMessage.innerHTML = '';
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            clearFieldError('password');
            if (errorMessage && errorMessage.style.display === 'block') {
                errorMessage.style.display = 'none';
                errorMessage.innerHTML = '';
            }
        });
    }

    if (loginForm) loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get form data
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validation
        const emailError = validateLoginEmail();
        if (emailError) {
            showFieldError('email', emailError);
            showError(errorMessage, emailError);
            return;
        }

        const passwordError = validateLoginPassword();
        if (passwordError) {
            showFieldError('password', passwordError);
            showError(errorMessage, passwordError);
            return;
        }

        // Show loading state
        if (loginBtn) loginBtn.disabled = true;
        const btnTextEl = document.getElementById('btnText'); if (btnTextEl) btnTextEl.style.display = 'none';
        const btnLoaderEl = document.getElementById('btnLoader'); if (btnLoaderEl) btnLoaderEl.style.display = 'inline-block';

        // Attempt login
        const result = await loginUser(email, password);

        if (result.success) {
            showSuccess(successMessage, 'Login successful! Redirecting...');

            console.log('User role:', result.role);

            // Redirect based on user role
            setTimeout(() => {
                if (result.role === USER_ROLES.ADMIN) {
                    window.location.href = 'admin-dashboard.html';
                } else if (result.role === USER_ROLES.AGENT) {
                    window.location.href = 'agent-dashboard.html';
                } else {
                    // Default to student dashboard for student role
                    window.location.href = 'student-dashboard.html';
                }
            }, 1500);
        } else {
            // Handle error
            let displayMessage = result.error || 'Login failed. Please try again.';

            showError(errorMessage, displayMessage, result.error);
            console.error('Login failed:', result.error);

            // Clear password field for security
            const pwdEl = document.getElementById('password'); if (pwdEl) pwdEl.value = '';
            clearFieldError('password');

            // Reset button and form
            if (loginBtn) loginBtn.disabled = false;
            const btnTextEl2 = document.getElementById('btnText'); if (btnTextEl2) btnTextEl2.style.display = 'inline';
            const btnLoaderEl2 = document.getElementById('btnLoader'); if (btnLoaderEl2) btnLoaderEl2.style.display = 'none';

            // Focus on email field for user to correct
            const emailEl = document.getElementById('email'); if (emailEl) { emailEl.focus(); emailEl.select(); }
        }
    });
});

/**
 * Add real-time field validation
 */
function addLoginFieldValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (emailInput) {
        emailInput.addEventListener('blur', function () {
            const error = validateLoginEmail();
            if (error) {
                showFieldError('email', error);
            } else {
                clearFieldError('email');
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('blur', function () {
            const error = validateLoginPassword();
            if (error) {
                showFieldError('password', error);
            } else {
                clearFieldError('password');
            }
        });
    }
}

/**
 * Validate login email field
 */
function validateLoginEmail() {
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
 * Validate login password field
 */
function validateLoginPassword() {
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
    if (!passwordInput || !toggleIcon) return;

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

    // Add registration suggestion for "No account found" error
    if (fullError && fullError.includes('No account found')) {
        errorHTML += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(200, 50, 50, 0.3);">';
        errorHTML += '<div style="font-size: 12px; margin-bottom: 8px; opacity: 0.9;">Don\'t have an account yet?</div>';
        errorHTML += '<a href="register.html" style="display: inline-block; padding: 6px 14px; background-color: rgba(220, 53, 69, 0.15); color: #721c24; text-decoration: none; border-radius: 4px; font-weight: 600; border: 1px solid rgba(220, 53, 69, 0.3); transition: all 0.3s ease;">Register Now</a>';
        errorHTML += '</div>';
    }

    errorHTML += '</div></div>';

    if (!element) return;
    element.innerHTML = errorHTML;
    element.style.display = 'block';

    // Determine display duration based on error type
    let duration = 6000; // default 6 seconds
    if (fullError && (fullError.includes('No account found') || fullError.includes('Incorrect password'))) {
        duration = 0; // Don't auto-hide, let user clear it
    }

    if (duration > 0) {
        setTimeout(() => {
            if (element && element.style.display === 'block') {
                element.style.display = 'none';
            }
        }, duration);
    }
}

/**
 * Show success message
 */
function showSuccess(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
}
/**
 * Switch between login and reset tabs
 */
function switchTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const resetTab = document.getElementById('resetTab');
    const loginContent = document.getElementById('loginTabContent');
    const resetContent = document.getElementById('resetTabContent');

    if (tab === 'login') {
        loginTab.style.fontWeight = '600';
        loginTab.style.color = 'var(--primary)';
        loginTab.style.borderBottomColor = 'var(--primary)';
        loginTab.style.borderBottomWidth = '3px';

        resetTab.style.fontWeight = '600';
        resetTab.style.color = 'var(--gray)';
        resetTab.style.borderBottomColor = 'transparent';

        loginContent.style.display = 'block';
        resetContent.style.display = 'none';
    } else {
        resetTab.style.fontWeight = '600';
        resetTab.style.color = 'var(--primary)';
        resetTab.style.borderBottomColor = 'var(--primary)';
        resetTab.style.borderBottomWidth = '3px';

        loginTab.style.fontWeight = '600';
        loginTab.style.color = 'var(--gray)';
        loginTab.style.borderBottomColor = 'transparent';

        loginContent.style.display = 'none';
        resetContent.style.display = 'block';
    }
}

/**
 * Open password reset modal
 */
function openPasswordResetModal(event) {
    event.preventDefault();
    switchTab('reset');
}

/**
 * Close password reset modal
 */
function closePasswordResetModal() {
    switchTab('login');
    document.getElementById('resetEmailForm').reset();
    document.getElementById('resetSmsForm').reset();
    document.getElementById('resetErrorMessage').style.display = 'none';
    document.getElementById('resetSuccessMessage').style.display = 'none';
}

/**
 * Handle password reset form submission
 */
document.addEventListener('DOMContentLoaded', function () {
    // Email Reset Form Handler
    const resetEmailForm = document.getElementById('resetEmailForm');
    if (resetEmailForm) {
        resetEmailForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = document.getElementById('resetEmailInput').value.trim();
            const resetBtn = resetEmailForm.querySelector('button[type="submit"]');
            const resetErrorMsg = document.getElementById('resetErrorMessage');
            const resetSuccessMsg = document.getElementById('resetSuccessMessage');

            // Validate email
            if (!email) {
                resetErrorMsg.textContent = 'Please enter your email address';
                resetErrorMsg.style.display = 'block';
                return;
            }

            if (!isValidEmail(email)) {
                resetErrorMsg.textContent = 'Please enter a valid email address';
                resetErrorMsg.style.display = 'block';
                return;
            }

            // Hide previous messages
            resetErrorMsg.style.display = 'none';
            resetSuccessMsg.style.display = 'none';

            // Show loading state
            resetBtn.disabled = true;
            document.getElementById('emailResetBtnText').style.display = 'none';
            document.getElementById('emailResetLoader').style.display = 'inline-block';

            try {
                await waitForFirebase();
                await firebase.auth().sendPasswordResetEmail(email);

                resetSuccessMsg.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <i class="fas fa-check-circle" style="flex-shrink: 0; margin-top: 2px; font-size: 18px;"></i>
                        <div>
                            <strong>Email sent successfully!</strong><br>
                            Check your email and spam folder for a link to reset your password. The link will expire in 1 hour.
                        </div>
                    </div>
                `;
                resetSuccessMsg.style.display = 'block';

                document.getElementById('resetEmailInput').value = '';
                resetBtn.disabled = false;
                document.getElementById('emailResetBtnText').style.display = 'inline';
                document.getElementById('emailResetLoader').style.display = 'none';

                setTimeout(() => {
                    switchTab('login');
                    resetEmailForm.reset();
                    resetSuccessMsg.style.display = 'none';
                }, 4000);

            } catch (error) {
                console.error('Password reset error:', error);

                let errorText = 'Failed to send reset email. Please try again.';

                if (error.code === 'auth/user-not-found') {
                    errorText = 'No account found with this email address.';
                } else if (error.code === 'auth/invalid-email') {
                    errorText = 'Invalid email address.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorText = 'Too many reset attempts. Please try again later.';
                }

                resetErrorMsg.textContent = errorText;
                resetErrorMsg.style.display = 'block';

                resetBtn.disabled = false;
                document.getElementById('emailResetBtnText').style.display = 'inline';
                document.getElementById('emailResetLoader').style.display = 'none';
            }
        });
    }
});

/**
 * Map Firebase error codes to professional messages
 */
function getProfileErrorMessage(errorCode, errorMessage) {
    const errorMap = {
        'auth/user-not-found': 'The email or password you entered is incorrect.',
        'auth/wrong-password': 'The email or password you entered is incorrect.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-disabled': 'This account has been disabled. Please contact support.',
        'auth/too-many-requests': 'Too many login attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/operation-not-allowed': 'This login method is not available. Please contact support.',
        'auth/invalid-user-token': 'Your session has expired. Please login again.',
        'auth/invalid-credential': 'The email or password you entered is incorrect.'
    };

    return errorMap[errorCode] || 'An error occurred. Please try again or contact support if the problem persists.';
}

// Close modal when clicking outside
document.addEventListener('click', function (e) {
    const modal = document.getElementById('passwordResetModal');
    if (modal && e.target === modal) {
        closePasswordResetModal();
    }
});