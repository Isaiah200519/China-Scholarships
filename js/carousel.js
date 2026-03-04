// ===== IMAGE CAROUSEL WITH TYPING EFFECT =====

let currentSlideIndex = 0;
let typingInProgress = false;

// Initialize carousel
function initCarousel() {
    showSlide(0);
    startAutoCarousel();
}

// Show specific slide and trigger typing effect
function showSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    const textOverlay = document.querySelector('.carousel-text-overlay');

    if (slides.length === 0) return;

    // If index is out of range, loop around
    if (index >= slides.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = slides.length - 1;
    } else {
        currentSlideIndex = index;
    }

    // Hide all slides
    slides.forEach(slide => slide.classList.remove('active'));

    // Show current slide
    slides[currentSlideIndex].classList.add('active');

    // Show text overlay
    if (textOverlay) {
        textOverlay.classList.add('active');
    }

    // Update dots
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlideIndex);
    });

    // Trigger typing effect for the current slide's text
    const textContent = slides[currentSlideIndex].getAttribute('data-text');
    if (textContent) {
        typeText(textContent);
    }
}

// Navigate to next slide
function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

// Navigate to specific slide
function currentSlide(index) {
    showSlide(index);
    resetAutoCarousel();
}

// Typing effect function
function typeText(text) {
    const typingTextElement = document.getElementById('typingText');
    if (!typingTextElement) return;

    typingInProgress = true;
    typingTextElement.textContent = '';
    let charIndex = 0;

    function type() {
        if (charIndex < text.length) {
            typingTextElement.textContent += text.charAt(charIndex);
            charIndex++;
            setTimeout(type, 20); // Faster typing speed
        } else {
            typingInProgress = false;
        }
    }

    type();
}

// Auto-advance carousel every 9 seconds
let autoCarouselTimeout;

function startAutoCarousel() {
    autoCarouselTimeout = setTimeout(() => {
        nextSlide();
        startAutoCarousel();
    }, 9000); // Change slide every 9 seconds - gives time to read text
}

function resetAutoCarousel() {
    clearTimeout(autoCarouselTimeout);
    startAutoCarousel();
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', initCarousel);
