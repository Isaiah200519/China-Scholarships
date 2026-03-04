// ===== ADMIN REGISTRATION JAVASCRIPT =====

const ADMIN_ACCESS_KEY = 'bshkH2011eh';

/**
 * Show error message
 */
function showError(element, message) {
    element.innerHTML = message;
    element.style.display = 'block';
}

/**
 * Show success message
 */
function showSuccess(element, message) {
    element.innerHTML = message;
    element.style.display = 'block';
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

document.addEventListener('DOMContentLoaded', function () {
    const accessKeyForm = document.getElementById('accessKeyForm');
    const adminRegisterForm = document.getElementById('adminRegisterForm');
    const accessKeyInput = document.getElementById('accessKey');
    const keyErrorMessage = document.getElementById('keyErrorMessage');

    // Access Key Form Submission
    accessKeyForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const accessKey = accessKeyInput.value.trim();
        const verifyBtn = document.getElementById('verifyBtn');

        // Clear previous errors
        keyErrorMessage.style.display = 'none';
        keyErrorMessage.innerHTML = '';

        // Validate access key
        if (!accessKey) {
            showError(keyErrorMessage, 'Please enter the access key');
            showFieldError('accessKey', 'Access key is required');
            return;
        }

        if (accessKey !== ADMIN_ACCESS_KEY) {
            showError(keyErrorMessage, 'Invalid access key. Please try again.');
            showFieldError('accessKey', 'Invalid access key');
            accessKeyInput.value = '';
            accessKeyInput.focus();
            return;
        }

        // Access key is valid - show registration form
        showSuccess(keyErrorMessage, 'Access key verified! Proceed with registration.');
        setTimeout(() => {
            document.getElementById('accessKeyScreen').style.display = 'none';
            document.getElementById('registrationScreen').style.display = 'block';
            document.getElementById('firstName').focus();
        }, 1000);
    });

    // Admin Registration Form Submission
    adminRegisterForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const registerBtn = document.getElementById('registerBtn');
        const regErrorMessage = document.getElementById('regErrorMessage');
        const regSuccessMessage = document.getElementById('regSuccessMessage');

        // Clear previous messages
        regErrorMessage.style.display = 'none';
        regErrorMessage.innerHTML = '';
        regSuccessMessage.style.display = 'none';
        regSuccessMessage.innerHTML = '';

        // Get form data
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const adminTitle = document.getElementById('adminTitle').value.trim();
        const department = document.getElementById('department').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Validate all fields
        let errors = [];

        if (!firstName) errors.push('First name is required');
        if (!lastName) errors.push('Last name is required');
        if (!email || !isValidEmail(email)) errors.push('Valid email is required');
        if (!phone) errors.push('Phone number is required');
        if (!adminTitle) errors.push('Administrator title is required');
        if (!department) errors.push('Department / Organization is required');
        if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
        if (!isValidPassword(password)) {
            errors.push('Password must include uppercase, lowercase, number, and special character');
        }
        if (password !== confirmPassword) errors.push('Passwords do not match');
        if (!agreeTerms) errors.push('You must agree to the terms and conditions');

        if (errors.length > 0) {
            const errorText = errors.join('<br>');
            showError(regErrorMessage, errorText);
            return;
        }

        // Show loading state
        registerBtn.disabled = true;
        document.getElementById('regBtnText').style.display = 'none';
        document.getElementById('regBtnLoader').style.display = 'inline-block';

        try {
            // Create user in Firebase Auth
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Create admin profile in Firestore
            await firebase.firestore().collection('users').doc(user.uid).set({
                uid: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                adminTitle: adminTitle,
                department: department,
                role: 'admin',
                status: 'approved',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            showSuccess(regSuccessMessage, 'Administrator account created successfully! Redirecting to login...');

            // Redirect to admin login
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 2000);
        } catch (error) {
            let errorMessage = 'Registration failed. Please try again.';

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Please use a different email or login.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please use a stronger password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address. Please check and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError(regErrorMessage, errorMessage);
            registerBtn.disabled = false;
            document.getElementById('regBtnText').style.display = 'inline';
            document.getElementById('regBtnLoader').style.display = 'none';
        }
    });

    // Clear error when user starts typing in access key
    accessKeyInput.addEventListener('input', function () {
        clearFieldError('accessKey');
        if (keyErrorMessage.style.display === 'block') {
            keyErrorMessage.style.display = 'none';
            keyErrorMessage.innerHTML = '';
        }
    });

    // Real-time field validation for registration form
    addAdminRegistrationFieldValidation();
});

/**
 * Toggle access key visibility
 */
function toggleAccessKeyVisibility() {
    const accessKeyInput = document.getElementById('accessKey');
    const icon = event.target;

    if (accessKeyInput.type === 'password') {
        accessKeyInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        accessKeyInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    const parent = input.parentElement;
    const toggleIcon = parent.querySelector('.toggle-password');

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
 * Reset to access key screen
 */
function resetToAccessKeyScreen() {
    document.getElementById('registrationScreen').style.display = 'none';
    document.getElementById('accessKeyScreen').style.display = 'block';
    document.getElementById('accessKey').value = '';
    document.getElementById('accessKey').focus();

    // Clear form
    document.getElementById('adminRegisterForm').reset();
    document.getElementById('regErrorMessage').style.display = 'none';
    document.getElementById('regSuccessMessage').style.display = 'none';
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isValidPassword(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

/**
 * Add real-time field validation for registration form
 */
function addAdminRegistrationFieldValidation() {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'adminTitle', 'department', 'password', 'confirmPassword'];

    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function () {
                validateAdminRegistrationField(fieldId);
            });

            field.addEventListener('input', function () {
                clearFieldError(fieldId);
            });
        }
    });
}

/**
 * Validate individual field in registration
 */
function validateAdminRegistrationField(fieldId) {
    const field = document.getElementById(fieldId);
    const value = field.value.trim();
    let error = '';

    switch (fieldId) {
        case 'firstName':
            if (!value) error = 'First name is required';
            break;
        case 'lastName':
            if (!value) error = 'Last name is required';
            break;
        case 'email':
            if (!value) error = 'Email is required';
            else if (!isValidEmail(value)) error = 'Invalid email format';
            break;
        case 'phone':
            if (!value) error = 'Phone number is required';
            break;
        case 'adminTitle':
            if (!value) error = 'Administrator title is required';
            break;
        case 'department':
            if (!value) error = 'Department / Organization is required';
            break;
        case 'password':
            if (!value) error = 'Password is required';
            else if (value.length < 8) error = 'Password must be at least 8 characters';
            else if (!isValidPassword(value)) error = 'Must include uppercase, lowercase, number, and special character';
            break;
        case 'confirmPassword':
            const password = document.getElementById('password').value;
            if (!value) error = 'Confirm password is required';
            else if (value !== password) error = 'Passwords do not match';
            break;
    }

    if (error) {
        showFieldError(fieldId, error);
    }
}
