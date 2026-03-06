// ===== CONTACT ADMIN FORM LOGIC =====
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('contactAdminForm');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const subject = document.getElementById('adminMessageSubject').value.trim();
            const message = document.getElementById('adminMessageBody').value.trim();
            const successEl = document.getElementById('contactAdminSuccess');
            const errorEl = document.getElementById('contactAdminError');
            successEl.style.display = 'none';
            errorEl.style.display = 'none';
            if (!subject || !message) {
                errorEl.textContent = 'Please fill in all fields.';
                errorEl.style.display = 'block';
                return;
            }
            try {
                const user = firebase.auth().currentUser;
                if (!user) throw new Error('Not authenticated');
                // Fetch agent name (from global or Firestore)
                let agentName = '';
                let agentEmail = '';
                if (window.currentUser && window.currentUser.firstName) {
                    agentName = window.currentUser.firstName + ' ' + (window.currentUser.lastName || '');
                    agentEmail = window.currentUser.email || '';
                } else {
                    // fallback: fetch from Firestore
                    const doc = await firebase.firestore().collection('agents').doc(user.uid).get();
                    if (doc.exists) {
                        const d = doc.data();
                        agentName = (d.firstName || '') + ' ' + (d.lastName || '');
                        agentEmail = d.email || '';
                    }
                }
                await firebase.firestore().collection('messages').add({
                    type: 'agent-to-admin',
                    agentId: user.uid,
                    agentName,
                    agentEmail,
                    subject,
                    message,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'unread'
                });
                form.reset();
                successEl.style.display = 'block';
                setTimeout(() => { successEl.style.display = 'none'; }, 2500);
            } catch (err) {
                errorEl.textContent = err.message || 'Failed to send message.';
                errorEl.style.display = 'block';
            }
        });
    }
});
// Utility: lightweight toast for user feedback (keeps CSS intact)
function showToast(message, duration = 3000) {
    let toast = document.getElementById('agentToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'agentToast';
        toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:10px 16px;border-radius:8px;z-index:9999;max-width:90%;text-align:center;`;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// Utility: simple confirmation modal
function showConfirmModal({ title = 'Confirm', message = '', confirmText = 'Yes', cancelText = 'Cancel' } = {}) {
    return new Promise(resolve => {
        let modal = document.getElementById('agentConfirmModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'agentConfirmModal';
            modal.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
            modal.innerHTML = `
                <div style="background:#fff;padding:18px;border-radius:8px;max-width:520px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
                    <h3 id="agentConfirmTitle" style="margin:0 0 8px 0;font-size:1.05em;"></h3>
                    <p id="agentConfirmMessage" style="color:var(--gray);margin:0 0 16px 0;"></p>
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button id="agentConfirmCancel" class="btn-small btn-outline-secondary">${cancelText}</button>
                        <button id="agentConfirmOk" class="btn-small btn-danger">${confirmText}</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('agentConfirmTitle').textContent = title;
        document.getElementById('agentConfirmMessage').textContent = message;
        modal.style.display = 'flex';
        const ok = document.getElementById('agentConfirmOk');
        const cancel = document.getElementById('agentConfirmCancel');
        function cleanup(result) {
            modal.style.display = 'none';
            ok.removeEventListener('click', onOk);
            cancel.removeEventListener('click', onCancel);
            resolve(result);
        }
        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
    });
}
// ===== REAL-TIME ANNOUNCEMENTS LIST (AGENT DASHBOARD) =====
document.addEventListener('DOMContentLoaded', function () {
    // ===== REAL-TIME UNREAD BADGE FOR MESSAGES TAB =====
    firebase.auth().onAuthStateChanged(function (user) {
        if (!user) return;
        const uid = user.uid;
        const badge = document.querySelector('.nav-item[data-section="messages"] .badge-messages');
        function updateBadge(count) {
            if (badge) {
                badge.style.display = count > 0 ? 'inline-block' : 'none';
                badge.textContent = count > 0 ? count : '';
            }
        }
        // Only count admin replies (messages where recipientId is agent and senderRole is 'admin' and read is false)
        firebase.firestore().collection('messages')
            .where('recipientId', '==', uid)
            .where('senderRole', '==', 'admin')
            .where('read', '==', false)
            .onSnapshot(snapshot => {
                updateBadge(snapshot.size);
            });
    });
    // ===== AGENT MESSAGES TAB LOGIC =====
    // Sidebar navigation handler
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
            const target = document.getElementById(section + '-section');
            if (target) {
                target.classList.add('active');
                target.style.display = '';
            }
            // Mark messages as read when opening Messages tab
            if (section === 'messages') {
                firebase.auth().onAuthStateChanged(function (user) {
                    if (!user) return;
                    const uid = user.uid;
                    firebase.firestore().collection('messages')
                        .where('recipientId', '==', uid)
                        .where('read', '==', false)
                        .get()
                        .then(snapshot => {
                            const batch = firebase.firestore().batch();
                            snapshot.forEach(doc => {
                                batch.update(doc.ref, { read: true });
                            });
                            if (!snapshot.empty) return batch.commit();
                        });
                });
            }
        });
    });

    // Real-time messages listener
    firebase.auth().onAuthStateChanged(function (user) {
        if (!user) return;
        const uid = user.uid;
        const messagesList = document.getElementById('agentMessagesList');
        if (!messagesList) return;
        firebase.firestore().collection('messages')
            .where('recipientId', '==', uid)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                let html = '';
                if (snapshot.empty) {
                    html = '<div style="color:var(--gray);text-align:center;padding:40px;">No messages yet.</div>';
                } else {
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        html += `<div style="background:#f8f9ff;padding:16px;border-radius:8px;margin-bottom:12px;box-shadow:0 2px 8px #e1e5ee;">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <i class="fas fa-envelope" style="color:var(--primary);"></i>
                                    <div style="flex:1;">
                                        <div style="font-weight:600;font-size:1.05em;">Admin</div>
                                        <div style="color:var(--gray);font-size:0.97em;margin-top:2px;">${data.text}</div>
                                        <div style="color:#888;font-size:0.85em;margin-top:6px;">${data.timestamp && data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : ''}</div>
                                        <div style="margin-top:6px;font-size:0.9em;">
                                            ${data.read ? '<span style="color:#28a745;"><i class="fas fa-check-circle"></i> Read</span>' : '<span style="color:#e74c3c;"><i class="fas fa-circle"></i> Unread</span>'}
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                    });
                }
                messagesList.innerHTML = html;
            });
    });
    // Announcements handled by js/announcements-view.js
});
// Handle Check Application Status button click
function handleCheckStatusClick(btn) {
    // Get agent details from button data attributes
    const agentId = btn.getAttribute('data-agent-id');
    const agentName = btn.getAttribute('data-agent-name');
    const agentEmail = btn.getAttribute('data-agent-email');
    const agentPhone = btn.getAttribute('data-agent-phone');
    const agentAvatar = btn.getAttribute('data-agent-avatar');
    const studentId = btn.getAttribute('data-student-id');

    // Switch to status section
    switchSection && switchSection('status');

    // Fetch application data from Firestore (activeApplications) where studentId and agentId match
    if (window.firebase && firebase.firestore) {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const statusContent = document.getElementById('statusContent');
        if (statusContent) statusContent.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">Loading application status...</p>';

        // Real-time listener
        firebase.firestore().collection('activeApplications')
            .where('studentId', '==', studentId)
            .where('agentId', '==', agentId)
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    if (statusContent) statusContent.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No application found for this agent/student.</p>';
                    return;
                }
                // Find first non-cancelled application
                let foundDoc = null;
                for (let i = 0; i < snapshot.docs.length; i++) {
                    const d = snapshot.docs[i];
                    const data = d.data();
                    if (!data || data.applicationStage === 'cancelled') continue;
                    foundDoc = d;
                    break;
                }
                if (!foundDoc) {
                    if (statusContent) statusContent.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No application found for this agent/student.</p>';
                    return;
                }
                const app = foundDoc.data();
                app.id = foundDoc.id;
                // Attach agent details from the clicked card (for fallback)
                app.agentName = agentName;
                app.agentEmail = agentEmail;
                app.agentPhone = agentPhone;
                app.agentAvatar = agentAvatar;
                renderApplicationTracking(app);
            });
    }
}

// Render application tracking template with all fields populated
function renderApplicationTracking(app) {
    const statusContent = document.getElementById('statusContent');
    if (!statusContent) return;

    // Only show progress bar, timeline, and status badge
    const stages = [
        { key: 'submitted', label: 'Submitted' },
        { key: 'under_review', label: 'Under Review' },
        { key: 'additional_info', label: 'Additional Info' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' }
    ];
    const progressMap = {
        submitted: 20,
        under_review: 40,
        additional_info: 60,
        approved: 100,
        rejected: 100
    };
    const colorMap = {
        approved: '#28a745',
        rejected: '#dc3545',
        submitted: '#007bff',
        under_review: '#ffc107',
        additional_info: '#17a2b8'
    };
    const currentStageIndex = stages.findIndex(s => s.key === app.applicationStage);
    const progressPercent = progressMap[app.applicationStage] || 0;
    const progressColor = app.applicationStage === 'rejected' ? '#dc3545' : '#007bff';

    // Timeline
    let timelineHtml = '<div class="timeline">';
    stages.forEach((stage, idx) => {
        const date = app.timelineDates && app.timelineDates[stage.key] ? new Date(app.timelineDates[stage.key]).toLocaleDateString() : '-';
        timelineHtml += `<div class="timeline-item${idx <= currentStageIndex ? ' active' : ''}">
            <div class="timeline-dot"></div>
            <div class="timeline-label">${stage.label}</div>
            <div class="timeline-date">${date}</div>
        </div>`;
    });
    timelineHtml += '</div>';

    // Status badge
    const statusBadge = `<span class="status-badge status-${app.applicationStage}" style="background:${colorMap[app.applicationStage] || '#007bff'};color:#fff;padding:2px 8px;border-radius:8px;">${app.applicationStage ? app.applicationStage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'}</span>`;

    // Progress bar
    const progressBarHtml = `<div class="progress-bar-container" style="background:#e1e5ee;height:8px;border-radius:6px;margin:12px 0 18px 0;">
        <div class="progress-bar" style="width:${progressPercent}%;height:8px;border-radius:6px;background:${progressColor};transition:width 0.4s;"></div>
    </div>`;

    // Render only progress bar, timeline, and status badge
    statusContent.innerHTML = `
        <div class="tracking-status-row">
            <div>Current Stage: ${statusBadge}</div>
            ${progressBarHtml}
        </div>
        ${timelineHtml}
        <div class="tracking-meta">
            <div>Application ID: ${app.id}</div>
            <div>Student: ${app.studentName || '-'} </div>
            <div>Started: ${app.timestamp ? (app.timestamp.toDate ? app.timestamp.toDate().toLocaleString() : new Date(app.timestamp).toLocaleString()) : '-'} </div>
        </div>
    `;
}
/**
 * Render active applications in Application Status section
 */
function renderStatusApplications() {
    const container = document.getElementById('statusContent');
    if (!container) return;
    if (activeApplications.length === 0) {
        container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No active applications yet.</p>';
        return;
    }
    container.innerHTML = '';
    const stages = [
        { key: 'started', label: 'Started' },
        { key: 'documents', label: 'Documents' },
        { key: 'submitted', label: 'Submitted' },
        { key: 'interview', label: 'Interview' },
        { key: 'offer', label: 'Offer' },
        { key: 'completed', label: 'Completed' }
    ];
    const stageRequirements = {
        started: '<div style="color:var(--primary);font-weight:600;">Contact the student and explain the process. Collect initial info.</div>',
        documents: '<div style="color:var(--primary);font-weight:600;">Collect and verify all required documents from the student.</div><ul style="margin:10px 0 0 18px;"><li>Passport Copy</li><li>Academic Transcripts</li><li>Recommendation Letters</li><li>Personal Statement</li></ul>',
        submitted: '<div style="color:var(--primary);font-weight:600;">Review and submit the application to the university.</div>',
        interview: '<div style="color:var(--primary);font-weight:600;">Prepare the student for the interview. Share tips and schedule.</div>',
        offer: '<div style="color:var(--primary);font-weight:600;">Guide the student through the offer acceptance process.</div>',
        completed: '<div style="color:var(--primary);font-weight:600;">Application process is complete. Ensure student is enrolled.</div>'
    };
    activeApplications.forEach(app => {
        const card = document.createElement('div');
        card.className = 'active-application-item';
        // Find current stage index
        const currentStageIdx = stages.findIndex(s => s.key === app.applicationStage);
        // Only allow next stage selection (sequential)
        let optionsHtml = '';
        stages.forEach((stage, idx) => {
            let disabled = '';
            if (idx > currentStageIdx + 1) disabled = 'disabled';
            if (idx < currentStageIdx) disabled = 'disabled';
            optionsHtml += `<option value="${stage.key}" ${app.applicationStage === stage.key ? 'selected' : ''} ${disabled}>${stage.label}</option>`;
        });
        // Next and previous stage for buttons
        const nextStage = stages[currentStageIdx + 1] ? stages[currentStageIdx + 1].key : null;
        const prevStage = stages[currentStageIdx - 1] ? stages[currentStageIdx - 1].key : null;
        // Next stage requirements
        let nextReqHtml = '';
        if (nextStage && stageRequirements[nextStage]) {
            nextReqHtml = `<div class="next-stage-req" style="margin-top:12px;background:#f8f9fa;padding:10px 12px;border-radius:6px;"><strong>Next Stage Requirements:</strong><br>${stageRequirements[nextStage]}</div>`;
        }
        // Button HTML
        let buttonHtml = '<div style="display:flex;gap:10px;margin-top:10px;">';
        if (prevStage) {
            buttonHtml += `<button class="btn-small btn-outline-secondary prev-stage-btn" data-app-id="${app.id}" style="padding:6px 14px;border-radius:5px;border:1px solid #6c757d;background:#fff;color:#6c757d;font-weight:600;transition:background 0.2s;">Previous Stage</button>`;
        }
        if (nextStage) {
            buttonHtml += `<button class="btn-small btn-success complete-stage-btn" data-app-id="${app.id}" style="padding:6px 14px;border-radius:5px;background:#28a745;color:#fff;font-weight:600;border:none;transition:background 0.2s;">Complete Current Stage</button>`;
        }
        // Add cancel button to allow agents to cancel an active application
        buttonHtml += `<button class="btn-small btn-danger cancel-application-btn" data-app-id="${app.id}" data-student-id="${app.studentId}" style="padding:6px 14px;margin-left:8px;">Cancel Application</button>`;
        buttonHtml += '</div>';
        card.innerHTML = `
            <div class="app-header">
                <div>
                    <h4>${app.studentName}</h4>
                    <p class="app-details">${app.studentEmail}</p>
                </div>
                <div>
                    <span class="app-status-badge">${app.applicationStage}</span>
                </div>
            </div>
            <div class="app-avatar"><img src="${app.studentAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.studentName)}" alt="avatar" style="width:40px;height:40px;border-radius:50%;"></div>
            <p class="app-date">Started: ${app.timestamp instanceof Date ? app.timestamp.toLocaleString() : ''}</p>
            <div style="margin-top:10px;">
                <select class="stage-select" data-app-id="${app.id}">
                    ${optionsHtml}
                </select>
            </div>
            ${buttonHtml}
            ${nextReqHtml}
        `;
        container.appendChild(card);
    });
    // Attach cancel handlers for status cards
    container.querySelectorAll('.cancel-application-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const appId = this.getAttribute('data-app-id');
            const studentId = this.getAttribute('data-student-id');
            const confirmed = await showConfirmModal({
                title: 'Cancel Application',
                message: 'Are you sure you want to cancel this application? This action cannot be undone.',
                confirmText: 'Yes, Cancel',
                cancelText: 'Keep'
            });
            if (!confirmed) return;
            this.disabled = true;
            this.textContent = 'Cancelling...';
            try {
                await firebase.firestore().collection('activeApplications').doc(appId).update({ applicationStage: 'cancelled', cancelledAt: firebase.firestore.FieldValue.serverTimestamp() });
                showToast('Application cancelled successfully');
                setStartButtonState(studentId, { text: 'Start Application', disabled: false });
            } catch (err) {
                console.error('Failed to cancel application', err);
                showToast('Failed to cancel application');
                this.disabled = false;
                this.textContent = 'Cancel Application';
            }
        });
    });
    // Add event listeners for stage select (only allow adjacent)
    container.querySelectorAll('.stage-select').forEach(select => {
        select.addEventListener('change', function () {
            const appId = this.getAttribute('data-app-id');
            const newStage = this.value;
            const app = activeApplications.find(a => a.id === appId);
            const currentIdx = stages.findIndex(s => s.key === app.applicationStage);
            const newIdx = stages.findIndex(s => s.key === newStage);
            if (Math.abs(newIdx - currentIdx) === 1) {
                updateApplicationStage(appId, newStage);
            } else {
                alert('You can only move to the next or previous stage sequentially.');
                this.value = app.applicationStage;
            }
        });
    });
    // Add event listeners for Complete Current Stage button
    container.querySelectorAll('.complete-stage-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const appId = this.getAttribute('data-app-id');
            const app = activeApplications.find(a => a.id === appId);
            const currentIdx = stages.findIndex(s => s.key === app.applicationStage);
            const nextStage = stages[currentIdx + 1] ? stages[currentIdx + 1].key : null;
            if (nextStage) {
                updateApplicationStage(appId, nextStage);
            }
        });
    });
    // Add event listeners for Previous Stage button
    container.querySelectorAll('.prev-stage-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const appId = this.getAttribute('data-app-id');
            const app = activeApplications.find(a => a.id === appId);
            const currentIdx = stages.findIndex(s => s.key === app.applicationStage);
            const prevStage = stages[currentIdx - 1] ? stages[currentIdx - 1].key : null;
            if (prevStage) {
                updateApplicationStage(appId, prevStage);
            }
        });
    });
}

/**
 * Update application stage in Firestore
 */
async function updateApplicationStage(appId, newStage) {
    try {
        await firebase.firestore().collection('activeApplications').doc(appId).update({
            applicationStage: newStage
        });
    } catch (err) {
        alert('Failed to update application stage: ' + err.message);
    }
}
// Store and render active applications in memory for now
let activeApplications = [];

/**
 * Start application for a student: copy details to Active Applications section and Firestore
 */
async function startApplicationForStudent({ studentId, studentName, studentEmail, studentAvatar }) {
    if (!user || !user.uid) {
        showToast('You must be signed in to start an application');
        return;
    }
    // Resolve agent document id to store in activeApplications
    const resolvedAgentId = await resolveAgentDocId(user.uid) || user.uid;
    const agentId = resolvedAgentId;
    // Disable the start button and show loading state
    setStartButtonState(studentId, { text: 'Starting...', disabled: true });

    try {
        // Check for existing active application for this agent/student
        const existingQ = await firebase.firestore().collection('activeApplications')
            .where('studentId', '==', studentId)
            .where('agentId', '==', agentId)
            .get();
        // Consider an existing active application only if it's not cancelled
        let hasActive = false;
        existingQ.forEach(d => {
            const dd = d.data();
            if (!dd || dd.applicationStage === 'cancelled') return;
            hasActive = true;
        });
        if (hasActive) {
            showToast('Application already started');
            setStartButtonState(studentId, { text: 'Application Started', disabled: true });
            return;
        }

        // Create new application
        const docRef = await firebase.firestore().collection('activeApplications').add({
            studentId,
            studentName,
            studentEmail,
            studentAvatar,
            agentId,
            applicationStage: 'started',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Optimistic UI: mark button as started
        setStartButtonState(studentId, { text: 'Application Started', disabled: true });
        showToast('Application started successfully');
        // Firestore listener will update activeApplications and UI
    } catch (err) {
        console.error('startApplicationForStudent error', err);
        showToast('Failed to start application: ' + (err.message || 'Unknown error'));
        // restore button to original
        setStartButtonState(studentId, { text: 'Start Application', disabled: false });
    }
}

// Helper: set Start Application button state for a student
function setStartButtonState(studentId, { text, disabled }) {
    document.querySelectorAll('.start-application-btn').forEach(btn => {
        if (btn.getAttribute('data-student-id') === (studentId || '')) {
            if (typeof text !== 'undefined') btn.textContent = text;
            if (typeof disabled !== 'undefined') btn.disabled = !!disabled;
            if (disabled) btn.classList.add('disabled'); else btn.classList.remove('disabled');
        }
    });
}

// Helper: sync all Start Application buttons based on activeApplications for current agent
async function updateStartButtonsState() {
    if (!user || !user.uid) return;
    const resolvedAgentId = await resolveAgentDocId(user.uid) || user.uid;
    document.querySelectorAll('.start-application-btn').forEach(btn => {
        const sid = btn.getAttribute('data-student-id');
        const exists = activeApplications.some(a => a.studentId === sid && a.agentId === resolvedAgentId);
        if (exists) {
            setStartButtonState(sid, { text: 'Application Started', disabled: true });
        } else {
            setStartButtonState(sid, { text: 'Start Application', disabled: false });
        }
    });
}

/**
 * Render Active Applications section in the dashboard
 */
function renderActiveApplications() {
    const container = document.getElementById('activeApplicationsList');
    if (!container) return;
    if (activeApplications.length === 0) {
        container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">No active applications yet.</p>';
        return;
    }
    container.innerHTML = '';
    activeApplications.forEach(app => {
        const card = document.createElement('div');
        card.className = 'active-application-item';
        card.innerHTML = `
            <div class="app-header">
                <div>
                    <h4>${app.studentName}</h4>
                    <p class="app-details">${app.studentEmail}</p>
                </div>
                <div>
                    <span class="app-status-badge">${app.applicationStage}</span>
                </div>
            </div>
            <div class="app-avatar"><img src="${app.studentAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.studentName)}" alt="avatar" style="width:40px;height:40px;border-radius:50%;"></div>
            <p class="app-date">Started: ${app.timestamp instanceof Date ? app.timestamp.toLocaleString() : ''}</p>
            <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
                <button class='btn-small btn-outline-secondary view-application-btn' data-app-id="${app.id}">View</button>
                <button class='btn-small btn-danger cancel-application-btn' data-app-id="${app.id}" data-student-id="${app.studentId}">Cancel Application</button>
            </div>
        `;
        container.appendChild(card);
    });
    // Attach cancel handlers
    container.querySelectorAll('.cancel-application-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const appId = this.getAttribute('data-app-id');
            const studentId = this.getAttribute('data-student-id');
            const confirmed = await showConfirmModal({
                title: 'Cancel Application',
                message: 'Are you sure you want to cancel this application? This action cannot be undone.',
                confirmText: 'Yes, Cancel',
                cancelText: 'Keep'
            });
            if (!confirmed) return;
            // show loading state
            this.disabled = true;
            this.textContent = 'Cancelling...';
            try {
                await firebase.firestore().collection('activeApplications').doc(appId).update({ applicationStage: 'cancelled', cancelledAt: firebase.firestore.FieldValue.serverTimestamp() });
                showToast('Application cancelled successfully');
                // ensure Start Application is re-enabled for this student
                setStartButtonState(studentId, { text: 'Start Application', disabled: false });
                // The realtime listener will update UI (cancelled apps are filtered out)
            } catch (err) {
                console.error('Failed to cancel application', err);
                showToast('Failed to cancel application');
                this.disabled = false;
                this.textContent = 'Cancel Application';
            }
        });
    });
    // After render, sync start buttons
    updateStartButtonsState();
}
// ===== AGENT DASHBOARD JAVASCRIPT =====


// Unified user object for the current authenticated agent
let user = null; // Will hold merged auth and Firestore agent data
let currentSection = 'dashboard';
let assignedStudents = [];

// === REAL-TIME NOTIFICATION LISTENER ===
function setupNotificationRealtimeListener(userId) {
    firebase.firestore().collection('notifications')
        .where('recipientId', '==', userId)
        .where('read', '==', false)
        .onSnapshot(snapshot => {
            const unreadCount = snapshot.size;
            document.querySelectorAll('.notification-badge').forEach(el => {
                el.textContent = unreadCount > 0 ? unreadCount : '';
                el.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            });
        });
}

// === REAL-TIME ANNOUNCEMENTS LISTENER ===
let announcements = [];
let announcementUnsubscribe = null;
let unreadAnnouncements = 0;

function listenToAgentAnnouncements() {
    if (announcementUnsubscribe) announcementUnsubscribe();
    firebase.auth().onAuthStateChanged(function (user) {
        if (!user) return;
        // Listen for announcements targeted to all, agents, or this user
        announcementUnsubscribe = firebase.firestore().collection('announcements')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                announcements = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(a => {
                        const ta = a.targetAudience || a.targetType || 'all';
                        return (
                            ta === 'all' || ta === 'general' ||
                            ta === 'agent' || ta === 'agents' ||
                            (ta === 'individual' && (a.targetIds || []).includes(user.uid))
                        );
                    });
                // Count unread
                unreadAnnouncements = announcements.filter(a => !(a.readBy || []).includes(user.uid)).length;
                // Update badge
                document.querySelectorAll('.announcement-badge').forEach(el => {
                    el.textContent = unreadAnnouncements > 0 ? unreadAnnouncements : '';
                    el.style.display = unreadAnnouncements > 0 ? 'inline-block' : 'none';
                });
                renderAnnouncementsDropdown();
            });
    });
}

let announcementsDropdown = null;
function renderAnnouncementsDropdown() {
    if (!announcementsDropdown) {
        announcementsDropdown = document.createElement('div');
        announcementsDropdown.className = 'announcements-dropdown';
        announcementsDropdown.style.position = 'absolute';
        announcementsDropdown.style.top = '48px';
        announcementsDropdown.style.right = '0';
        announcementsDropdown.style.background = '#fff';
        announcementsDropdown.style.boxShadow = '0 8px 32px rgba(44,62,80,0.15)';
        announcementsDropdown.style.borderRadius = '10px';
        announcementsDropdown.style.minWidth = '320px';
        announcementsDropdown.style.maxWidth = '95vw';
        announcementsDropdown.style.zIndex = '9999';
        announcementsDropdown.style.padding = '0.5em 0';
        announcementsDropdown.style.display = 'none';
        document.body.appendChild(announcementsDropdown);
    }
    let html = '';
    if (!announcements || !announcements.length) {
        html = '<div style="padding: 1.2em; color: var(--gray); text-align: center;">No announcements yet.</div>';
    } else {
        announcements.slice(0, 10).forEach(a => {
            const isUnread = !(a.readBy || []).includes(firebase.auth().currentUser?.uid);
            html += `<div class="announcement-item${isUnread ? ' unread' : ''}" style="padding: 1em 1.5em; border-bottom: 1px solid #f0f0f0; background: ${isUnread ? '#f5f7ff' : '#fff'}; cursor: pointer; display: flex; align-items: flex-start; gap: 10px;">
                <i class="fas fa-bullhorn" style="color: ${isUnread ? 'var(--primary)' : 'var(--gray)'}; margin-top: 2px;"></i>
                <div style="flex:1;">
                    <div style="font-weight:600; color:${isUnread ? 'var(--primary)' : 'var(--gray)'};">${a.title || 'Announcement'}</div>
                    <div style="font-size:0.97em; color:var(--dark);">${a.content || ''}</div>
                    <div style="font-size:0.85em; color:var(--gray); margin-top:2px;">${a.timestamp && a.timestamp.seconds ? new Date(a.timestamp.seconds * 1000).toLocaleString() : ''}</div>
                    ${a.attachmentUrl ? `<div style='margin-top:8px;'><a href='${a.attachmentUrl}' target='_blank'>View Attachment</a></div>` : ''}
                </div>
            </div>`;
        });
    }
    announcementsDropdown.innerHTML = html;
}

function showAnnouncementsDropdown() {
    renderAnnouncementsDropdown();
    announcementsDropdown.style.display = 'block';
    // Mark all as read in Firestore
    const user = firebase.auth().currentUser;
    if (!user) return;
    announcements.filter(a => !(a.readBy || []).includes(user.uid)).forEach(a => {
        firebase.firestore().collection('announcements').doc(a.id).update({
            readBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });
    });
    // Hide badge
    document.querySelectorAll('.announcement-badge').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}
function hideAnnouncementsDropdown() {
    if (announcementsDropdown) announcementsDropdown.style.display = 'none';
}
document.addEventListener('click', function (e) {
    if (announcementsDropdown && !announcementsDropdown.contains(e.target) && !e.target.closest('.announcement-bell')) {
        hideAnnouncementsDropdown();
    }
});
document.body.addEventListener('click', function (e) {
    if (e.target.closest('.announcement-bell')) {
        if (announcementsDropdown && announcementsDropdown.style.display === 'block') {
            hideAnnouncementsDropdown();
        } else {
            showAnnouncementsDropdown();
        }
    }
});

// Start listening on load
document.addEventListener('DOMContentLoaded', function () {
    // ===== REAL-TIME ANNOUNCEMENTS LIST (MAIN SECTION) =====
    firebase.auth().onAuthStateChanged(function (user) {
        if (!user) return;
        (async () => {
            try {
                const uid = user.uid;
                const announcementsList = document.getElementById('agentAnnouncementsList');
                if (!announcementsList) return;
                // Get user's role from users collection
                const userDoc = await firebase.firestore().collection('users').doc(uid).get();
                const userRole = (userDoc.exists && userDoc.data().role) ? userDoc.data().role : 'agent';
                console.log('[Announcements] current user:', uid, 'role:', userRole);

                // Build query: try indexed 'in' query first, otherwise fall back to client-side filtering
                const col = firebase.firestore().collection('announcements');

                function normalizeRoleKey(r) {
                    if (!r) return r;
                    r = r.toString().toLowerCase();
                    if (r === 'agent') return 'agents';
                    if (r === 'student') return 'students';
                    return r;
                }

                function matchesAudienceField(aField, userRoleKey, uid, targetIds) {
                    const ta = (aField || '').toString().toLowerCase();
                    const roleKey = normalizeRoleKey(userRoleKey);
                    if (ta === 'all' || ta === 'general') return true;
                    if (ta === roleKey || ta === userRoleKey) return true;
                    if (ta === 'individual' && Array.isArray(targetIds) && targetIds.includes(uid)) return true;
                    return false;
                }

                console.log('[Announcements] preparing query for role:', userRole);

                try {
                    const query = col
                        .where('isActive', '==', true)
                        .where('targetAudience', 'in', [userRole, 'all'])
                        .orderBy('createdAt', 'desc');

                    query.onSnapshot(async (snapshot) => {
                        console.log('[Announcements] snapshot received, docs:', snapshot.size);
                        let unreadCount = 0;
                        announcementsList.innerHTML = '';
                        const readAnnouncements = (userDoc.exists && userDoc.data().readAnnouncements) ? userDoc.data().readAnnouncements : [];
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            console.log('[Announcements] doc:', doc.id, data);
                            const isRead = readAnnouncements && readAnnouncements.includes(doc.id);
                            if (!isRead) unreadCount++;
                            const card = document.createElement('div');
                            card.className = 'announcement-item' + (isRead ? ' read' : ' unread');
                            card.style = 'background:#f8f9ff;padding:16px;border-radius:8px;margin-bottom:12px;box-shadow:0 2px 8px #e1e5ee;position:relative;';
                            card.innerHTML = `
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <i class="fas fa-bullhorn" style="color:var(--primary);"></i>
                                    <div style="flex:1;">
                                        <div style="font-weight:600;font-size:1.05em;">${data.title || 'Announcement'}</div>
                                        <div style="color:var(--gray);font-size:0.97em;margin-top:2px;">${data.content || ''}</div>
                                        <div style="color:#888;font-size:0.85em;margin-top:6px;">${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</div>
                                    </div>
                                    ${!isRead ? `<button class="btn-secondary mark-announcement-read" data-announcement-id="${doc.id}" style="margin-left:10px;">Mark as Read</button>` : `<span style='color:#28a745;font-size:0.9em;margin-left:10px;'><i class='fas fa-check-circle'></i> Read</span>`}
                                </div>
                            `;
                            announcementsList.appendChild(card);
                        });
                        // Update badge in card header
                        const badgeEls = document.querySelectorAll('#announcementsCard .announcement-badge, .announcement-bell .announcement-badge');
                        badgeEls.forEach(badge => {
                            if (unreadCount > 0) {
                                badge.style.display = '';
                                badge.textContent = unreadCount;
                            } else {
                                badge.style.display = 'none';
                            }
                        });
                    }, (error) => {
                        console.error('[Announcements] onSnapshot error (indexed query):', error);
                        // Fallback
                        col.where('isActive', '==', true).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
                            console.log('[Announcements] fallback snapshot received, docs:', snapshot.size);
                            let unreadCount = 0;
                            announcementsList.innerHTML = '';
                            const readAnnouncements = (userDoc.exists && userDoc.data().readAnnouncements) ? userDoc.data().readAnnouncements : [];
                            snapshot.forEach(doc => {
                                const data = doc.data();
                                if (!matchesAudienceField(data.targetAudience || data.targetType, userRole, uid, data.targetIds)) return;
                                const isRead = readAnnouncements && readAnnouncements.includes(doc.id);
                                if (!isRead) unreadCount++;
                                const card = document.createElement('div');
                                card.className = 'announcement-item' + (isRead ? ' read' : ' unread');
                                card.style = 'background:#f8f9ff;padding:16px;border-radius:8px;margin-bottom:12px;box-shadow:0 2px 8px #e1e5ee;position:relative;';
                                card.innerHTML = `
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <i class="fas fa-bullhorn" style="color:var(--primary);"></i>
                                        <div style="flex:1;">
                                            <div style="font-weight:600;font-size:1.05em;">${data.title || 'Announcement'}</div>
                                            <div style="color:var(--gray);font-size:0.97em;margin-top:2px;">${data.content || ''}</div>
                                            <div style="color:#888;font-size:0.85em;margin-top:6px;">${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</div>
                                        </div>
                                        ${!isRead ? `<button class="btn-secondary mark-announcement-read" data-announcement-id="${doc.id}" style="margin-left:10px;">Mark as Read</button>` : `<span style='color:#28a745;font-size:0.9em;margin-left:10px;'><i class='fas fa-check-circle'></i> Read</span>`}
                                    </div>
                                `;
                                announcementsList.appendChild(card);
                            });
                            const badgeEls = document.querySelectorAll('#announcementsCard .announcement-badge, .announcement-bell .announcement-badge');
                            badgeEls.forEach(badge => {
                                if (unreadCount > 0) {
                                    badge.style.display = '';
                                    badge.textContent = unreadCount;
                                } else {
                                    badge.style.display = 'none';
                                }
                            });
                        }, (err) => console.error('[Announcements] fallback onSnapshot failed', err));
                    });
                } catch (ex) {
                    console.error('[Announcements] indexed query setup failed, falling back:', ex);
                    col.where('isActive', '==', true).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
                        console.log('[Announcements] fallback snapshot received, docs:', snapshot.size);
                        let unreadCount = 0;
                        announcementsList.innerHTML = '';
                        const readAnnouncements = (userDoc.exists && userDoc.data().readAnnouncements) ? userDoc.data().readAnnouncements : [];
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            if (!matchesAudienceField(data.targetAudience || data.targetType, userRole, uid, data.targetIds)) return;
                            const isRead = readAnnouncements && readAnnouncements.includes(doc.id);
                            if (!isRead) unreadCount++;
                            const card = document.createElement('div');
                            card.className = 'announcement-item' + (isRead ? ' read' : ' unread');
                            card.style = 'background:#f8f9ff;padding:16px;border-radius:8px;margin-bottom:12px;box-shadow:0 2px 8px #e1e5ee;position:relative;';
                            card.innerHTML = `
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <i class="fas fa-bullhorn" style="color:var(--primary);"></i>
                                    <div style="flex:1;">
                                        <div style="font-weight:600;font-size:1.05em;">${data.title || 'Announcement'}</div>
                                        <div style="color:var(--gray);font-size:0.97em;margin-top:2px;">${data.content || ''}</div>
                                        <div style="color:#888;font-size:0.85em;margin-top:6px;">${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</div>
                                    </div>
                                    ${!isRead ? `<button class="btn-secondary mark-announcement-read" data-announcement-id="${doc.id}" style="margin-left:10px;">Mark as Read</button>` : `<span style='color:#28a745;font-size:0.9em;margin-left:10px;'><i class='fas fa-check-circle'></i> Read</span>`}
                                </div>
                            `;
                            announcementsList.appendChild(card);
                        });
                        const badgeEls = document.querySelectorAll('#announcementsCard .announcement-badge, .announcement-bell .announcement-badge');
                        badgeEls.forEach(badge => {
                            if (unreadCount > 0) {
                                badge.style.display = '';
                                badge.textContent = unreadCount;
                            } else {
                                badge.style.display = 'none';
                            }
                        });
                    }, (err) => console.error('[Announcements] fallback onSnapshot failed', err));
                }

                // Manual Refresh button
                const refreshBtn = document.getElementById('refreshAnnouncementsBtn');
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', async () => {
                        try {
                            console.log('[Announcements] manual refresh triggered');
                            const snap = await col
                                .where('isActive', '==', true)
                                .where('targetAudience', 'in', [userRole, 'all'])
                                .orderBy('createdAt', 'desc')
                                .get();
                            console.log('[Announcements] manual refresh docs:', snap.size);
                        } catch (err) {
                            console.error('[Announcements] manual refresh failed', err);
                        }
                    });
                }
            } catch (err) {
                console.error('[Announcements] setup failed', err);
            }
        })();
    });
    // Mark-as-read button handler (event delegation)
    const announcementsList = document.getElementById('agentAnnouncementsList') || document.getElementById('announcements-list');
    if (announcementsList) {
        announcementsList.addEventListener('click', async function (e) {
            if (e.target && e.target.classList.contains('mark-announcement-read')) {
                const annId = e.target.getAttribute('data-announcement-id');
                if (!annId) return;
                const user = firebase.auth().currentUser;
                if (!user) return;
                const uid = user.uid;
                // Atomically add to readAnnouncements array
                await firebase.firestore().collection('users').doc(uid).update({
                    readAnnouncements: firebase.firestore.FieldValue.arrayUnion(annId)
                }).catch(err => console.error('Mark announcement read failed', err));
            }
        });
    }
});
listenToAgentAnnouncements();

document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is logged in and fetch agent data
    firebase.auth().onAuthStateChanged(async (authUser) => {
        if (!authUser) {
            window.location.href = 'login.html';
            return;
        }
        // Get user data from users collection
        const userData = await getCurrentUserData();
        if (!userData.success || userData.data.role !== USER_ROLES.AGENT) {
            window.location.href = 'login.html';
            return;
        }
        // Listen to agent document for real-time updates
        firebase.firestore().collection('agents').doc(authUser.uid).onSnapshot(async (doc) => {
            if (!doc.exists) {
                showLimitedAgentView();
                return;
            }
            const agentData = doc.data();
            // Merge auth, user, and agent data into 'user'
            user = { ...authUser, ...userData.data, ...agentData };
            if (agentData.status === AGENT_STATUS.VERIFIED) {
                showFullAgentDashboard();
                // Real-time assigned students: query users where agentAssigned == current agent's uid
                loadAssignedStudentsRealtime(authUser.uid);
                // Real-time listener for active applications for this agent
                const resolvedAgentId = await resolveAgentDocId(authUser.uid) || authUser.uid;
                firebase.firestore().collection('activeApplications')
                    .where('agentId', '==', resolvedAgentId)
                    .orderBy('timestamp', 'desc')
                    .onSnapshot(snapshot => {
                        activeApplications = [];
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            // Filter out cancelled applications
                            if (data && data.applicationStage === 'cancelled') return;
                            activeApplications.push({
                                ...data,
                                id: doc.id,
                                timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date()
                            });
                        });
                        renderActiveApplications();
                        renderStatusApplications();
                        updateStartButtonsState();
                    });
            } else {
                showLimitedAgentView(agentData.status);
            }
        });
    });
    // Real-time assigned students: query users where agentAssigned == current agent's uid
    // Real-time listener for assignments where agentId matches current user ID
    async function loadAssignedStudentsRealtime(agentUid) {
        // Resolve agent document id in 'agents' collection. Some agents use the auth UID as the doc id,
        // others store auth uid in a `uid` field and have a different doc id. Normalize by trying both.
        let agentDocId = null;
        try {
            const directDoc = await firebase.firestore().collection('agents').doc(agentUid).get();
            if (directDoc.exists) agentDocId = directDoc.id;
            else {
                const q = await firebase.firestore().collection('agents').where('uid', '==', agentUid).limit(1).get();
                if (!q.empty) agentDocId = q.docs[0].id;
            }
        } catch (err) {
            console.error('Failed to resolve agent doc id for realtime listener', err);
        }

        const queryAgentId = agentDocId || agentUid;

        firebase.firestore().collection('assignments')
            .where('agentId', '==', queryAgentId)
            .onSnapshot(async snapshot => {
                const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log('Assignments updated (agent):', assignments);
                // Fetch student data for each assignment
                const studentPromises = assignments.map(async assignment => {
                    if (!assignment.studentId) return null;
                    const studentDoc = await firebase.firestore().collection('users').doc(assignment.studentId).get();
                    if (!studentDoc.exists) return null;
                    return { ...studentDoc.data(), id: studentDoc.id, assignmentId: assignment.id, assignmentData: assignment };
                });
                const students = (await Promise.all(studentPromises)).filter(Boolean);
                assignedStudents = students;
                renderAssignedStudents();
            });
    }

    function renderAssignedStudents() {
        const studentsContainer = document.getElementById('studentsList');
        if (!studentsContainer) return;
        if (!assignedStudents.length) {
            studentsContainer.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No students assigned yet</p>';
            return;
        }
        studentsContainer.innerHTML = '';
        assignedStudents.forEach(student => {
            const appliedDate = student.assignmentData && student.assignmentData.createdAt
                ? (student.assignmentData.createdAt.toDate ? student.assignmentData.createdAt.toDate().toLocaleDateString() : new Date(student.assignmentData.createdAt).toLocaleDateString())
                : 'N/A';
            const status = student.assignmentData.status || 'pending';
            const card = document.createElement('div');
            card.className = 'application-item';
            card.innerHTML = `
                <div class="app-header">
                    <div>
                        <h4>${student.firstName || student.studentName || 'Student'}</h4>
                        <p class="app-details">${student.email || student.studentEmail || ''}</p>
                    </div>
                </div>
                <p class="app-details">Email: ${student.email || student.studentEmail || '-'} • Phone: ${student.phone || '-'}</p>
                <p class="app-date">Assigned: ${appliedDate}</p>
                <p class="app-status">Status: <span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
                ${status === 'pending' ? `<button class='btn-small btn-success' onclick='acceptAssignment("${student.assignmentData.id}")'>Accept</button> <button class='btn-small btn-danger' onclick='declineAssignment("${student.assignmentData.id}")'>Decline</button>` : ''}
                <button class='btn-small btn-primary start-application-btn' data-student-id="${student.id || student.studentId}" data-student-name="${student.firstName || student.studentName || ''} ${student.lastName || ''}" data-student-email="${student.email || student.studentEmail || ''}" data-student-avatar="${student.avatar || student.logo || ''}">Start Application</button>
                <button class='btn-small btn-info check-status-btn' 
                    data-agent-id="${student.agentId || ''}"
                    data-agent-name="${student.agentName || ''}"
                    data-agent-email="${student.agentEmail || ''}"
                    data-agent-phone="${student.agentPhone || ''}"
                    data-agent-avatar="${student.agentAvatar || ''}"
                    data-student-id="${student.id || student.studentId}">
                    Check Application Status
                </button>
            `;
            studentsContainer.appendChild(card);
        });

        // Add event listeners for Start Application buttons
        document.querySelectorAll('.start-application-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const studentId = this.getAttribute('data-student-id');
                const studentName = this.getAttribute('data-student-name');
                const studentEmail = this.getAttribute('data-student-email');
                const studentAvatar = this.getAttribute('data-student-avatar');
                startApplicationForStudent({ studentId, studentName, studentEmail, studentAvatar });
            });
        });
        // Add event listeners for Check Application Status buttons (single pass)
        document.querySelectorAll('.check-status-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                handleCheckStatusClick(this);
            });
        });
        // Ensure buttons reflect current activeApplications state
        updateStartButtonsState();
    }

    // Setup notification listener for this agent
    if (user && user.uid) {
        setupNotificationRealtimeListener(user.uid);
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                // Use toggleSidebar so overlay and body scroll state are handled
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
            }
        });
    });

    // Profile photo file input (optional)
    const profilePhotoInput = document.getElementById('profilePhoto');
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.getElementById('photoPreview').src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdateWithPhoto);
    }

    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (e) {
        const sidebar = document.querySelector('.sidebar');
        const clickedToggle = !!e.target.closest('.mobile-sidebar-toggle');

        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) && !clickedToggle) {
            // Use toggleSidebar to also hide overlay and restore body scroll
            toggleSidebar();
        }
    });
});

/**
 * Initialize dashboard with agent data
 */

// Show full dashboard for verified agents
async function showFullAgentDashboard() {
    // Show all dashboard sections
    document.querySelectorAll('.dashboard-section, .sidebar, .nav-item').forEach(el => el.style.display = '');
    // Hide pending/limited notice if present
    const pendingNotice = document.getElementById('pendingNotice');
    if (pendingNotice) pendingNotice.style.display = 'none';

    // Update UI with agent data from 'user'
    const firstName = user.firstName || 'Agent';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    document.querySelectorAll('#welcomeName').forEach(el => { if (el) el.textContent = firstName; });
    document.querySelectorAll('#userName').forEach(el => { if (el) el.textContent = fullName; });
    document.querySelectorAll('#userAvatar').forEach(el => { if (el) el.textContent = firstName.charAt(0).toUpperCase(); });

    await loadAssignedStudents();
    await loadStatistics();
    loadProfileData();
}

// Show limited dashboard for pending/unverified agents
function showLimitedAgentView(status) {
    // Hide all dashboard sections except the status/pending notice
    document.querySelectorAll('.dashboard-section, .sidebar, .nav-item').forEach(el => el.style.display = 'none');
    let notice = document.getElementById('pendingNotice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'pendingNotice';
        notice.style = 'padding:40px;text-align:center;';
        document.body.appendChild(notice);
    }
    let msg = '';
    if (status === AGENT_STATUS.PENDING) {
        msg = '<h2>Your agent application is pending approval.</h2><p>You will gain full dashboard access once verified by an administrator.</p>';
    } else if (status === AGENT_STATUS.REJECTED) {
        msg = '<h2>Your agent application was not approved.</h2><p>Please check your email for more information.</p>';
    } else {
        msg = '<h2>Agent dashboard access is restricted.</h2>';
    }
    notice.innerHTML = msg;
    notice.style.display = '';
}

/**
 * Load assigned students for this agent
 */
async function loadAssignedStudents() {
    // Get agent ID from the Firestore agents collection

    const agentDocsResult = await firebase.firestore()
        .collection('agents')
        .where('uid', '==', user.uid)
        .limit(1)
        .get();

    if (agentDocsResult.empty) {
        console.log('No agent profile found');
        return;
    }

    const agentDocId = agentDocsResult.docs[0].id;
    const result = await getAgentAssignedStudents(agentDocId);

    if (!result.success || result.data.length === 0) {
        const studentsContainer = document.getElementById('studentsList');
        if (studentsContainer) studentsContainer.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No students assigned yet</p>';
        return;
    }

    assignedStudents = result.data;

    // Render students into the students list
    const studentsContainer = document.getElementById('studentsList');
    if (studentsContainer) {
        studentsContainer.innerHTML = '';
        assignedStudents.forEach(app => {
            const appliedDate = app.createdAt ? (app.createdAt.toDate ? app.createdAt.toDate().toLocaleDateString() : new Date(app.createdAt).toLocaleDateString()) : 'N/A';
            const status = capitalizeStatus(app.status || 'pending');
            const card = document.createElement('div');
            card.className = 'application-item';
            card.innerHTML = `
                <div class="app-header">
                    <div>
                        <h4>${app.studentName || 'Student'}</h4>
                        <p class="app-details">${app.scholarshipName || ''}</p>
                    </div>
                    <div>
                        <span class="app-status-badge">${status}</span>
                    </div>
                </div>
                <p class="app-details">Email: ${app.studentEmail || '-'} • Phone: ${app.phone || '-'}</p>
                <p class="app-date">Applied: ${appliedDate}</p>
                <div style="margin-top:10px;">
                    <textarea placeholder="Notes for this student" data-app-id="${app.id}" style="width:100%;min-height:80px;margin-bottom:8px;">${app.agentNotes || ''}</textarea>
                    <button class="btn-secondary" data-app-id="${app.id}">Save Notes</button>
                </div>
            `;

            studentsContainer.appendChild(card);
        });

        // Attach save button listeners
        studentsContainer.querySelectorAll('button.btn-secondary').forEach(btn => {
            btn.addEventListener('click', async function () {
                const id = this.getAttribute('data-app-id');
                const textarea = studentsContainer.querySelector(`textarea[data-app-id="${id}"]`);
                const notes = textarea ? textarea.value : '';
                const res = await saveStudentNotes(id, notes);
                if (res.success) {
                    alert('Notes saved');
                } else {
                    alert('Failed to save notes: ' + res.error);
                }
            });
        });
    }
}

/**
 * Load and calculate statistics
 */
// Unified statistics updater that matches dashboard HTML ids
async function loadStatistics() {
    const total = assignedStudents.length;
    const pending = assignedStudents.filter(a => a.status === 'pending').length;
    const successful = assignedStudents.filter(a => a.status === 'accepted' || a.status === 'success').length;

    const totalEl = document.getElementById('totalStudents');
    const activeEl = document.getElementById('activeScholarships');
    const pendingEl = document.getElementById('pendingApplications');
    const memberEl = document.getElementById('memberSince');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = new Set(assignedStudents.map(a => a.scholarshipId || a.scholarshipName)).size;
    if (pendingEl) pendingEl.textContent = pending;

    // attempt to set member since from agent profile (appliedAt or createdAt)
    try {
        const agentDocId = await getAgentDocIdByUid(user.uid || getCurrentUserId());
        if (agentDocId) {
            const doc = await firebase.firestore().collection('agents').doc(agentDocId).get();
            if (doc.exists) {
                const data = doc.data();
                const joinDate = data.appliedAt ? (data.appliedAt.toDate ? data.appliedAt.toDate() : new Date(data.appliedAt)) : null;
                if (joinDate && memberEl) memberEl.textContent = joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }
        }
    } catch (e) {
        console.error('Error loading member since:', e);
    }
}

// (profile data loader consolidated below)

/**
 * Load application status
 */
function loadApplicationStatus() {
    const statusContent = document.getElementById('statusContent');

    if (user) {
        const agentStatus = user.role === USER_ROLES.AGENT ?
            (user.agentStatus || user.status || AGENT_STATUS.PENDING) : AGENT_STATUS.PENDING;

        let statusHTML = '';
        let statusMessage = '';
        let alertHTML = '';

        if (agentStatus === AGENT_STATUS.VERIFIED) {
            statusHTML = `
                <div class="status-info verified">
                    <div class="status-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="status-text">
                        <h3>Verified Agent</h3>
                        <p>Your application has been approved by our administrators. You can now start helping students with scholarship placements.</p>
                    </div>
                </div>
            `;
            statusMessage = 'Your agent status is verified. Welcome!';
        } else if (agentStatus === AGENT_STATUS.PENDING) {
            statusHTML = `
                <div class="status-info pending">
                    <div class="status-icon">
                        <i class="fas fa-hourglass-half"></i>
                    </div>
                    <div class="status-text">
                        <h3>Pending Review</h3>
                        <p>Your agent application is under review by our administrators. This typically takes 2-3 business days. We will notify you once a decision has been made.</p>
                    </div>
                </div>
            `;
            statusMessage = 'Your application is pending approval.';
            alertHTML = `
                <div class="alert alert-info" id="statusAlert">
                    <i class="fas fa-info-circle"></i>
                    <span>Your agent application is being reviewed. You'll be notified once it's approved.</span>
                </div>
            `;
        } else if (agentStatus === AGENT_STATUS.REJECTED) {
            statusHTML = `
                <div class="status-info rejected">
                    <div class="status-icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="status-text">
                        <h3>Application Rejected</h3>
                        <p>Unfortunately, your application was not approved at this time. Please check your email for more details.</p>
                    </div>
                </div>
            `;
            statusMessage = 'Your application was not approved.';
        }

        statusContent.innerHTML = statusHTML;
        document.getElementById('statusMessage').textContent = statusMessage;

        if (alertHTML) {
            const dashboardSection = document.getElementById('dashboard-section');
            const existingAlert = dashboardSection.querySelector('.alert-info');
            if (existingAlert) {
                existingAlert.remove();
            }
            dashboardSection.insertAdjacentHTML('afterbegin', alertHTML);
        }
    }
}

/**
 * Load agent profile data into form
 */
function loadProfileData() {
    const firstNameEl = document.getElementById('firstName');
    if (firstNameEl) firstNameEl.value = user.firstName || '';
    const lastNameEl = document.getElementById('lastName');
    if (lastNameEl) lastNameEl.value = user.lastName || '';
    const emailEl = document.getElementById('email');
    if (emailEl) emailEl.value = user.email || '';
    const phoneEl = document.getElementById('phone');
    if (phoneEl) phoneEl.value = user.phone || '';
    const countryEl = document.getElementById('country');
    if (countryEl) countryEl.value = user.country || '';
    const universityEl = document.getElementById('university');
    if (universityEl) universityEl.value = user.university || '';
    const experienceEl = document.getElementById('experience');
    if (experienceEl) experienceEl.value = user.experience || 0;
}

/**
 * Load and display statistics
 */
// Note: statistics loader defined earlier (unified). This duplicate has been removed.

/**
 * Handle profile update
 */
async function handleProfileUpdate(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = document.getElementById('country').value;
    const university = document.getElementById('university').value.trim();
    const experience = document.getElementById('experience').value;

    if (!firstName || !lastName || !phone || !country || !university || !experience) {
        showError(document.getElementById('profileError'), 'All fields are required');
        return;
    }

    try {

        const uid = user.uid || getCurrentUserId();

        // Update user collection
        await firebase.firestore().collection('users').doc(uid).update({
            firstName,
            lastName,
            phone,
            country,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update agent collection
        await firebase.firestore().collection('agents').doc(uid).update({
            firstName,
            lastName,
            phone,
            country,
            university,
            experience: parseInt(experience),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        user = {
            ...user,
            firstName,
            lastName,
            phone,
            country,
            university,
            experience
        };

        const successElement = document.getElementById('profileSuccess');
        successElement.textContent = 'Profile updated successfully!';
        successElement.style.display = 'block';

        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    } catch (error) {
        showError(document.getElementById('profileError'), 'Failed to update profile: ' + error.message);
    }
}

/**
 * Wrapper expected by the form listener (keeps old name compatibility)
 */
async function handleAgentProfileUpdate(e) {
    // reuse existing handler
    return handleProfileUpdate(e);
}

/**
 * Save notes for a student application (called from UI)
 */
async function saveStudentNotes(applicationId, notes) {
    if (!applicationId) return { success: false, error: 'Missing application id' };
    try {
        await firebase.firestore().collection('applications').doc(applicationId).update({
            agentNotes: notes || '',
            agentNotesUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error saving notes:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Find agent document id by uid
 */
async function getAgentDocIdByUid(uid) {
    try {
        const snapshot = await firebase.firestore().collection('agents').where('uid', '==', uid).limit(1).get();
        if (snapshot.empty) return null;
        return snapshot.docs[0].id;
    } catch (error) {
        console.error('Error finding agent doc id:', error);
        return null;
    }
}

/**
 * Handle profile update with photo upload support
 */
async function handleProfileUpdateWithPhoto(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = document.getElementById('country').value;
    const university = document.getElementById('university').value.trim();
    const experience = document.getElementById('experience').value;
    const bio = document.getElementById('bio')?.value || '';

    if (!firstName || !lastName) {
        showError(document.getElementById('profileError'), 'First and last name are required');
        return;
    }

    try {

        const uid = user.uid || firebase.auth().currentUser.uid;

        // Find agent doc id
        const agentDocId = await getAgentDocIdByUid(user.uid || uid);

        const updates = {
            firstName,
            lastName,
            phone,
            country,
            university,
            experience: parseInt(experience) || 0,
            bio
        };

        // Check for profile photo input with id 'profilePhoto'
        const photoInput = document.getElementById('profilePhoto');
        if (photoInput && photoInput.files && photoInput.files.length > 0) {
            const file = photoInput.files[0];
            const uploadResult = await uploadAgentProfilePhoto(file, currentAgent.email || document.getElementById('email').value);
            if (uploadResult && uploadResult.success && uploadResult.url) {
                updates.profilePhoto = uploadResult.url;
            }
        }

        if (agentDocId) {
            await updateAgentProfile(agentDocId, updates);
        } else {
            // fallback: try update by uid as document id
            await firebase.firestore().collection('agents').doc(uid).update(updates);
        }

        // Also update users collection
        await firebase.firestore().collection('users').doc(uid).update({
            firstName,
            lastName,
            phone,
            country,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update local state
        user = { ...user, ...updates };

        const successElement = document.getElementById('profileSuccess');
        successElement.textContent = 'Profile updated successfully!';
        successElement.style.display = 'block';
        setTimeout(() => { successElement.style.display = 'none'; }, 3000);
    } catch (error) {
        showError(document.getElementById('profileError'), 'Failed to update profile: ' + error.message);
    }
}

/**
 * Format date helper
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const date = new Date(timestamp.toDate ? timestamp.toDate() : timestamp);
        return date.toLocaleDateString();
    } catch (e) {
        return 'N/A';
    }
}

/**
 * Capitalize status helper
 */
function capitalizeStatus(status) {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Handle password change
 */
async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('All fields are required');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        const user = firebase.auth().currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);

        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);

        document.getElementById('passwordForm').reset();
        alert('Password changed successfully!');
    } catch (error) {
        alert('Failed to change password: ' + error.message);
    }
}

/**
 * Switch section
 */
function switchSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    const sectionElement = document.getElementById(section + '-section');
    if (sectionElement) {
        sectionElement.classList.add('active');
    }

    // Add active class to nav item
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        profile: 'My Profile',
        status: 'Application Status',
        students: 'My Students',
        settings: 'Settings'
    };
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) {
        pageTitleEl.textContent = titles[section] || 'Dashboard';
    }

    // Scroll to top
    const dashContainer = document.querySelector('.dashboard-container');
    if (dashContainer) {
        dashContainer.scrollTop = 0;
    }

    currentSection = section;
}

/**
 * Logout agent
 */
async function logoutAgent() {
    const result = await logoutUser();
    if (result.success) {
        window.location.href = 'index.html';
    } else {
        alert('Failed to logout: ' + result.error);
    }
}

/**
 * Toggle sidebar
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const overlay = document.getElementById('sidebarOverlay');
    const container = document.querySelector('.dashboard-container');

    const becameActive = sidebar.classList.toggle('active');

    // Desktop: keep existing collapsed behavior for spacing
    if (window.innerWidth > 768) {
        sidebar.classList.toggle('collapsed');
        if (container) container.classList.toggle('collapsed');
    }

    // Mobile: show/hide overlay and disable body scroll when open
    if (overlay) {
        if (becameActive && window.innerWidth <= 768) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}

// Initialize overlay and nav link handlers for mobile
(function () {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
        });
    }

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
            }
        });
    });
})();

/**
 * Show error message
 */
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Cache/resolver for agent document id (agents collection doc id) given auth uid
let _cachedAgentDocId = null;
let _cachedAgentAuthUid = null;
async function resolveAgentDocId(authUid) {
    if (!authUid) return null;
    if (_cachedAgentAuthUid === authUid && _cachedAgentDocId) return _cachedAgentDocId;
    try {
        const direct = await firebase.firestore().collection('agents').doc(authUid).get();
        if (direct.exists) {
            _cachedAgentAuthUid = authUid;
            _cachedAgentDocId = direct.id;
            return _cachedAgentDocId;
        }
    } catch (e) {
        console.warn('Direct agent doc check failed', e);
    }
    try {
        const q = await firebase.firestore().collection('agents').where('uid', '==', authUid).limit(1).get();
        if (!q.empty) {
            _cachedAgentAuthUid = authUid;
            _cachedAgentDocId = q.docs[0].id;
            return _cachedAgentDocId;
        }
    } catch (e) {
        console.warn('Agent lookup by uid failed', e);
    }
    return null;
}

window.acceptAssignment = async function (assignmentId) {
    try {
        const ref = firebase.firestore().collection('assignments').doc(assignmentId);
        const snap = await ref.get();
        const data = snap.exists ? snap.data() : null;
        await ref.update({ status: 'accepted' });
        // Notify student that agent accepted
        try {
            if (data && data.studentId && window.Notifications) {
                const agentName = (window.user && (window.user.firstName || window.user.displayName)) || 'Your agent';
                await window.Notifications.createNotification({
                    recipientId: data.studentId,
                    type: 'assignment',
                    title: 'Agent accepted assignment',
                    content: `${agentName} accepted the assignment for your case.`,
                    link: '#assignments-section',
                    data: { assignmentId },
                    icon: 'fas fa-check'
                });
            }
        } catch (e) { console.error('notify accept error', e); }
        // Firestore listeners will auto-refresh agent and student dashboards
    } catch (err) {
        alert('Failed to accept assignment: ' + err.message);
    }
};

window.declineAssignment = async function (assignmentId) {
    try {
        const ref = firebase.firestore().collection('assignments').doc(assignmentId);
        const snap = await ref.get();
        const data = snap.exists ? snap.data() : null;
        await ref.update({ status: 'declined' });
        // Notify student that agent declined
        try {
            if (data && data.studentId && window.Notifications) {
                const agentName = (window.user && (window.user.firstName || window.user.displayName)) || 'Your agent';
                await window.Notifications.createNotification({
                    recipientId: data.studentId,
                    type: 'assignment',
                    title: 'Agent declined assignment',
                    content: `${agentName} declined the assignment. Please contact support.`,
                    link: '#messages-section',
                    data: { assignmentId },
                    icon: 'fas fa-times'
                });
            }
        } catch (e) { console.error('notify decline error', e); }
        // Firestore listeners will auto-refresh agent and student dashboards
    } catch (err) {
        alert('Failed to decline assignment: ' + err.message);
    }
};
