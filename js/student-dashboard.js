// ===== AGENT ACTIONS: Dropdown, Report, Rating =====
document.addEventListener('click', function (e) {
    // Dropdown toggle
    if (e.target.classList.contains('agent-actions-btn')) {
        const wrapper = e.target.closest('.agent-actions-dropdown-wrapper');
        document.querySelectorAll('.agent-actions-dropdown').forEach(d => d.style.display = 'none');
        if (wrapper) {
            const dropdown = wrapper.querySelector('.agent-actions-dropdown');
            if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
        e.stopPropagation();
        return;
    }
    // Dropdown item click
    if (e.target.closest('.report-agent')) {
        const card = e.target.closest('.agent-card');
        if (!card) return;
        const agentName = card.querySelector('.agent-name')?.textContent || '';
        const agentId = getAgentIdFromCard(card);
        const reportAgentIdEl = document.getElementById('reportAgentId'); if (reportAgentIdEl) reportAgentIdEl.value = agentId;
        const reportAgentNameEl = document.getElementById('reportAgentName'); if (reportAgentNameEl) reportAgentNameEl.value = agentName;
        const reportMessageEl = document.getElementById('reportMessage'); if (reportMessageEl) reportMessageEl.value = '';
        const reportModalEl = document.getElementById('reportAgentModal'); if (reportModalEl) reportModalEl.style.display = 'flex';
        document.querySelectorAll('.agent-actions-dropdown').forEach(d => d.style.display = 'none');
        e.stopPropagation();
        return;
    }
    if (e.target.closest('.rate-agent')) {
        const card = e.target.closest('.agent-card');
        if (!card) return;
        const agentName = card.querySelector('.agent-name')?.textContent || '';
        const agentId = getAgentIdFromCard(card);
        const rateAgentIdEl = document.getElementById('rateAgentId'); if (rateAgentIdEl) rateAgentIdEl.value = agentId;
        const rateAgentNameEl = document.getElementById('rateAgentName'); if (rateAgentNameEl) rateAgentNameEl.value = agentName;
        const agentRatingValueEl = document.getElementById('agentRatingValue'); if (agentRatingValueEl) agentRatingValueEl.value = 0;
        const agentRatingCommentEl = document.getElementById('agentRatingComment'); if (agentRatingCommentEl) agentRatingCommentEl.value = '';
        resetStars();
        const rateModalEl = document.getElementById('rateAgentModal'); if (rateModalEl) rateModalEl.style.display = 'flex';
        document.querySelectorAll('.agent-actions-dropdown').forEach(d => d.style.display = 'none');
        e.stopPropagation();
        return;
    }
    // Close dropdowns if clicking outside
    document.querySelectorAll('.agent-actions-dropdown').forEach(d => d.style.display = 'none');
});

// Helper: escape HTML to prevent injection
function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (s) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
}

// Helper to get agentId from card (by searching for email or data attribute)
function getAgentIdFromCard(card) {
    // Try data-agent-id attribute
    if (card.dataset.agentId) return card.dataset.agentId;
    // Try email lookup (if unique)
    const email = card.querySelector('.agent-email')?.textContent;
    if (!email) return '';
    // This requires a mapping in your app; fallback to blank
    return '';
}

// Modal close buttons (guarded)
const closeReportModalBtn = document.getElementById('closeReportModal');
if (closeReportModalBtn) {
    closeReportModalBtn.onclick = function () {
        const m = document.getElementById('reportAgentModal');
        if (m) m.style.display = 'none';
    };
}
const closeRateModalBtn = document.getElementById('closeRateModal');
if (closeRateModalBtn) {
    closeRateModalBtn.onclick = function () {
        const m = document.getElementById('rateAgentModal');
        if (m) m.style.display = 'none';
    };
}

// Modal background click closes
document.querySelectorAll('.modal-bg').forEach(bg => {
    bg.addEventListener('click', function (e) {
        if (e.target === bg) bg.style.display = 'none';
    });
});

// Report form submit (guarded)
const reportAgentForm = document.getElementById('reportAgentForm');
if (reportAgentForm) {
    reportAgentForm.onsubmit = async function (e) {
        e.preventDefault();
        const agentIdEl = document.getElementById('reportAgentId');
        const agentNameEl = document.getElementById('reportAgentName');
        const messageEl = document.getElementById('reportMessage');
        const agentId = agentIdEl ? agentIdEl.value : '';
        const agentName = agentNameEl ? agentNameEl.value : '';
        const message = messageEl ? messageEl.value : '';
        const user = firebase.auth().currentUser;
        if (!user) return;
        const studentId = user.uid;
        const studentName = (window.currentUser?.firstName || '') + ' ' + (window.currentUser?.lastName || '');
        await firebase.firestore().collection('reports').add({
            studentId, studentName, agentId, agentName, message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        });
        const modal = document.getElementById('reportAgentModal');
        if (modal) modal.style.display = 'none';
        alert('Report submitted.');
    };
}

// Rating stars logic
const stars = document.querySelectorAll('#agentRatingStars .star');
if (stars && stars.length) {
    stars.forEach(star => {
        star.addEventListener('mouseenter', function () {
            highlightStars(this.dataset.value);
        });
        star.addEventListener('mouseleave', function () {
            resetStars();
        });
        star.addEventListener('click', function () {
            setRating(this.dataset.value);
        });
    });
}
function highlightStars(val) {
    stars.forEach(star => {
        star.classList.toggle('hovered', star.dataset.value <= val);
    });
}
function resetStars() {
    const valEl = document.getElementById('agentRatingValue');
    const val = valEl ? Number(valEl.value) : 0;
    stars.forEach(star => {
        star.classList.remove('hovered');
        star.classList.toggle('selected', Number(star.dataset.value) <= val);
    });
}
function setRating(val) {
    const valEl = document.getElementById('agentRatingValue');
    if (valEl) valEl.value = val;
    resetStars();
}

// Rating form submit (guarded)
const rateAgentForm = document.getElementById('rateAgentForm');
if (rateAgentForm) {
    rateAgentForm.onsubmit = async function (e) {
        e.preventDefault();
        const agentIdEl = document.getElementById('rateAgentId');
        const agentNameEl = document.getElementById('rateAgentName');
        const ratingEl = document.getElementById('agentRatingValue');
        const commentEl = document.getElementById('agentRatingComment');
        const agentId = agentIdEl ? agentIdEl.value : '';
        const agentName = agentNameEl ? agentNameEl.value : '';
        const rating = ratingEl ? parseInt(ratingEl.value, 10) : 0;
        const comment = commentEl ? commentEl.value : '';
        const user = firebase.auth().currentUser;
        if (!user || !rating) return alert('Please select a rating.');
        const studentId = user.uid;
        const studentName = (window.currentUser?.firstName || '') + ' ' + (window.currentUser?.lastName || '');
        await firebase.firestore().collection('ratings').add({
            studentId, studentName, agentId, agentName, rating, comment,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        const modal = document.getElementById('rateAgentModal');
        if (modal) modal.style.display = 'none';
        alert('Rating submitted.');
    };
}
// ===== CHECK APPLICATION STATUS BUTTON LOGIC =====
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
        firebase.firestore().collection('messages')
            .where('recipientId', '==', uid)
            .where('read', '==', false)
            .onSnapshot(snapshot => {
                updateBadge(snapshot.size);
            });
    });
    // ===== STUDENT MESSAGES TAB LOGIC =====
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
        const messagesList = document.getElementById('studentMessagesList');
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
    // ===== REAL-TIME ANNOUNCEMENTS LIST (MAIN SECTION) =====
    firebase.auth().onAuthStateChanged(function (user) {
        if (!user) return;
        (async () => {
            try {
                const uid = user.uid;
                const announcementsList = document.getElementById('studentAnnouncementsList');
                if (!announcementsList) return;
                // Fetch user role
                const userDoc = await firebase.firestore().collection('users').doc(uid).get();
                const userRole = (userDoc.exists && userDoc.data().role) ? userDoc.data().role : 'student';
                console.log('[Announcements] current user:', uid, 'role:', userRole);

                const col = firebase.firestore().collection('announcements');

                function normalizeRoleKey(r) {
                    if (!r) return r;
                    r = r.toString().toLowerCase();
                    if (r === 'student') return 'students';
                    if (r === 'agent') return 'agents';
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

                // Try an indexed 'in' query first; if it fails (index required), fall back to client-side filtering
                try {
                    const query = col
                        .where('isActive', '==', true)
                        .where('targetAudience', 'in', [userRole, 'all'])
                        .orderBy('createdAt', 'desc');

                    query.onSnapshot(async (snapshot) => {
                        console.log('[Announcements] snapshot received, docs:', snapshot.size);
                        let unreadCount = 0;
                        announcementsList.innerHTML = '';
                        // populate global announcements array from snapshot
                        announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        console.log('[Announcements] announcements array updated, count:', announcements.length);
                        const readAnnouncements = (userDoc.exists && userDoc.data().readAnnouncements) ? userDoc.data().readAnnouncements : [];
                        announcements.forEach(item => {
                            const data = item;
                            const isRead = readAnnouncements && readAnnouncements.includes(item.id);
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
                                    ${!isRead ? `<button class="btn-secondary mark-announcement-read" data-announcement-id="${item.id}" style="margin-left:10px;">Mark as Read</button>` : `<span style='color:#28a745;font-size:0.9em;margin-left:10px;'><i class='fas fa-check-circle'></i> Read</span>`}
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
                        // Fallback to client-side filtering
                        col.where('isActive', '==', true).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
                            console.log('[Announcements] fallback snapshot received, docs:', snapshot.size);
                            let unreadCount = 0;
                            announcementsList.innerHTML = '';
                            // Build announcements array from snapshot then filter
                            const fetched = [];
                            const readAnnouncements = (userDoc.exists && userDoc.data().readAnnouncements) ? userDoc.data().readAnnouncements : [];
                            snapshot.forEach(doc => {
                                const data = doc.data();
                                if (!matchesAudienceField(data.targetAudience || data.targetType, userRole, uid, data.targetIds)) return;
                                fetched.push({ id: doc.id, ...data });
                            });
                            announcements = fetched;
                            console.log('[Announcements] announcements array updated (fallback), count:', announcements.length);
                            announcements.forEach(item => {
                                const isRead = readAnnouncements && readAnnouncements.includes(item.id);
                                if (!isRead) unreadCount++;
                                const card = document.createElement('div');
                                card.className = 'announcement-item' + (isRead ? ' read' : ' unread');
                                card.style = 'background:#f8f9ff;padding:16px;border-radius:8px;margin-bottom:12px;box-shadow:0 2px 8px #e1e5ee;position:relative;';
                                card.innerHTML = `
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <i class="fas fa-bullhorn" style="color:var(--primary);"></i>
                                        <div style="flex:1;">
                                            <div style="font-weight:600;font-size:1.05em;">${item.title || 'Announcement'}</div>
                                            <div style="color:var(--gray);font-size:0.97em;margin-top:2px;">${item.content || ''}</div>
                                            <div style="color:#888;font-size:0.85em;margin-top:6px;">${item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleString() : ''}</div>
                                        </div>
                                        ${!isRead ? `<button class="btn-secondary mark-announcement-read" data-announcement-id="${item.id}" style="margin-left:10px;">Mark as Read</button>` : `<span style='color:#28a745;font-size:0.9em;margin-left:10px;'><i class='fas fa-check-circle'></i> Read</span>`}
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
                    // Fallback to client-side filtering
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
    const announcementsList = document.getElementById('studentAnnouncementsList') || document.getElementById('announcements-list');
    if (announcementsList) {
        announcementsList.addEventListener('click', async function (e) {
            if (e.target && e.target.classList.contains('mark-announcement-read')) {
                const annId = e.target.getAttribute('data-announcement-id');
                if (!annId) return;
                const user = firebase.auth().currentUser;
                if (!user) return;
                const uid = user.uid;
                // Atomically add to user's readAnnouncements array and announcement's readBy
                const userRef = firebase.firestore().collection('users').doc(uid);
                const annRef = firebase.firestore().collection('announcements').doc(annId);
                await Promise.all([
                    userRef.update({ readAnnouncements: firebase.firestore.FieldValue.arrayUnion(annId) }),
                    annRef.update({ readBy: firebase.firestore.FieldValue.arrayUnion(uid) })
                ]).catch(err => console.error('Mark announcement read failed', err));
            }
        });
    }
});
// Delegate click for dynamically rendered agent cards
document.body.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('check-status-btn')) {
        // Find the agent card (application-item)
        const card = e.target.closest('.agent-card.application-item');
        const detailsDiv = card.querySelector('.application-status-details');
        if (!detailsDiv) return;
        // Toggle visibility
        if (detailsDiv.style.display === 'none' || !detailsDiv.style.display) {
            detailsDiv.style.display = 'block';
            e.target.textContent = 'Hide Application Status';
            // Get agentId from card
            const agentId = card.dataset.agentId;
            // Get current user
            firebase.auth().onAuthStateChanged(function (user) {
                if (!user || !agentId) return;
                // Listen to activeApplications for this student and agent
                if (detailsDiv._unsubscribe) detailsDiv._unsubscribe(); // Remove previous listener if any
                detailsDiv.innerHTML = '<div style="color:var(--gray);padding:10px;">Loading status...</div>';
                detailsDiv._unsubscribe = firebase.firestore().collection('activeApplications')
                    .where('studentId', '==', user.uid)
                    .where('agentId', '==', agentId)
                    .onSnapshot(snapshot => {
                        if (snapshot.empty) {
                            detailsDiv.innerHTML = '<div style="color:var(--gray);padding:10px;">No status found for this application.</div>';
                            return;
                        }
                        // Use applicationTrackingTemplate for display
                        const template = document.getElementById('applicationTrackingTemplate');
                        detailsDiv.innerHTML = '';
                        // Iterate docs but skip cancelled applications
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            if (data && data.applicationStage === 'cancelled') return;
                            if (!template) {
                                detailsDiv.innerHTML += `<div style="padding:10px 0;">No template found.</div>`;
                                return;
                            }
                            // Clone template
                            const clone = template.content.cloneNode(true);
                            // Fill in fields
                            const uni = clone.querySelector('.app-university');
                            if (uni) uni.textContent = data.universityName || 'University';
                            const prog = clone.querySelector('.app-program');
                            if (prog) prog.textContent = 'Program: ' + (data.programName || 'N/A');
                            const badge = clone.querySelector('.app-status-badge');
                            if (badge) badge.textContent = data.applicationStage ? capitalizeStatus(data.applicationStage) : 'N/A';
                            // Progress bar and percent based on applicationStage
                            const progressData = getApplicationProgress(data.applicationStage);
                            const percent = clone.querySelector('.app-progress-percent');
                            if (percent) percent.textContent = progressData.percent + '%';
                            const bar = clone.querySelector('.app-progress-bar');
                            if (bar) {
                                bar.style.width = progressData.percent + '%';
                                bar.style.background = progressData.color;
                            }
                            // Timeline and dates (customize as needed)
                            // Example: set submitted date
                            const submitted = clone.querySelector('.app-submitted-date');
                            if (submitted) submitted.textContent = data.submittedAt ? formatDate(data.submittedAt) : 'N/A';

                            // === Stage-specific requirements/guidelines ===
                            const requirementsDiv = document.createElement('div');
                            requirementsDiv.className = 'stage-requirements';
                            requirementsDiv.style.margin = '20px 0 0 0';

                            // Stage requirements mapping
                            const stageRequirements = {
                                started: async () => {
                                    // Fetch agent info
                                    let agentInfoHtml = '<div style="color:var(--primary);font-weight:600;">Contact your assigned agent for next steps:</div>';
                                    if (data.agentId) {
                                        try {
                                            const agentDoc = await firebase.firestore().collection('agents').doc(data.agentId).get();
                                            if (agentDoc.exists) {
                                                const agent = agentDoc.data();
                                                agentInfoHtml += `<div style="margin-top:10px;">
                                                        <div><strong>Name:</strong> ${agent.firstName || ''} ${agent.lastName || ''}</div>
                                                        <div><strong>Email:</strong> <a href='mailto:${agent.email}'>${agent.email}</a></div>
                                                        <div><strong>Phone:</strong> <a href='tel:${agent.phone}'>${agent.phone}</a></div>
                                                    </div>`;
                                            }
                                        } catch (e) { agentInfoHtml += '<div style="color:red;">Unable to load agent info.</div>'; }
                                    }
                                    requirementsDiv.innerHTML = agentInfoHtml;
                                },
                                documents: () => {
                                    // Document checklist
                                    const docList = [
                                        'Passport',
                                        'Physical examination report',
                                        'Passport size picture',
                                        '1-2 scanned copies of letters of recommendation',
                                        'Certificate of highest academic degree',
                                        'Transcript of highest educational level',
                                        'Proof of no criminal record (within 6 months)',
                                        'Certificate of your English proficiency or Chinese proficiency',
                                        'One minute self-introduction video in English or Chinese'
                                    ];
                                    let checklistHtml = `<div style="color:var(--primary);font-weight:600;">To proceed, We will need these documents</div>`;
                                    checklistHtml += '<ul style="margin:10px 0 0 18px;list-style:none;padding:0;">';
                                    docList.forEach((doc, idx) => {
                                        checklistHtml += `<li style="margin-bottom:8px;display:flex;align-items:center;"><input type="checkbox" class="doc-check" id="doc-check-${idx}" style="margin-right:8px;"> <label for="doc-check-${idx}" style="margin:0;">${doc}</label></li>`;
                                    });
                                    checklistHtml += '</ul>';
                                    checklistHtml += `<div style="margin-top:14px;">Do you have all of them? <br>If no, please let us know which one is missing. We can help you arrange those missing documents. <span style="color:var(--primary);font-weight:600;">Contact your agent for guidance on getting the document.</span></div>`;
                                    requirementsDiv.innerHTML = checklistHtml;
                                },
                                submitted: () => {
                                    requirementsDiv.innerHTML = `<div style="color:var(--primary);font-weight:600;">Application Submitted</div><div style="margin-top:10px;">Your application has been submitted. Estimated review time: 5-10 business days. You will be notified by email once a decision is made.</div>`;
                                },
                                interview: () => {
                                    requirementsDiv.innerHTML = `<div style="color:var(--primary);font-weight:600;">Interview Preparation</div><ul style="margin:10px 0 0 18px;"><li>Review your submitted documents</li><li>Prepare answers for common questions (motivation, goals, etc.)</li><li>Check your email for interview scheduling details</li></ul>`;
                                },
                                offer: () => {
                                    requirementsDiv.innerHTML = `<div style="color:var(--primary);font-weight:600;">Offer Received</div><div style="margin-top:10px;">Congratulations! Please review your offer letter, accept or decline by the stated deadline, and follow the next steps provided in your email.</div>`;
                                },
                                completed: () => {
                                    requirementsDiv.innerHTML = `<div style="color:var(--primary);font-weight:600;">Enrollment Complete</div><div style="margin-top:10px;">Congratulations on completing your application! Please check your email for final enrollment instructions and next steps.</div>`;
                                },
                                rejected: () => {
                                    requirementsDiv.innerHTML = `<div style="color:#dc3545;font-weight:600;">Application Not Successful</div><div style="margin-top:10px;">Unfortunately, your application was not successful. Please contact your agent for feedback or to discuss other opportunities.</div>`;
                                }
                            };

                            // Show requirements/guidelines for current stage
                            const stageKey = (data.applicationStage || '').toLowerCase();
                            if (stageRequirements[stageKey]) {
                                const req = stageRequirements[stageKey];
                                if (typeof req === 'function') {
                                    const result = req();
                                    if (result instanceof Promise) {
                                        result.then(() => detailsDiv.appendChild(requirementsDiv));
                                    } else {
                                        detailsDiv.appendChild(requirementsDiv);
                                    }
                                }
                            }
                            // Optionally, update timeline steps, etc.
                            detailsDiv.appendChild(clone);
                        });
                    });
            });
        } else {
            detailsDiv.style.display = 'none';
            e.target.textContent = 'Check Application Status';
            if (detailsDiv._unsubscribe) detailsDiv._unsubscribe();
        }
    }
});
// ===== NOTIFICATION DROPDOWN LOGIC =====
let notifications = [];
let notificationsUnsubscribe = null;
let notificationsDropdown = null;
function renderNotificationsDropdown() {
    // Defer to global Notifications modal if present
    if (window.Notifications && typeof window.Notifications.setupBell === 'function') return;
    if (!notificationsDropdown) {
        notificationsDropdown = document.createElement('div');
        notificationsDropdown.className = 'notifications-dropdown';
        notificationsDropdown.style.position = 'absolute';
        notificationsDropdown.style.top = '48px';
        notificationsDropdown.style.right = '8px';
        notificationsDropdown.style.left = 'auto';
        notificationsDropdown.style.background = '#fff';
        notificationsDropdown.style.boxShadow = '0 8px 32px rgba(44,62,80,0.15)';
        notificationsDropdown.style.borderRadius = '10px';
        notificationsDropdown.style.minWidth = '260px';
        notificationsDropdown.style.maxWidth = '95vw';
        notificationsDropdown.style.maxHeight = '60vh';
        notificationsDropdown.style.overflowY = 'auto';
        notificationsDropdown.style.zIndex = '9999';
        notificationsDropdown.style.padding = '0.5em 0';
        notificationsDropdown.style.display = 'none';
        document.body.appendChild(notificationsDropdown);
    }
    let html = '';
    if (!notifications.length) {
        html = '<div style="padding: 1.2em; color: var(--gray); text-align: center;">No notifications yet.</div>';
    } else {
        notifications.slice(0, 10).forEach(n => {
            html += `<div class="notification-item${n.read ? '' : ' unread'}" style="padding: 1em 1.5em; border-bottom: 1px solid #f0f0f0; background: ${n.read ? '#fff' : '#f5f7ff'}; cursor: pointer; display: flex; align-items: flex-start; gap: 10px;">
                <i class="fas fa-bell" style="color: ${n.read ? 'var(--gray)' : 'var(--primary)'}; margin-top: 2px;"></i>
                <div style="flex:1;">
                    <div style="font-weight:600; color:${n.read ? 'var(--gray)' : 'var(--primary)'};">${n.title || 'Notification'}</div>
                    <div style="font-size:0.97em; color:var(--dark);">${n.body || ''}</div>
                    <div style="font-size:0.85em; color:var(--gray); margin-top:2px;">${n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleString() : ''}</div>
                </div>
            </div>`;
        });
    }
    notificationsDropdown.innerHTML = html;
}

function showNotificationsDropdown(anchor) {
    // If global Notifications modal exists, open it instead
    if (window.Notifications && typeof window.Notifications.setupBell === 'function') {
        const bell = document.querySelector('.notification-bell');
        bell && bell.click();
        return;
    }
    renderNotificationsDropdown();
    if (!notificationsDropdown) return;
    const bell = anchor || document.querySelector('.notification-bell');
    // show first so we can measure
    notificationsDropdown.style.display = 'block';
    if (bell) {
        const rect = bell.getBoundingClientRect();
        if (window.innerWidth <= 768) {
            notificationsDropdown.style.left = '8px';
            notificationsDropdown.style.right = '8px';
            notificationsDropdown.style.top = (rect.bottom + 8) + 'px';
        } else {
            notificationsDropdown.style.left = 'auto';
            notificationsDropdown.style.right = (window.innerWidth - rect.right + 8) + 'px';
            notificationsDropdown.style.top = (rect.bottom + 8) + 'px';
        }
    } else {
        // fallback: center top
        notificationsDropdown.style.left = '8px';
        notificationsDropdown.style.right = '8px';
        notificationsDropdown.style.top = '48px';
    }
    // Mark all as read in Firestore
    const unread = notifications.filter(n => !n.read);
    unread.forEach(n => {
        firebase.firestore().collection('notifications').doc(n.id).update({ read: true });
    });
    // Hide badge
    document.querySelectorAll('.notification-badge').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}
function hideNotificationsDropdown() {
    if (notificationsDropdown) notificationsDropdown.style.display = 'none';
}
document.addEventListener('click', function (e) {
    if (notificationsDropdown && !notificationsDropdown.contains(e.target) && !e.target.closest('.notification-bell')) {
        hideNotificationsDropdown();
    }
});
document.body.addEventListener('click', function (e) {
    if (e.target.closest('.notification-bell')) {
        const bellEl = e.target.closest('.notification-bell');
        if (notificationsDropdown && notificationsDropdown.style.display === 'block') {
            hideNotificationsDropdown();
        } else {
            showNotificationsDropdown(bellEl);
        }
    }
});
// Real-time notifications listener
firebase.auth().onAuthStateChanged(function (user) {
    if (notificationsUnsubscribe) notificationsUnsubscribe();
    if (!user) return;
    notificationsUnsubscribe = firebase.firestore().collection('notifications')
        .where('recipientId', '==', user.uid)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .onSnapshot(snapshot => {
            notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const unreadCount = notifications.filter(n => !n.read).length;
            document.querySelectorAll('.notification-badge').forEach(el => {
                el.textContent = unreadCount > 0 ? unreadCount : '';
                el.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            });
            renderNotificationsDropdown();
        });
});
// ===== STUDENT DASHBOARD JAVASCRIPT =====

let currentUser = null;
let currentSection = 'dashboard';

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

// Announcements are handled by js/announcements-view.js (shared viewer)

document.addEventListener('DOMContentLoaded', async function () {
    // Application Status button logic
    const checkAppStatusBtn = document.getElementById('checkAppStatusBtn');
    const appStatusSection = document.getElementById('studentAppStatusSection');
    const appStatusList = document.getElementById('studentAppStatusList');
    if (checkAppStatusBtn && appStatusSection && appStatusList) {
        checkAppStatusBtn.addEventListener('click', function () {
            appStatusSection.style.display = appStatusSection.style.display === 'none' ? 'block' : 'none';
        });

        // Listen to activeApplications for this student in real-time
        firebase.auth().onAuthStateChanged(function (user) {
            if (!user) return;
            firebase.firestore().collection('activeApplications')
                .where('studentId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .onSnapshot(snapshot => {
                    appStatusList.innerHTML = '';
                    if (snapshot.empty) {
                        appStatusList.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">No active applications yet.</p>';
                        return;
                    }
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        // Skip cancelled applications
                        if (data && data.applicationStage === 'cancelled') return;
                        const card = document.createElement('div');
                        card.className = 'active-application-item';
                        card.innerHTML = `
                                    <div class="app-header">
                                        <div>
                                            <h4>${data.studentName || 'Your Application'}</h4>
                                            <p class="app-details">${data.studentEmail || ''}</p>
                                        </div>
                                        <div>
                                            <span class="app-status-badge">${data.applicationStage || 'started'}</span>
                                        </div>
                                    </div>
                                    <div class="app-avatar"><img src="${data.studentAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.studentName || 'Student')}" alt="avatar" style="width:40px;height:40px;border-radius:50%;"></div>
                                    <p class="app-date">Started: ${data.timestamp && data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : ''}</p>
                                `;
                        appStatusList.appendChild(card);
                    });
                });
        });
    }
    // Define current user from Firebase Auth and attach real-time assignment listener
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Get user data
        const userData = await getCurrentUserData();
        if (!userData.success) {
            window.location.href = 'login.html';
            return;
        }

        // Check if user is a student
        if (userData.data.role !== USER_ROLES.STUDENT) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = userData.data;
        initializeDashboard();
        // Setup notification listener for this student
        setupNotificationRealtimeListener(user.uid);

        // Real-time listener for assignments where studentId matches current user ID (agent-dashboard style)
        firebase.firestore().collection('assignments')
            .where('studentId', '==', user.uid)
            .onSnapshot(async snapshot => {
                const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Fetch agent data for each assignment
                const agentPromises = assignments.map(async assignment => {
                    if (!assignment.agentId) return null;
                    const agentDoc = await firebase.firestore().collection('agents').doc(assignment.agentId).get();
                    if (!agentDoc.exists) return null;
                    return { ...agentDoc.data(), id: agentDoc.id, assignmentId: assignment.id, assignmentData: assignment };
                });
                const agents = (await Promise.all(agentPromises)).filter(Boolean);
                // Render agent cards in My Applications section
                const applicationsList = document.getElementById('applicationsList');
                if (!applicationsList) return;
                applicationsList.innerHTML = '';
                if (!agents.length) {
                    applicationsList.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No agent assigned yet</p>';
                    return;
                }
                agents.forEach(agent => {
                    const assignment = agent.assignmentData;
                    const assignedDate = assignment.createdAt ? (assignment.createdAt.toDate ? assignment.createdAt.toDate().toLocaleDateString() : new Date(assignment.createdAt).toLocaleDateString()) : 'N/A';
                    const firstName = agent.firstName || '';
                    const lastName = agent.lastName || '';
                    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
                    const photo = agent.profilePhotoUrl ? `<img src="${agent.profilePhotoUrl}" alt="Agent Photo" style="width:60px;height:60px;border-radius:50%;object-fit:cover;box-shadow:0 2px 8px #e1e5ee;" />` : `<div class="agent-avatar" style="width: 60px; height: 60px; background: #4ECDC4; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">${initials}</div>`;
                    const card = document.createElement('div');
                    card.className = 'agent-card application-item';
                    card.innerHTML = `
                        <div style="display:flex;align-items:flex-start;gap:16px;padding:16px 0;position:relative;">
                            ${photo}
                            <div style="flex:1;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                    <div>
                                        <div class="agent-name" style="font-weight:600;font-size:1.1rem;color:var(--dark);margin-bottom:2px;">${firstName} ${lastName}</div>
                                        ${agent.email ? `<div class="agent-email" style="font-size:0.95em;color:var(--gray);margin-bottom:2px;">${agent.email}</div>` : ''}
                                        ${agent.phone ? `<div class="agent-phone" style="font-size:0.95em;color:var(--gray);margin-bottom:2px;">${agent.phone}</div>` : ''}
                                    </div>
                                    <div class="agent-actions-dropdown-wrapper" style="position:relative;">
                                        <button class="agent-actions-btn" title="More actions" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;padding:0 8px;">
                                            <span style="font-size:1.5em;">&#8942;</span>
                                        </button>
                                        <div class="agent-actions-dropdown" style="display:none;position:absolute;right:0;top:28px;z-index:10;background:#fff;border:1px solid #e1e5ee;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);min-width:140px;">
                                            <div class="dropdown-item report-agent" title="Report my agent" style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;">
                                                <i class="fas fa-flag" style="color:#e74c3c;"></i> Report
                                            </div>
                                            <div class="dropdown-item rate-agent" style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;">
                                                <i class="fas fa-star" style="color:#f1c40f;"></i> Rating
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="agent-assigned-date" style="font-size:0.9em;color:#888;">Assigned: ${assignedDate}</div>
                                <button type="button" class="btn-primary check-status-btn" style="margin-top:10px;width:100%;" data-agent-id="${agent.id}">Check Application Status</button>
                                <div class="application-status-details" style="display:none; margin-top:10px;"></div>
                            </div>
                        </div>
                    `;
                    // Attach agentId and assignmentId for later use
                    card.dataset.agentId = agent.id;
                    card.dataset.assignmentId = assignment.id;
                    applicationsList.appendChild(card);
                });
            });
    });
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Get user data
        const userData = await getCurrentUserData();
        if (!userData.success) {
            window.location.href = 'login.html';
            return;
        }

        // Check if user is a student
        if (userData.data.role !== USER_ROLES.STUDENT) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = userData.data;
        initializeDashboard();
        // Setup notification listener for this student
        setupNotificationRealtimeListener(user.uid);

        // Real-time listener for assignments where studentId matches current user ID (for My Applications section)
        firebase.firestore().collection('assignments')
            .where('studentId', '==', user.uid)
            .onSnapshot(async snapshot => {
                // Map: applicationId -> { agentId, assignmentDate }
                const assignmentMap = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.applicationId && data.agentId) {
                        assignmentMap[data.applicationId] = {
                            agentId: data.agentId,
                            assignedAt: data.createdAt || null
                        };
                    }
                });
                // Update agent cards in My Applications section
                const applicationsList = document.getElementById('applicationsList');
                if (!applicationsList) return;
                // For each application card, update agent info if assigned
                const cards = applicationsList.querySelectorAll('.application-tracking-card');
                for (const card of cards) {
                    const appNameEl = card.querySelector('.app-university');
                    const agentInfo = card.querySelector('.agent-assignment-info');
                    if (!appNameEl || !agentInfo) continue;
                    // Try to get applicationId from a data attribute or fallback to scholarship name
                    const applicationId = card.getAttribute('data-application-id') || appNameEl.textContent;
                    const assignment = assignmentMap[applicationId];
                    if (assignment && assignment.agentId) {
                        // Show loading skeleton
                        agentInfo.innerHTML = `
                            <div class="agent-card-skeleton" style="display:flex;align-items:center;gap:16px;padding:16px 0;">
                                <div style="width:60px;height:60px;border-radius:50%;background:#e1e5ee;animation:pulse 1.2s infinite;">&nbsp;</div>
                                <div style="flex:1;">
                                    <div style="height:18px;width:120px;background:#e1e5ee;margin-bottom:8px;border-radius:4px;animation:pulse 1.2s infinite;"></div>
                                    <div style="height:14px;width:80px;background:#e1e5ee;margin-bottom:6px;border-radius:4px;animation:pulse 1.2s infinite;"></div>
                                    <div style="height:14px;width:100px;background:#e1e5ee;border-radius:4px;animation:pulse 1.2s infinite;"></div>
                                </div>
                            </div>
                        `;
                        try {
                            const agentDoc = await firebase.firestore().collection('agents').doc(assignment.agentId).get();
                            if (agentDoc.exists) {
                                const agent = agentDoc.data();
                                const firstName = agent.firstName || '';
                                const lastName = agent.lastName || '';
                                const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
                                const photo = agent.profilePhotoUrl ? `<img src="${agent.profilePhotoUrl}" alt="Agent Photo" style="width:60px;height:60px;border-radius:50%;object-fit:cover;box-shadow:0 2px 8px #e1e5ee;" />` : `<div class="agent-avatar" style="width: 60px; height: 60px; background: #4ECDC4; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">${initials}</div>`;
                                const assignedDate = assignment.assignedAt ? (assignment.assignedAt.toDate ? assignment.assignedAt.toDate().toLocaleDateString() : new Date(assignment.assignedAt).toLocaleDateString()) : 'N/A';
                                agentInfo.innerHTML = `
                                    <div class="agent-card" style="display:flex;align-items:center;gap:16px;padding:16px 0;">
                                        ${photo}
                                        <div style="flex:1;">
                                            <div class="agent-name" style="font-weight:600;font-size:1.1rem;color:var(--dark);margin-bottom:2px;">${firstName} ${lastName}</div>
                                            ${agent.email ? `<div class="agent-email" style="font-size:0.95em;color:var(--gray);margin-bottom:2px;">${agent.email}</div>` : ''}
                                            ${agent.phone ? `<div class="agent-phone" style="font-size:0.95em;color:var(--gray);margin-bottom:2px;">${agent.phone}</div>` : ''}
                                            <div class="agent-assigned-date" style="font-size:0.9em;color:#888;">Assigned: ${assignedDate}</div>
                                        </div>
                                    </div>
                                `;
                            } else {
                                agentInfo.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">Agent info unavailable</p>';
                            }
                        } catch (err) {
                            agentInfo.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">Unable to load agent info</p>';
                        }
                    } else {
                        agentInfo.innerHTML = '<div class="agent-card-empty" style="color: var(--gray); text-align: center; padding: 20px;">No agent assigned yet</div>';
                    }
                }
            });
    });
    // Display assigned agent info in student dashboard
    function displayAssignedAgent(agent) {
        const agentSection = document.getElementById('assignedAgentSection');
        if (!agentSection) return;
        if (!agent) {
            agentSection.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">No agent assigned yet</p>';
            return;
        }
        const firstName = agent.firstName || '';
        const lastName = agent.lastName || '';
        const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        agentSection.innerHTML = `
        <div class="agent-avatar" style="width: 60px; height: 60px; background: #4ECDC4; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; margin: 0 auto 12px;">${initials}</div>
        <div class="agent-name" style="font-weight: 600; color: var(--dark); margin-bottom: 5px;">${firstName} ${lastName}</div>
        ${agent.email ? `<div class="agent-email" style="font-size: 0.85rem; color: var(--gray); margin-bottom: 8px;">${agent.email}</div>` : ''}
        ${agent.phone ? `<div class="agent-phone" style="font-size: 0.85rem; color: var(--gray); margin-bottom: 12px;">${agent.phone}</div>` : ''}
    `;
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
            }
        });
    });

    // Profile form
    const profileForm = document.getElementById('profileForm');

    // ===== SCHOLARSHIPS: load active scholarships for students =====
    (function initStudentScholarships() {
        const grid = document.getElementById('scholarshipsGrid');
        if (!grid) return;
        try {
            const nowTs = firebase.firestore.Timestamp.now();
            firebase.firestore().collection('scholarships')
                .where('status', '==', 'active')
                .where('deadline', '>', nowTs)
                .orderBy('deadline', 'asc')
                .onSnapshot(snapshot => {
                    if (!snapshot || snapshot.empty) {
                        grid.innerHTML = '<div style="color:var(--gray);text-align:center;padding:40px;">No scholarships available right now. Please check back later.</div>';
                        return;
                    }
                    let html = '';
                    snapshot.forEach(doc => {
                        const d = doc.data();
                        const deadline = d.deadline && d.deadline.toDate ? d.deadline.toDate().toLocaleDateString() : '';
                        const benefitsShort = (d.benefits || '').length > 120 ? (d.benefits || '').slice(0, 117) + '...' : (d.benefits || '');
                        const image = d.imageUrl || 'https://via.placeholder.com/300x160?text=Scholarship';
                        html += `
                        <div class="sch-card-grid" style="background:#fff;border:1px solid #e1e5ee;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px;">
                            <div style="display:flex;gap:12px;align-items:center;">
                                <img src="${escapeHtml(image)}" alt="${escapeHtml(d.title || '')}" style="width:120px;height:80px;object-fit:cover;border-radius:6px;">
                                <div style="flex:1;">
                                    <div style="font-weight:700;color:var(--primary);">${escapeHtml(d.university || '')}</div>
                                    <div style="font-size:1.05em;margin-top:6px;">${escapeHtml(d.title || '')}</div>
                                    <div style="color:var(--gray);font-size:0.95em;margin-top:6px;">${escapeHtml(d.degree || '')} • ${escapeHtml(d.field || '')}</div>
                                </div>
                            </div>
                            <div style="color:var(--gray);font-size:0.95em;">${escapeHtml(benefitsShort)}</div>
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div style="color:#555;font-weight:600;">Deadline: ${escapeHtml(deadline)}</div>
                                <a class="btn-primary" href="apply.html?scholarshipId=${doc.id}">Apply Now</a>
                            </div>
                        </div>`;
                    });
                    grid.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">' + html + '</div>';
                }, err => {
                    console.error('Scholarships snapshot error', err);
                    grid.innerHTML = '<div style="color:var(--gray);text-align:center;padding:40px;">Failed to load scholarships.</div>';
                });
        } catch (err) {
            console.error('Init scholarships failed', err);
        }
    })();
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
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
            toggleSidebar();
        }
    });
});

/**
 * Initialize dashboard with user data
 */
async function initializeDashboard() {
    // Update UI with user data
    const firstName = currentUser.firstName || 'Student';
    const lastName = currentUser.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    // Update welcome section
    const welcomeNameEl = document.getElementById('welcomeName');
    if (welcomeNameEl) welcomeNameEl.textContent = firstName;
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = fullName;
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) userAvatarEl.textContent = firstName.charAt(0).toUpperCase();

    // Update user information card
    const userInfoAvatarEl = document.getElementById('userInfoAvatar');
    if (userInfoAvatarEl) userInfoAvatarEl.textContent = firstName.charAt(0).toUpperCase();
    const userInfoFullNameEl = document.getElementById('userInfoFullName');
    if (userInfoFullNameEl) userInfoFullNameEl.textContent = fullName;
    const userInfoEmailEl = document.getElementById('userInfoEmail');
    if (userInfoEmailEl) userInfoEmailEl.textContent = currentUser.email || 'Not provided';
    const userInfoPhoneEl = document.getElementById('userInfoPhone');
    if (userInfoPhoneEl) userInfoPhoneEl.textContent = currentUser.phone || 'Not provided';
    const userInfoCountryEl = document.getElementById('userInfoCountry');
    if (userInfoCountryEl) userInfoCountryEl.textContent = currentUser.country || 'Not provided';

    // Format and display join date
    if (currentUser.createdAt) {
        const joinDate = new Date(currentUser.createdAt.seconds * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('userInfoJoinDate').textContent = joinDate;
    }

    // Load profile form
    loadProfileData();

    // Load applications
    await loadApplications();

    // Load recent applications for dashboard
    await loadRecentApplicationsOnDashboard();

    // Load statistics
    await loadStatistics();
}

/**
 * Load user profile data into form
 */
function loadProfileData() {
    const firstNameEl = document.getElementById('firstName');
    if (firstNameEl) firstNameEl.value = currentUser.firstName || '';
    const lastNameEl = document.getElementById('lastName');
    if (lastNameEl) lastNameEl.value = currentUser.lastName || '';
    const emailEl = document.getElementById('email');
    if (emailEl) emailEl.value = currentUser.email || '';
    const phoneEl = document.getElementById('phone');
    if (phoneEl) phoneEl.value = currentUser.phone || '';
    const countryEl = document.getElementById('country');
    if (countryEl) countryEl.value = currentUser.country || '';
}

/**
 * Load student applications with tracking
 */
async function loadApplications() {
    const uid = getCurrentUserId();
    const applicationsList = document.getElementById('applicationsList');
    const template = document.getElementById('applicationTrackingTemplate');

    // Real-time listener for assignments and applications
    firebase.firestore().collection('applications')
        .where('studentId', '==', uid)
        .onSnapshot(async appSnapshot => {
            console.log('[LIVE] Applications snapshot:', appSnapshot.docs.map(d => d.data()));
            if (appSnapshot.empty) {
                applicationsList.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No applications yet. <a href="#scholarships" onclick="switchSection(\'scholarships\')">Browse scholarships</a></p>';
                return;
            }
            // Get all application docs
            const apps = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Get all assignments for these applications
            const appIds = apps.map(a => a.id);
            const assignmentsSnap = await firebase.firestore().collection('assignments')
                .where('studentId', '==', uid)
                .where('applicationId', 'in', appIds.length ? appIds : ['_'])
                .get();
            const assignmentMap = {};
            assignmentsSnap.forEach(doc => {
                const data = doc.data();
                if (data.applicationId && data.agentId) {
                    assignmentMap[data.applicationId] = {
                        agentId: data.agentId,
                        assignedAt: data.createdAt || null
                    };
                }
            });
            console.log('[LIVE] Assignments snapshot:', assignmentsSnap.docs.map(d => d.data()));
            console.log('[LIVE] Fetching agent for assignment:', assignment);
            console.log('[LIVE] Agent details:', agentDoc.data());
            // Render application cards
            applicationsList.innerHTML = '';
            for (const app of apps) {
                const clone = template.content.cloneNode(true);
                clone.querySelector('.app-university').textContent = app.scholarshipName || 'Unknown Scholarship';
                clone.querySelector('.app-program').textContent = `Program: ${app.major || 'Not specified'}`;
                const statusBadge = clone.querySelector('.app-status-badge');
                statusBadge.textContent = capitalizeStatus(app.status || 'pending');
                statusBadge.className = 'app-status-badge status-' + (app.status || 'pending');
                applyStatusStyling(statusBadge, app.status || 'pending');
                const progressData = getApplicationProgress(app.status || 'pending');
                clone.querySelector('.app-progress-percent').textContent = progressData.percent + '%';
                clone.querySelector('.app-progress-bar').style.width = progressData.percent + '%';
                clone.querySelector('.app-progress-bar').style.background = progressData.color;
                const submittedDate = app.createdAt ? formatDate(app.createdAt) : 'N/A';
                clone.querySelector('.app-date-submitted').textContent = submittedDate;
                clone.querySelector('.app-submitted-date').textContent = submittedDate;
                clone.querySelector('.app-status').textContent = capitalizeStatus(app.status || 'pending');
                // Render agent card using assignment
                const agentInfo = clone.querySelector('.agent-assignment-info');
                const assignment = assignmentMap[app.id];
                if (assignment && assignment.agentId) {
                    agentInfo.innerHTML = `<div class="agent-card-skeleton" style="display:flex;align-items:center;gap:16px;padding:16px 0;">
                        <div style="width:60px;height:60px;border-radius:50%;background:#e1e5ee;animation:pulse 1.2s infinite;">&nbsp;</div>
                        <div style="flex:1;">
                            <div style="height:18px;width:120px;background:#e1e5ee;margin-bottom:8px;border-radius:4px;animation:pulse 1.2s infinite;"></div>
                            <div style="height:14px;width:80px;background:#e1e5ee;margin-bottom:6px;border-radius:4px;animation:pulse 1.2s infinite;"></div>
                            <div style="height:14px;width:100px;background:#e1e5ee;border-radius:4px;animation:pulse 1.2s infinite;"></div>
                        </div>
                    </div>`;
                    try {
                        const agentDoc = await firebase.firestore().collection('agents').doc(assignment.agentId).get();
                        if (agentDoc.exists) {
                            const agent = agentDoc.data();
                            const firstName = agent.firstName || '';
                            const lastName = agent.lastName || '';
                            const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
                            const photo = agent.profilePhotoUrl ? `<img src="${agent.profilePhotoUrl}" alt="Agent Photo" style="width:60px;height:60px;border-radius:50%;object-fit:cover;box-shadow:0 2px 8px #e1e5ee;" />` : `<div class="agent-avatar" style="width: 60px; height: 60px; background: #4ECDC4; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">${initials}</div>`;
                            const assignedDate = assignment.assignedAt ? (assignment.assignedAt.toDate ? assignment.assignedAt.toDate().toLocaleDateString() : new Date(assignment.assignedAt).toLocaleDateString()) : 'N/A';
                            agentInfo.innerHTML = `
                                <div class="agent-card" style="display:flex;align-items:center;gap:16px;padding:16px 0;position:relative;">
                                    ${photo}
                                    <div style="flex:1;position:relative;">
                                        <div style="display:flex;align-items:center;justify-content:space-between;">
                                            <div>
                                                <div class="agent-name" style="font-weight:600;font-size:1.1rem;color:var(--dark);margin-bottom:2px;">${firstName} ${lastName}</div>
                                                ${agent.email ? `<div class=\"agent-email\" style=\"font-size:0.95em;color:var(--gray);margin-bottom:2px;\">${agent.email}</div>` : ''}
                                                ${agent.phone ? `<div class=\"agent-phone\" style=\"font-size:0.95em;color:var(--gray);margin-bottom:2px;\">${agent.phone}</div>` : ''}
                                                <div class="agent-assigned-date" style="font-size:0.9em;color:#888;">Assigned: ${assignedDate}</div>
                                            </div>
                                            <div class="agent-actions-dropdown-wrapper" style="position:relative;">
                                                <button class="agent-actions-btn" title="More actions" style="background:none;border:none;cursor:pointer;font-size:1.5em;padding:0 8px;line-height:1;">
                                                    &#8942;
                                                </button>
                                                <div class="agent-actions-dropdown" style="display:none;position:absolute;right:0;top:28px;z-index:10;background:#fff;border:1px solid #e1e5ee;border-radius:6px;box-shadow:0 2px 8px #e1e5ee;min-width:140px;">
                                                    <div class="dropdown-item report-agent" title="Report my agent" style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;">
                                                        <i class="fas fa-flag" style="color:#e74c3c;"></i> Report
                                                    </div>
                                                    <div class="dropdown-item rate-agent" style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;">
                                                        <i class="fas fa-star" style="color:#f1c40f;"></i> Rating
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else {
                            agentInfo.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">Agent info unavailable</p>';
                        }
                    } catch (err) {
                        agentInfo.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">Unable to load agent info</p>';
                    }
                } else {
                    agentInfo.innerHTML = '<div class="agent-card-empty" style="color: var(--gray); text-align: center; padding: 20px;">No agent assigned yet</div>';
                }
                applicationsList.appendChild(clone);
            }
        });
}

/**
 * Load and display statistics
 */
async function loadStatistics() {
    const uid = getCurrentUserId();
    const result = await getStudentApplications(uid);

    if (!result.success) return;

    const applications = result.data;
    let accepted = 0, pending = 0, rejected = 0;

    applications.forEach(app => {
        if (app.status === 'accepted') accepted++;
        else if (app.status === 'pending') pending++;
        else if (app.status === 'rejected') rejected++;
    });

    document.getElementById('totalApplications').textContent = applications.length;
    document.getElementById('acceptedApplications').textContent = accepted;
    document.getElementById('pendingApplications').textContent = pending;
    document.getElementById('rejectedApplications').textContent = rejected;
}

/**
 * Load recent applications for dashboard overview
 */
async function loadRecentApplicationsOnDashboard() {
    const uid = getCurrentUserId();
    const result = await getStudentApplications(uid);

    const recentList = document.getElementById('recentApplicationsList');

    if (!result.success || result.data.length === 0) {
        recentList.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">No applications yet. <a href="#scholarships" onclick="switchSection(\'scholarships\')">Browse scholarships</a></p>';
        return;
    }

    // Show recent applications (max 5)
    const recentApps = result.data.slice(0, 5);
    recentList.innerHTML = recentApps.map(app => {
        const statusColors = {
            'pending': { bg: '#fff3cd', color: '#856404' },
            'under-review': { bg: '#d1ecf1', color: '#0c5460' },
            'shortlisted': { bg: '#cfe2ff', color: '#084298' },
            'accepted': { bg: '#d1e7dd', color: '#0f5132' },
            'rejected': { bg: '#f8d7da', color: '#842029' }
        };
        const statusStyle = statusColors[app.status] || statusColors['pending'];

        return `
        <div class="application-item">
            <div class="app-header">
                <h4>${app.scholarshipName || 'Unknown Scholarship'}</h4>
                <span class="status-badge" style="background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">${capitalizeStatus(app.status)}</span>
            </div>
            <p class="app-date" style="color: var(--gray); font-size: 0.85rem; margin: 8px 0 0 0;">Applied on ${formatDate(app.createdAt)}</p>
        </div>
    `}).join('');
}

/**
 * Get application progress data based on status
 */
function getApplicationProgress(status) {
    // Updated to match six-stage workflow
    const progressMap = {
        'started': { percent: 10, color: '#6c757d' },
        'documents': { percent: 30, color: '#007bff' },
        'submitted': { percent: 50, color: '#17a2b8' },
        'interview': { percent: 70, color: '#ffc107' },
        'offer': { percent: 90, color: '#28a745' },
        'completed': { percent: 100, color: '#007bff' },
        'rejected': { percent: 100, color: '#dc3545' }
    };
    return progressMap[status] || progressMap['started'];
}

/**
 * Apply status-specific styling to badge
 */
function applyStatusStyling(badgeElement, status) {
    const statusStyles = {
        'pending': { bg: '#fff3cd', color: '#856404' },
        'under-review': { bg: '#d1ecf1', color: '#0c5460' },
        'shortlisted': { bg: '#cfe2ff', color: '#084298' },
        'accepted': { bg: '#d1e7dd', color: '#0f5132' },
        'rejected': { bg: '#f8d7da', color: '#842029' }
    };
    const style = statusStyles[status] || statusStyles['pending'];
    badgeElement.style.background = style.bg;
    badgeElement.style.color = style.color;
}

/**
 * Fetch and display agent info
 */
async function fetchAndDisplayAgent(agentId, templateClone) {
    try {
        const agentDoc = await firebase.firestore().collection('agents').doc(agentId).get();

        if (agentDoc.exists) {
            const agent = agentDoc.data();
            const agentInfo = templateClone.querySelector('.agent-assignment-info');

            // Create initials for avatar
            const firstName = agent.firstName || '';
            const lastName = agent.lastName || '';
            const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();

            // Set primary color based on initials
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
            const colorIndex = agentId.charCodeAt(0) % colors.length;
            const bgColor = colors[colorIndex];

            agentInfo.innerHTML = `
                <div class="agent-avatar" style="width: 60px; height: 60px; background: ${bgColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; margin: 0 auto 12px;">${initials}</div>
                <div class="agent-name" style="font-weight: 600; color: var(--dark); margin-bottom: 5px;">${agent.firstName} ${agent.lastName}</div>
                ${agent.email ? `<div class="agent-email" style="font-size: 0.85rem; color: var(--gray); margin-bottom: 8px;">${agent.email}</div>` : ''}
                ${agent.phone ? `<div class="agent-phone" style="font-size: 0.85rem; color: var(--gray); margin-bottom: 12px;">${agent.phone}</div>` : ''}
                <button type="button" class="btn-secondary" style="width: 100%; padding: 8px; font-size: 0.85rem;" onclick="viewAgentProfile('${agentId}')">
                    <i class="fas fa-eye"></i> View Profile
                </button>
            `;
        } else {
            const agentInfo = templateClone.querySelector('.agent-assignment-info');
            agentInfo.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">Agent info unavailable</p>';
        }
    } catch (error) {
        console.error('Error fetching agent:', error);
        const agentInfo = templateClone.querySelector('.agent-assignment-info');
        agentInfo.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 20px;">Unable to load agent info</p>';
    }
}

/**
 * View agent profile (modal/expanded view)
 */
async function viewAgentProfile(agentId) {
    try {
        // Support both string and button element
        let id = agentId;
        if (typeof agentId === 'object' && agentId !== null) {
            // If called as onclick="viewAgentProfile(this)", extract data-agent-id
            id = agentId.getAttribute('data-agent-id') || agentId.dataset.agentId;
        }
        if (typeof id !== 'string' || !id) {
            alert('Agent ID not found');
            return;
        }
        const agentDoc = await firebase.firestore().collection('agents').doc(id).get();

        if (!agentDoc.exists) {
            alert('Agent profile not found');
            return;
        }

        const agent = agentDoc.data();

        // Create modal content
        const modalContent = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;" id="agentModal">
                <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: var(--dark);">Agent Profile</h2>
                        <button type="button" onClick="document.getElementById('agentModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">&times;</button>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="width: 100px; height: 100px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; margin: 0 auto 20px;">${(agent.firstName ? agent.firstName.charAt(0) : 'A').toUpperCase()}${(agent.lastName ? agent.lastName.charAt(0) : 'A').toUpperCase()}</div>
                        <h3 style="color: var(--dark); margin: 0 0 5px 0;">${agent.firstName} ${agent.lastName}</h3>
                        <p style="color: var(--gray); margin: 0;">Assigned Agent</p>
                    </div>
                    
                    <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="color: var(--dark); margin-top: 0;"><i class="fas fa-envelope" style="color: var(--primary); margin-right: 8px;"></i>Email</h4>
                        <p style="color: var(--gray); word-break: break-all;">${agent.email || 'Not provided'}</p>
                        
                        <h4 style="color: var(--dark); margin-top: 20px;"><i class="fas fa-phone" style="color: var(--primary); margin-right: 8px;"></i>Phone</h4>
                        <p style="color: var(--gray);">${agent.phone || 'Not provided'}</p>
                        
                        <h4 style="color: var(--dark); margin-top: 20px;"><i class="fas fa-briefcase" style="color: var(--primary); margin-right: 8px;"></i>Experience</h4>
                        <p style="color: var(--gray);">${agent.experience || 'Not provided'}</p>
                        
                        ${agent.bio ? `
                        <h4 style="color: var(--dark); margin-top: 20px;"><i class="fas fa-quote-left" style="color: var(--primary); margin-right: 8px;"></i>Bio</h4>
                        <p style="color: var(--gray);">${agent.bio}</p>
                        ` : ''}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <a href="mailto:${agent.email}" class="btn-primary" style="text-align: center; padding: 10px; text-decoration: none; border-radius: 6px; background: var(--primary); color: white;">
                            <i class="fas fa-envelope"></i> Email
                        </a>
                        <a href="tel:${agent.phone}" class="btn-secondary" style="text-align: center; padding: 10px; text-decoration: none; border-radius: 6px; background: var(--gray-light); color: var(--dark);">
                            <i class="fas fa-phone"></i> Call
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Insert modal
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Close on background click
        document.getElementById('agentModal').addEventListener('click', function (e) {
            if (e.target.id === 'agentModal') {
                this.remove();
            }
        });
    } catch (error) {
        console.error('Error loading agent profile:', error);
        alert('Failed to load agent profile');
    }
}

/**
 * Handle profile update
 */
async function handleProfileUpdate(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = document.getElementById('country').value;

    if (!firstName || !lastName || !phone || !country) {
        showError('All fields are required');
        return;
    }

    try {
        const uid = getCurrentUserId();
        await firebase.firestore().collection('users').doc(uid).update({
            firstName,
            lastName,
            phone,
            country,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentUser = {
            ...currentUser,
            firstName,
            lastName,
            phone,
            country
        };

        document.getElementById('profileSuccess').textContent = 'Profile updated successfully!';
        document.getElementById('profileSuccess').style.display = 'block';

        setTimeout(() => {
            document.getElementById('profileSuccess').style.display = 'none';
        }, 3000);
    } catch (error) {
        showError('Failed to update profile: ' + error.message);
    }
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
 * Delete account
 */
async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone!')) {
        return;
    }

    try {
        const uid = getCurrentUserId();

        // Delete user document
        await firebase.firestore().collection('users').doc(uid).delete();

        // Delete user from authentication
        const user = firebase.auth().currentUser;
        await user.delete();

        alert('Account deleted successfully');
        window.location.href = 'index.html';
    } catch (error) {
        alert('Failed to delete account: ' + error.message);
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

    // Scroll to top
    const mainContent = document.querySelector('.dashboard-container');
    if (mainContent) {
        mainContent.scrollTop = 0;
    }

    currentSection = section;
}

/**
 * Logout student
 */
async function logoutStudent() {
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
function showError(message) {
    const errorElement = document.getElementById('profileError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

/**
 * Format date
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.toDate ? timestamp.toDate() : timestamp);
    return date.toLocaleDateString();
}

/**
 * Capitalize status
 */
function capitalizeStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}
