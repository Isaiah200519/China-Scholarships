// ===== FIREBASE CONFIGURATION =====
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyD5kK1M6AcNOaN02zOfAZ7_zhxQ_dOzGA8",
    authDomain: "china-scholarships.firebaseapp.com",
    projectId: "china-scholarships",
    storageBucket: "china-scholarships.firebasestorage.app",
    messagingSenderId: "855099971143",
    appId: "1:855099971143:web:8e309c3dcfd663674c0362",
    measurementId: "G-HQMXT1SF61"
};

// Initialize Firebase
function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded. Check script tags in HTML.');
        setTimeout(initializeFirebase, 100);
        return;
    }

    try {
        // Check if Firebase is already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}
