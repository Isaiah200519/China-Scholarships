// ===== FIREBASE AUTHENTICATION & DATABASE UTILITIES =====

// User roles enumeration
const USER_ROLES = {
    STUDENT: 'student',
    AGENT: 'agent',
    ADMIN: 'admin'
};

// Agent statuses
const AGENT_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
};

// ===== AUTHENTICATION FUNCTIONS =====

/**
 * Register a new user (Student only)
 */
async function registerUser(email, password, userData) {
    try {
        // Create user in Firebase Authentication
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // Create user document in Firestore
        await firebase.firestore().collection('users').doc(uid).set({
            uid: uid,
            email: email,
            role: USER_ROLES.STUDENT,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone || '',
            country: userData.country || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, uid: uid };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Register a new user with a specified role (student/agent/admin)
 * Creates Firebase Auth user, uploads profile photo if provided, and writes to users collection
 */
async function registerUserWithRole(email, password, userData, role = USER_ROLES.STUDENT, photoFile = null) {
    try {
        // Wait for firebase
        const firebaseReady = await waitForFirebase();
        if (!firebaseReady) return { success: false, error: 'Firebase not initialized' };

        // Create user in Firebase Authentication
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // Upload photo if provided
        let photoURL = null;
        if (photoFile) {
            try {
                photoURL = await uploadAgentProfilePhoto(photoFile, email);
            } catch (err) {
                console.warn('Profile photo upload failed:', err);
            }
        }

        // Build user document
        const userDoc = {
            uid: uid,
            email: email,
            role: role,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phone: userData.phone || '',
            country: userData.country || '',
            profilePhoto: photoURL || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add agent-specific fields when role is agent
        if (role === USER_ROLES.AGENT) {
            userDoc.status = AGENT_STATUS.PENDING; // pending until admin verification
            userDoc.experience = userData.experience || 0;
            userDoc.bio = userData.bio || '';
            userDoc.assignedStudentCount = 0;
            userDoc.successfulStudents = 0;
        }

        // For students mark as verified/active so they can login immediately
        if (role === USER_ROLES.STUDENT) {
            userDoc.status = 'verified';
        }

        // Write to users collection
        await firebase.firestore().collection('users').doc(uid).set(userDoc);

        // If agent, also create agent doc in 'agents' collection (for admin approval workflow)
        if (role === USER_ROLES.AGENT) {
            const agentDoc = {
                uid: uid,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: email,
                phone: userData.phone || '',
                experience: userData.experience || 0,
                bio: userData.bio || '',
                country: userData.country || '',
                profilePhoto: photoURL || null,
                status: AGENT_STATUS.PENDING,
                assignedStudentCount: 0,
                successfulStudents: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
                approvedAt: null
            };
            await firebase.firestore().collection('agents').doc(uid).set(agentDoc);
        }

        return { success: true, uid: uid };
    } catch (error) {
        console.error('registerUserWithRole error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Wait for Firebase to be initialized
 */
function waitForFirebase(timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                resolve(true);
            } else if (Date.now() - startTime < timeout) {
                setTimeout(checkFirebase, 100);
            } else {
                resolve(false);
            }
        };
        checkFirebase();
    });
}

/**
 * Login user
 */
async function loginUser(email, password) {
    try {
        // Wait for Firebase to be initialized
        const firebaseReady = await waitForFirebase();
        if (!firebaseReady) {
            return { success: false, error: 'Firebase is not initialized. Please refresh the page.' };
        }

        // Sign in with email and password
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        console.log('User signed in:', uid);

        // Get user data to determine role
        const userDoc = await firebase.firestore().collection('users').doc(uid).get();

        if (!userDoc.exists) {
            console.error('User document not found in Firestore');
            return { success: false, error: 'User profile not found in database' };
        }

        const userData = userDoc.data();

        return {
            success: true,
            uid: uid,
            role: userData.role || 'student',
            user: userData
        };
    } catch (error) {
        console.error('Login error:', error);

        // Handle specific Firebase errors
        let errorMessage = error.message;
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address. Please check your email or register a new account.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again. If you forgot your password, click "Forgot password?" below.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'This account has been disabled. Please contact support.';
        } else if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Logout user
 */
async function logoutUser() {
    try {
        await firebase.auth().signOut();
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current user data
 */
async function getCurrentUserData() {
    try {
        const user = firebase.auth().currentUser;

        if (!user) {
            return { success: false, error: 'No user logged in' };
        }

        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            return { success: false, error: 'User profile not found' };
        }

        return { success: true, data: userDoc.data() };
    } catch (error) {
        console.error('Error getting user data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if user is authenticated
 */
function isUserAuthenticated() {
    return firebase.auth().currentUser !== null;
}

/**
 * Get agent profile data from agents collection
 */
async function getAgentProfile(agentUid) {
    try {
        const agentDoc = await firebase.firestore().collection('agents').doc(agentUid).get();

        if (!agentDoc.exists) {
            return { success: false, error: 'Agent profile not found' };
        }

        return { success: true, data: agentDoc.data() };
    } catch (error) {
        console.error('Error getting agent profile:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
    return firebase.auth().currentUser?.uid || null;
}

// ===== AGENT MANAGEMENT FUNCTIONS =====

/**
 * Get all pending agent applications
 */
async function getPendingAgents() {
    try {
        const snapshot = await firebase.firestore()
            .collection('agents')
            .where('status', '==', AGENT_STATUS.PENDING)
            .orderBy('appliedAt', 'desc')
            .get();

        return { success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    } catch (error) {
        console.error('Error getting pending agents:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all verified agents
 */
async function getVerifiedAgents() {
    try {
        const snapshot = await firebase.firestore()
            .collection('agents')
            .where('status', '==', AGENT_STATUS.VERIFIED)
            .get();

        return { success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    } catch (error) {
        console.error('Error getting verified agents:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify an agent (Admin only)
 */
async function verifyAgent(agentUid) {
    try {
        await firebase.firestore().collection('agents').doc(agentUid).update({
            status: AGENT_STATUS.VERIFIED,
            verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error verifying agent:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject an agent (Admin only)
 */
async function rejectAgent(agentUid, reason = '') {
    try {
        await firebase.firestore().collection('agents').doc(agentUid).update({
            status: AGENT_STATUS.REJECTED,
            rejectionReason: reason,
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error rejecting agent:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update agent profile
 */
async function updateAgentProfile(agentUid, data) {
    try {
        await firebase.firestore().collection('agents').doc(agentUid).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating agent profile:', error);
        return { success: false, error: error.message };
    }
}

// ===== ADMIN FUNCTIONS =====

/**
 * Get all registered users (Admin only)
 */
async function getAllUsers() {
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .orderBy('createdAt', 'desc')
            .get();

        return { success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    } catch (error) {
        console.error('Error getting users:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user statistics (Admin only)
 */
async function getUserStatistics() {
    try {
        const usersSnapshot = await firebase.firestore().collection('users').get();
        const agentsSnapshot = await firebase.firestore().collection('agents').get();

        const totalUsers = usersSnapshot.size;
        const totalAgents = agentsSnapshot.size;

        let verifiedAgents = 0;
        let pendingAgents = 0;

        agentsSnapshot.forEach(doc => {
            const status = doc.data().status;
            if (status === AGENT_STATUS.VERIFIED) verifiedAgents++;
            else if (status === AGENT_STATUS.PENDING) pendingAgents++;
        });

        return {
            success: true,
            data: {
                totalUsers,
                totalAgents,
                verifiedAgents,
                pendingAgents
            }
        };
    } catch (error) {
        console.error('Error getting statistics:', error);
        return { success: false, error: error.message };
    }
}

// ===== STUDENT SCHOLARSHIP FUNCTIONS =====

/**
 * Create a new scholarship application
 */
async function createScholarshipApplication(applicationData) {
    try {
        const uid = getCurrentUserId();
        if (!uid) {
            return { success: false, error: 'User not authenticated' };
        }

        const docRef = await firebase.firestore().collection('applications').add({
            ...applicationData,
            studentUid: uid,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, applicationId: docRef.id };
    } catch (error) {
        console.error('Error creating application:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get student's applications
 */
/**
 * Register agent application (stored in Firestore pending admin approval)
 */
async function registerAgent(agentData, photoURL) {
    try {
        // Check if email already exists
        const existingUser = await firebase.firestore().collection('users').where('email', '==', agentData.email).limit(1).get();
        if (!existingUser.empty) {
            return { success: false, error: 'This email is already registered.' };
        }

        const existingAgent = await firebase.firestore().collection('agents').where('email', '==', agentData.email).limit(1).get();
        if (!existingAgent.empty) {
            return { success: false, error: 'This email has already applied to become an agent.' };
        }

        // Create agent document with pending status
        const agentRef = await firebase.firestore().collection('agents').add({
            firstName: agentData.firstName,
            lastName: agentData.lastName,
            email: agentData.email,
            phone: agentData.phone,
            experience: agentData.experience,
            bio: agentData.bio,
            country: agentData.country,
            profilePhoto: photoURL || null,
            status: AGENT_STATUS.PENDING,
            assignedStudentCount: 0,
            successfulStudents: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedAt: null,
            uid: null // Will be filled when admin approves
        });

        return { success: true, agentId: agentRef.id };
    } catch (error) {
        console.error('Agent registration error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Upload agent profile photo to Firebase Storage
 */
async function uploadAgentProfilePhoto(file, email) {
    return new Promise((resolve, reject) => {
        // Validate file
        if (file.size > 5 * 1024 * 1024) { // 5MB
            reject(new Error('File size must be less than 5MB'));
            return;
        }

        if (!file.type.startsWith('image/')) {
            reject(new Error('File must be an image'));
            return;
        }

        // Upload to Firebase Storage
        const storageRef = firebase.storage().ref();
        const fileName = `agents/${Date.now()}-${email}`;
        const fileRef = storageRef.child(fileName);

        fileRef.put(file).then(snapshot => {
            return snapshot.ref.getDownloadURL();
        }).then(url => {
            resolve(url);
        }).catch(error => {
            reject(error);
        });
    });
}

/**
 * Get pending agents for admin approval
 */
async function getPendingAgents() {
    try {
        const snapshot = await firebase.firestore()
            .collection('agents')
            .where('status', '==', AGENT_STATUS.PENDING)
            .get();

        return {
            success: true,
            data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };
    } catch (error) {
        console.error('Error fetching pending agents:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve agent application and create Firebase auth account
 */
async function approveAgent(agentId, tempPassword) {
    try {
        // Get agent data
        const agentDoc = await firebase.firestore().collection('agents').doc(agentId).get();
        if (!agentDoc.exists) {
            return { success: false, error: 'Agent not found' };
        }

        const agentData = agentDoc.data();
        // If the agent already has a linked uid (they registered during application),
        // simply update their user and agent records to verified.
        if (agentData.uid) {
            const uid = agentData.uid;

            try {
                // Update users/{uid} status to verified
                await firebase.firestore().collection('users').doc(uid).update({
                    status: AGENT_STATUS.VERIFIED,
                    verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {
                console.warn('Could not update users/{uid} while approving agent:', e);
            }

            // Update agent document
            await firebase.firestore().collection('agents').doc(agentId).update({
                status: AGENT_STATUS.VERIFIED,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Attempt to send welcome / password reset email to the agent
            try {
                await firebase.auth().sendPasswordResetEmail(agentData.email);
                // Mark in users doc that a reset email was sent
                try {
                    await firebase.firestore().collection('users').doc(uid).update({
                        passwordResetSentAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (e) {
                    console.warn('Could not write passwordResetSentAt to users doc:', e);
                }
            } catch (emailErr) {
                console.warn('Could not send password reset email to pre-registered agent:', emailErr);
            }

            return { success: true, uid: uid };
        }

        // Legacy flow: create Firebase Authentication account for the agent
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(agentData.email, tempPassword);
        const uid = userCredential.user.uid;

        // Create user document in Firestore
        await firebase.firestore().collection('users').doc(uid).set({
            uid: uid,
            email: agentData.email,
            role: USER_ROLES.AGENT,
            firstName: agentData.firstName,
            lastName: agentData.lastName,
            phone: agentData.phone,
            country: agentData.country,
            agentId: agentId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update agent status and uid
        await firebase.firestore().collection('agents').doc(agentId).update({
            status: AGENT_STATUS.VERIFIED,
            uid: uid,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Send password reset email so agent can set their own password
        await firebase.auth().sendPasswordResetEmail(agentData.email);

        return { success: true, uid: uid };
    } catch (error) {
        console.error('Agent approval error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject agent application
 */
async function rejectAgent(agentId) {
    try {
        await firebase.firestore().collection('agents').doc(agentId).update({
            status: AGENT_STATUS.REJECTED
        });

        return { success: true };
    } catch (error) {
        console.error('Agent rejection error:', error);
        return { success: false, error: error.message };
    }
}


/**
 * Get a student's applications
 */
async function getStudentApplications(studentUid) {
    try {
        if (!studentUid) return { success: false, error: 'Missing student UID' };

        // Query without orderBy to avoid requiring composite index
        const snapshot = await firebase.firestore()
            .collection('applications')
            .where('studentUid', '==', studentUid)
            .get();

        // Sort by createdAt in JavaScript (descending)
        const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applications.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });

        return { success: true, data: applications };
    } catch (error) {
        console.error('Error getting applications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get students assigned to an agent
 */
async function getAgentAssignedStudents(agentId) {
    try {
        // Query applications assigned to this agent
        const snapshot = await firebase.firestore()
            .collection('applications')
            .where('agentAssigned', '==', agentId)
            .get();

        // Sort by date
        const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applications.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });

        return { success: true, data: applications };
    } catch (error) {
        console.error('Error fetching agent students:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get agent profile by ID
 */
async function getAgentProfile(agentId) {
    try {
        const agentDoc = await firebase.firestore().collection('agents').doc(agentId).get();

        if (agentDoc.exists) {
            return { success: true, data: agentDoc.data() };
        } else {
            return { success: false, error: 'Agent not found' };
        }
    } catch (error) {
        console.error('Error fetching agent profile:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update agent profile
 */
async function updateAgentProfile(agentId, updates) {
    try {
        await firebase.firestore().collection('agents').doc(agentId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating agent profile:', error);
        return { success: false, error: error.message };
    }
}

// ===== FORM VALIDATION =====

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
    return password.length >= 6;
}

/**
 * Validate required fields
 */
function areRequiredFieldsFilled(fields) {
    return Object.values(fields).every(field => field && field.trim() !== '');
}

/**
 * Detect user role and redirect to appropriate dashboard
 */
async function redirectBasedOnRole() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                resolve({ success: false, message: 'No user logged in' });
                return;
            }

            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const role = userData.role || 'student';

                    let redirectUrl = 'login.html';
                    switch (role) {
                        case 'student':
                            redirectUrl = 'student-dashboard.html';
                            break;
                        case 'agent':
                            // Check if agent is verified/approved
                            if (userData.status === 'approved' || userData.verified) {
                                redirectUrl = 'agent-dashboard.html';
                            } else {
                                // Pending agent - might redirect to a pending page
                                redirectUrl = 'agent-dashboard.html';
                            }
                            break;
                        case 'admin':
                            redirectUrl = 'admin-dashboard.html';
                            break;
                    }

                    resolve({ success: true, role: role, redirect: redirectUrl, user: userData });
                } else {
                    resolve({ success: false, message: 'User profile not found' });
                }
            } catch (error) {
                console.error('Error detecting role:', error);
                resolve({ success: false, message: error.message });
            }
        });
    });
}
