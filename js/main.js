// ===== MAIN JAVASCRIPT FILE =====

// Mobile Menu Toggle
function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    const mobileMenuIcon = document.querySelector('.mobile-menu i');

    if (!navLinks || !mobileMenuIcon) return;

    // Toggle menu visibility
    navLinks.classList.toggle('active');

    // Change hamburger to X when menu is open
    if (navLinks.classList.contains('active')) {
        mobileMenuIcon.classList.remove('fa-bars');
        mobileMenuIcon.classList.add('fa-times');
        // Prevent body scrolling when menu is open
        document.body.style.overflow = 'hidden';
    } else {
        mobileMenuIcon.classList.remove('fa-times');
        mobileMenuIcon.classList.add('fa-bars');
        // Restore body scrolling
        document.body.style.overflow = 'auto';
    }
}

// Close mobile menu when clicking on a link
document.addEventListener('DOMContentLoaded', function () {
    // LocalStorage persistence for contact form
    const contactForm = document.getElementById('contactForm');
    const contactFormKey = 'contactFormData';
    if (contactForm) {
        // Restore saved values
        const saved = localStorage.getItem(contactFormKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.keys(data).forEach(name => {
                    const el = contactForm.querySelector(`[name="${name}"]`);
                    if (el && el.type !== 'file') el.value = data[name];
                });
            } catch (e) { }
        }
        // Save values on change
        contactForm.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'file') return;
            input.addEventListener('input', function () {
                const formData = {};
                contactForm.querySelectorAll('input, select, textarea').forEach(i => {
                    if (i.type !== 'file') formData[i.name] = i.value;
                });
                localStorage.setItem(contactFormKey, JSON.stringify(formData));
            });
        });
        // On submit, clear form and localStorage, show success message
        contactForm.addEventListener('submit', function (e) {
            setTimeout(() => {
                contactForm.reset();
                localStorage.removeItem(contactFormKey);
                const msg = document.getElementById('contactSuccessMessage');
                if (msg) {
                    msg.style.display = 'block';
                    setTimeout(() => { msg.style.display = 'none'; }, 5000);
                }
            }, 100); // Delay to allow any async submit logic
        });
    }
    const navLinks = document.querySelectorAll('.nav-links a');
    const mobileMenuIcon = document.querySelector('.mobile-menu i');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const navMenu = document.getElementById('navLinks');
            if (!navMenu || !mobileMenuIcon) return;

            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                mobileMenuIcon.classList.remove('fa-times');
                mobileMenuIcon.classList.add('fa-bars');
                document.body.style.overflow = 'auto';
            }
        });
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', function (event) {
    const navLinks = document.getElementById('navLinks');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileMenuIcon = document.querySelector('.mobile-menu i');

    if (!navLinks || !mobileMenu || !mobileMenuIcon) return;

    if (!navLinks.contains(event.target) &&
        !mobileMenu.contains(event.target) &&
        navLinks.classList.contains('active')) {

        navLinks.classList.remove('active');
        mobileMenuIcon.classList.remove('fa-times');
        mobileMenuIcon.classList.add('fa-bars');
        document.body.style.overflow = 'auto';
    }
});

// Close menu on window resize
window.addEventListener('resize', function () {
    const navLinks = document.getElementById('navLinks');
    const mobileMenuIcon = document.querySelector('.mobile-menu i');

    if (!navLinks || !mobileMenuIcon) return;

    if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileMenuIcon.classList.remove('fa-times');
        mobileMenuIcon.classList.add('fa-bars');
        document.body.style.overflow = 'auto';
    }
});

// Form Validation (for contact form if needed)
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;

    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#ff4757';
            isValid = false;

            // Add error message
            if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('error-message')) {
                const error = document.createElement('div');
                error.className = 'error-message';
                error.textContent = 'This field is required';
                error.style.color = '#ff4757';
                error.style.fontSize = '0.8rem';
                error.style.marginTop = '5px';
                input.parentNode.insertBefore(error, input.nextSibling);
            }
        } else {
            input.style.borderColor = '#ddd';

            // Remove error message
            if (input.nextElementSibling && input.nextElementSibling.classList.contains('error-message')) {
                input.nextElementSibling.remove();
            }
        }
    });

    return isValid;
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Counter Animation for Stats
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start) + '+';
        }
    }, 16);
}

// Initialize counters when in viewport
function initCounters() {
    const counters = document.querySelectorAll('.stat h3');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.textContent);
                animateCounter(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => {
        observer.observe(counter);
    });
}

// Set active navigation link based on current page
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        // Remove active class from all links
        link.classList.remove('active');

        // Check if this link corresponds to current page
        if (linkHref === currentPage ||
            (currentPage === '' && linkHref === 'index.html') ||
            (currentPage === 'index.html' && linkHref === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// Simple scholarship filter function (will be used on scholarships page)
function filterScholarships() {
    const searchInput = document.getElementById('searchInput');
    const degreeFilter = document.getElementById('degreeFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (!searchInput && !degreeFilter && !typeFilter) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const degreeValue = degreeFilter ? degreeFilter.value : '';
    const typeValue = typeFilter ? typeFilter.value : '';

    const scholarshipCards = document.querySelectorAll('.scholarship-card');

    scholarshipCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const degree = card.getAttribute('data-degree') || '';
        const type = card.getAttribute('data-type') || '';

        const matchesSearch = text.includes(searchTerm);
        const matchesDegree = !degreeValue || degree === degreeValue;
        const matchesType = !typeValue || type === typeValue;

        if (matchesSearch && matchesDegree && matchesType) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initialize counters
    initCounters();

    // Set active navigation link
    setActiveNavLink();

    // Close mobile menu when clicking outside
    document.addEventListener('click', function (event) {
        const navLinks = document.getElementById('navLinks');
        const mobileMenu = document.querySelector('.mobile-menu');
        const mobileMenuIcon = document.querySelector('.mobile-menu i');

        if (!navLinks || !mobileMenu || !mobileMenuIcon) return;

        if (!navLinks.contains(event.target) &&
            !mobileMenu.contains(event.target) &&
            navLinks.classList.contains('active')) {

            navLinks.classList.remove('active');
            mobileMenuIcon.classList.remove('fa-times');
            mobileMenuIcon.classList.add('fa-bars');
            document.body.style.overflow = 'auto';
        }
    });
});

// Export functions for use in other files
window.toggleMenu = toggleMenu;
window.validateForm = validateForm;
window.filterScholarships = filterScholarships;