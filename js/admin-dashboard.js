// ===== MESSAGES SECTION: Tabs, Real-time, Badges =====
let reportsData = [], ratingsData = [], agentMessagesData = [];
let reportsUnread = 0, ratingsUnread = 0, agentMessagesUnread = 0;
// Helper: escape HTML to prevent injection when inserting message content
function escapeHtml(str) {
    return String(str || '').replace(/[&<>"]|'/g, function (s) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
}

// Lightweight toast for success/error feedback
function showToast(message, duration = 3000) {
    let t = document.getElementById('adminToast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'adminToast';
        t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:10px 14px;border-radius:8px;z-index:99999;max-width:90%;text-align:center;';
        document.body.appendChild(t);
    }
    t.textContent = message;
    t.style.display = 'block';
    clearTimeout(t._hide);
    t._hide = setTimeout(() => { t.style.display = 'none'; }, duration);
}

// Helper: render visual stars for ratings (uses FontAwesome classes)
function renderStars(n) {
    const count = Math.max(0, Math.min(5, Number(n) || 0));
    let out = '';
    for (let i = 0; i < count; i++) out += '<i class="fas fa-star" style="color:#f1c40f;margin-right:4px;"></i>';
    for (let i = count; i < 5; i++) out += '<i class="far fa-star" style="color:#ddd;margin-right:4px;"></i>';
    return out;
}
function listenToAdminMessagesTabs() {
    // Reports
    firebase.firestore().collection('reports').orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            reportsData = [];
            reportsUnread = 0;
            snapshot.forEach(doc => {
                const d = doc.data();
                if (d.status === 'pending') reportsUnread++;
                reportsData.push({
                    id: doc.id,
                    studentName: d.studentName,
                    studentEmail: d.studentEmail,
                    agentName: d.agentName,
                    agentEmail: d.agentEmail,
                    message: d.message,
                    timestamp: d.timestamp,
                    status: d.status || 'pending',
                    studentId: d.studentId,
                    agentId: d.agentId
                });
            });
            renderReportsTab();
            updateMessagesBadges();
        });
    // Ratings
    firebase.firestore().collection('ratings').orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            ratingsData = [];
            ratingsUnread = 0;
            snapshot.forEach(doc => {
                const d = doc.data();
                if ((d.status || 'unread') === 'unread') ratingsUnread++;
                ratingsData.push({
                    id: doc.id,
                    studentName: d.studentName,
                    studentEmail: d.studentEmail,
                    agentName: d.agentName,
                    agentEmail: d.agentEmail,
                    rating: d.rating,
                    comment: d.comment,
                    timestamp: d.timestamp,
                    status: d.status || 'unread'
                });
            });
            renderRatingsTab();
            updateMessagesBadges();
        });
    // Agent-to-admin messages
    firebase.firestore().collection('messages').where('type', '==', 'agent-to-admin').orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            agentMessagesData = [];
            agentMessagesUnread = 0;
            snapshot.forEach(doc => {
                const d = doc.data();
                if ((d.status || 'unread') === 'unread') agentMessagesUnread++;
                agentMessagesData.push({
                    id: doc.id,
                    agentName: d.agentName,
                    agentEmail: d.agentEmail,
                    subject: d.subject,
                    message: d.message,
                    timestamp: d.timestamp,
                    status: d.status || 'unread'
                });
            });
            renderAgentMessagesTab();
            updateMessagesBadges();
        });
}

function updateMessagesBadges() {
    const totalUnread = reportsUnread + ratingsUnread + agentMessagesUnread;
    const messagesNotificationCountEl = document.getElementById('messagesNotificationCount');
    if (messagesNotificationCountEl) messagesNotificationCountEl.textContent = totalUnread > 0 ? totalUnread : '';

    const sidebarBadge = document.getElementById('sidebarMessagesBadge');
    if (sidebarBadge) {
        sidebarBadge.style.display = totalUnread > 0 ? 'inline-block' : 'none';
        sidebarBadge.textContent = totalUnread > 0 ? totalUnread : '';
    }

    const reportsTabBadgeEl = document.getElementById('reportsTabBadge');
    if (reportsTabBadgeEl) {
        reportsTabBadgeEl.style.display = reportsUnread > 0 ? 'inline-block' : 'none';
        reportsTabBadgeEl.textContent = reportsUnread > 0 ? reportsUnread : '';
    }

    const ratingsTabBadgeEl = document.getElementById('ratingsTabBadge');
    if (ratingsTabBadgeEl) {
        ratingsTabBadgeEl.style.display = ratingsUnread > 0 ? 'inline-block' : 'none';
        ratingsTabBadgeEl.textContent = ratingsUnread > 0 ? ratingsUnread : '';
    }

    const agentMessagesTabBadgeEl = document.getElementById('agentMessagesTabBadge');
    if (agentMessagesTabBadgeEl) {
        agentMessagesTabBadgeEl.style.display = agentMessagesUnread > 0 ? 'inline-block' : 'none';
        agentMessagesTabBadgeEl.textContent = agentMessagesUnread > 0 ? agentMessagesUnread : '';
    }
}

function renderReportsTab() {
    const el = document.getElementById('reportsTab');
    if (!el) return;
    if (reportsData.length === 0) {
        el.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No reports yet.</p>';
        return;
    }
    // Render as stacked cards for better mobile/responsive behavior
    let html = '<div class="messages-cards">';
    reportsData.forEach(r => {
        const ts = r.timestamp ? new Date(r.timestamp.seconds * 1000).toLocaleString() : '';
        const statusText = r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : 'Pending';
        const studentInitials = getInitials(r.studentName);
        const agentInitials = getInitials(r.agentName);
        html += `
        <article class="message-card message-card-report">
            <header class="message-card-header">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div class="message-avatar">${studentInitials}</div>
                    <div class="message-type">Report</div>
                </div>
                <div class="message-meta">${ts}</div>
            </header>
            <div class="message-card-body">
                <div class="message-row">
                    <div class="message-person"><strong>${r.studentName || ''}</strong><div class="muted">${r.studentEmail || ''}</div></div>
                    <div class="message-person"><strong>${r.agentName || ''}</strong><div class="muted">${r.agentEmail || ''}</div></div>
                </div>
                <div class="message-content">${escapeHtml(r.message || '')}</div>
            </div>
            <footer class="message-card-footer">
                <div class="status-wrap"><span class="status-badge ${r.status === 'pending' ? 'status-new' : 'status-read'}">${statusText}</span></div>
                <div class="actions-wrap">${r.status === 'pending' ? `<button class='btn btn-small' onclick='takeActionOnReport("${r.id}", "${r.studentId}", "${r.agentId}")'>Take Action</button>` : `<span class='muted'>Resolved</span>`}</div>
            </footer>
        </article>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function renderRatingsTab() {
    const el = document.getElementById('ratingsTab');
    if (!el) return;
    if (ratingsData.length === 0) {
        el.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No ratings yet.</p>';
        return;
    }
    let html = '<div class="messages-cards">';
    ratingsData.forEach(r => {
        const ts = r.timestamp ? new Date(r.timestamp.seconds * 1000).toLocaleString() : '';
        const statusText = r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : 'Unread';
        const stars = renderStars(r.rating || 0);
        html += `
        <article class="message-card message-card-rating">
            <header class="message-card-header">
                <div class="message-type">Rating</div>
                <div class="message-meta">${ts}</div>
            </header>
            <div class="message-card-body">
                <div class="message-row">
                    <div class="message-person"><strong>${r.studentName || ''}</strong><div class="muted">${r.studentEmail || ''}</div></div>
                    <div class="message-person"><strong>${r.agentName || ''}</strong><div class="muted">${r.agentEmail || ''}</div></div>
                </div>
                <div class="rating-display">${stars}</div>
                <div class="message-content muted">${escapeHtml(r.comment || '')}</div>
            </div>
            <footer class="message-card-footer">
                <div class="status-wrap"><span class="status-badge ${r.status === 'unread' ? 'status-new' : 'status-read'}">${statusText}</span></div>
                <div class="actions-wrap">${r.status === 'unread' ? `<button class='btn btn-small' onclick='markRatingAsRead("${r.id}")'>Mark Read</button>` : `<span class='muted'>Read</span>`}</div>
            </footer>
        </article>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function renderAgentMessagesTab() {
    const el = document.getElementById('agentMessagesTab');
    if (!el) return;
    if (agentMessagesData.length === 0) {
        el.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No agent messages yet.</p>';
        return;
    }
    let html = '<div class="messages-cards">';
    agentMessagesData.forEach(r => {
        const ts = r.timestamp ? new Date(r.timestamp.seconds * 1000).toLocaleString() : '';
        const statusText = r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : 'Unread';
        html += `
        <article class="message-card message-card-agent">
            <header class="message-card-header">
                <div class="message-type">Agent Message</div>
                <div class="message-meta">${ts}</div>
            </header>
            <div class="message-card-body">
                <div class="message-row">
                    <div class="message-person"><strong>${r.agentName || ''}</strong><div class="muted">${r.agentEmail || ''}</div></div>
                </div>
                <div class="message-subject"><strong>${escapeHtml(r.subject || '')}</strong></div>
                <div class="message-content">${escapeHtml(r.message || '')}</div>
            </div>
            <footer class="message-card-footer">
                <div class="status-wrap"><span class="status-badge ${r.status === 'unread' ? 'status-new' : 'status-read'}">${statusText}</span></div>
                <div class="actions-wrap">${r.status === 'unread' ? `<button class='btn btn-small' onclick='markAgentMessageAsRead("${r.id}")'>Mark Read</button>` : `<span class='muted'>Read</span>`}</div>
            </footer>
        </article>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// Tab switching logic
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.messages-tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.messages-tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tab = this.getAttribute('data-tab');
            document.querySelectorAll('.messages-tab-panel').forEach(panel => panel.style.display = 'none');
            if (tab === 'reports') document.getElementById('reportsTab').style.display = 'block';
            if (tab === 'ratings') document.getElementById('ratingsTab').style.display = 'block';
            if (tab === 'agent-messages') document.getElementById('agentMessagesTab').style.display = 'block';
        });
    });
    document.querySelectorAll('.nav-item[data-section="messages"]').forEach(item => {
        item.addEventListener('click', function () {
            listenToAdminMessagesTabs();
        });
    });
});

// Admin actions for messages
window.openReportActionModal = function (reportId, studentId, agentId) {
    if (!confirm('Do you want to unassign this agent from this student?')) return;
    // Find assignment doc
    firebase.firestore().collection('assignments')
        .where('studentId', '==', studentId).where('agentId', '==', agentId).get().then(snap => {
            const batch = firebase.firestore().batch();
            snap.forEach(doc => batch.delete(doc.ref));
            // Mark report as resolved
            firebase.firestore().collection('reports').doc(reportId).update({ status: 'resolved' }).then(() => {
                batch.commit();
                alert('Agent unassigned and report marked as resolved.');
            });
        });
};
window.markRatingAsRead = function (ratingId) {
    firebase.firestore().collection('ratings').doc(ratingId).update({ status: 'read' });
};
window.markAgentMessageAsRead = function (msgId) {
    firebase.firestore().collection('messages').doc(msgId).update({ status: 'read' });
};
// ===== Simple Announcements Admin Handler =====
document.addEventListener('DOMContentLoaded', function () {
    const annForm = document.getElementById('annForm');
    const annMsg = document.getElementById('annAdminMsg');
    if (!annForm) return;
    annForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (annMsg) { annMsg.style.display = 'none'; }
        const title = document.getElementById('annTitle')?.value.trim();
        const content = document.getElementById('annContent')?.value.trim();
        const targetAudience = document.getElementById('annTarget')?.value || 'all';
        if (!title || !content) {
            if (annMsg) { annMsg.style.display = ''; annMsg.style.color = 'red'; annMsg.textContent = 'Please provide title and content.'; }
            return;
        }
        try {
            await firebase.firestore().collection('announcements').add({
                title,
                content,
                targetAudience,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true
            });
            annForm.reset();
            if (annMsg) { annMsg.style.display = ''; annMsg.style.color = 'green'; annMsg.textContent = 'Announcement published.'; }
        } catch (err) {
            console.error('Publish announcement error', err);
            if (annMsg) { annMsg.style.display = ''; annMsg.style.color = 'red'; annMsg.textContent = 'Error publishing announcement.'; }
        }
    });
});
// ===== ADMIN MESSAGES SECTION: Reports, Ratings, Agent-to-Admin =====
function listenToAdminMessages() {
    const messagesList = document.getElementById('adminMessagesList');
    if (!messagesList) return;
    // Listen to all three collections in parallel
    let allMessages = [];
    let unreadCount = 0;
    // Reports
    firebase.firestore().collection('reports').orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            allMessages = allMessages.filter(m => m.type !== 'report');
            snapshot.forEach(doc => {
                const d = doc.data();
                allMessages.push({
                    id: doc.id,
                    type: 'report',
                    studentName: d.studentName,
                    studentId: d.studentId,
                    agentName: d.agentName,
                    agentId: d.agentId,
                    message: d.message,
                    timestamp: d.timestamp,
                    status: d.status || 'pending'
                });
            });
            renderAdminMessages();
        });
    // Ratings
    firebase.firestore().collection('ratings').orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            allMessages = allMessages.filter(m => m.type !== 'rating');
            snapshot.forEach(doc => {
                const d = doc.data();
                allMessages.push({
                    id: doc.id,
                    type: 'rating',
                    studentName: d.studentName,
                    studentId: d.studentId,
                    agentName: d.agentName,
                    agentId: d.agentId,
                    rating: d.rating,
                    comment: d.comment,
                    timestamp: d.timestamp,
                    status: d.status || 'unread'
                });
            });
            renderAdminMessages();
        });
    // Agent-to-admin messages
    firebase.firestore().collection('messages').where('type', '==', 'agent-to-admin').orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            allMessages = allMessages.filter(m => m.type !== 'agent-to-admin');
            snapshot.forEach(doc => {
                const d = doc.data();
                allMessages.push({
                    id: doc.id,
                    type: 'agent-to-admin',
                    agentName: d.agentName,
                    agentId: d.agentId,
                    subject: d.subject,
                    message: d.message,
                    timestamp: d.timestamp,
                    status: d.status || 'unread'
                });
            });
            renderAdminMessages();
        });
    // Render function
    function renderAdminMessages() {
        if (!messagesList) return;
        if (allMessages.length === 0) {
            messagesList.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No messages yet.</p>';
            document.getElementById('messagesNotificationCount').textContent = '0';
            return;
        }
        // Render mixed messages as stacked cards for responsiveness
        let html = '<div class="messages-cards">';
        unreadCount = 0;
        allMessages.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        allMessages.forEach(msg => {
            let typeLabel = '';
            let userInfo = '';
            let details = '';
            let statusBadge = '';
            let actions = '';
            let ts = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : '';
            if (msg.type === 'report') {
                const statusText = msg.status ? (msg.status.charAt(0).toUpperCase() + msg.status.slice(1)) : 'Pending';
                html += `
                <article class="message-card message-card-report">
                    <header class="message-card-header"><div class="message-type">Report</div><div class="message-meta">${ts}</div></header>
                    <div class="message-card-body">
                        <div class="message-row">
                            <div class="message-person"><strong>${msg.studentName || ''}</strong><div class="muted">${msg.studentEmail || ''}</div></div>
                            <div class="message-person"><strong>${msg.agentName || ''}</strong><div class="muted">${msg.agentEmail || ''}</div></div>
                        </div>
                        <div class="message-content">${escapeHtml(msg.message || '')}</div>
                    </div>
                    <footer class="message-card-footer"><div class="status-wrap"><span class="status-badge ${msg.status === 'pending' ? 'status-new' : 'status-read'}">${statusText}</span></div>
                        <div class="actions-wrap">${msg.status === 'pending' ? `<button class='btn btn-small' onclick='takeActionOnReport("${msg.id}", "${msg.studentId}", "${msg.agentId}")'>Take Action</button>` : `<span class='muted'>Resolved</span>`}</div>
                    </footer>
                </article>`;
                if (msg.status === 'pending') unreadCount++;
            } else if (msg.type === 'rating') {
                const statusText = msg.status ? (msg.status.charAt(0).toUpperCase() + msg.status.slice(1)) : 'Unread';
                const stars = renderStars(msg.rating || 0);
                const studentInitials = getInitials(msg.studentName);
                const agentInitials = getInitials(msg.agentName);
                html += `
                <article class="message-card message-card-rating">
                    <header class="message-card-header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div class="message-avatar">${studentInitials}</div>
                            <div class="message-type">Rating</div>
                        </div>
                        <div class="message-meta">${ts}</div>
                    </header>
                    <div class="message-card-body">
                        <div class="message-row">
                            <div class="message-person"><strong>${msg.studentName || ''}</strong><div class="muted">${msg.studentEmail || ''}</div></div>
                            <div class="message-person"><strong>${msg.agentName || ''}</strong><div class="muted">${msg.agentEmail || ''}</div></div>
                        </div>
                        <div class="rating-display">${stars}</div>
                        <div class="message-content muted">${escapeHtml(msg.comment || '')}</div>
                    </div>
                    <footer class="message-card-footer"><div class="status-wrap"><span class="status-badge ${msg.status === 'unread' ? 'status-new' : 'status-read'}">${statusText}</span></div>
                        <div class="actions-wrap">${msg.status === 'unread' ? `<button class='btn btn-small' onclick='markRatingAsRead("${msg.id}")'>Mark Read</button>` : `<span class='muted'>Read</span>`}</div>
                    </footer>
                </article>`;
                if (msg.status === 'unread') unreadCount++;
            } else if (msg.type === 'agent-to-admin') {
                const statusText = msg.status ? (msg.status.charAt(0).toUpperCase() + msg.status.slice(1)) : 'Unread';
                const agentInitials = getInitials(msg.agentName);
                html += `
                <article class="message-card message-card-agent">
                    <header class="message-card-header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div class="message-avatar">${agentInitials}</div>
                            <div class="message-type">Agent Message</div>
                        </div>
                        <div class="message-meta">${ts}</div>
                    </header>
                    <div class="message-card-body">
                        <div class="message-row">
                            <div class="message-person"><strong>${msg.agentName || ''}</strong><div class="muted">${msg.agentEmail || ''}</div></div>
                        </div>
                        <div class="message-subject"><strong>${escapeHtml(msg.subject || '')}</strong></div>
                        <div class="message-content">${escapeHtml(msg.message || '')}</div>
                    </div>
                    <footer class="message-card-footer"><div class="status-wrap"><span class="status-badge ${msg.status === 'unread' ? 'status-new' : 'status-read'}">${statusText}</span></div>
                        <div class="actions-wrap">${msg.status === 'unread' ? `<button class='btn btn-small' onclick='markAgentMessageAsRead("${msg.id}")'>Mark Read</button>` : `<span class='muted'>Read</span>`}</div>
                    </footer>
                </article>`;
                if (msg.status === 'unread') unreadCount++;
            }
        });
        html += '</div>';
        messagesList.innerHTML = html;
        document.getElementById('messagesNotificationCount').textContent = unreadCount > 0 ? unreadCount : '';
    }
}

// Admin actions for messages
window.takeActionOnReport = async function (reportId, studentId, agentId) {
    if (!confirm('Do you want to unassign this agent from this student?')) return;
    // Find assignment doc
    const assignmentSnap = await firebase.firestore().collection('assignments')
        .where('studentId', '==', studentId).where('agentId', '==', agentId).get();
    const batch = firebase.firestore().batch();
    assignmentSnap.forEach(doc => batch.delete(doc.ref));
    // Mark report as resolved
    await firebase.firestore().collection('reports').doc(reportId).update({ status: 'resolved' });
    await batch.commit();
    alert('Agent unassigned and report marked as resolved.');
};
window.markRatingAsRead = async function (ratingId) {
    await firebase.firestore().collection('ratings').doc(ratingId).update({ status: 'read' });
};
window.markAgentMessageAsRead = async function (msgId) {
    await firebase.firestore().collection('messages').doc(msgId).update({ status: 'read' });
};

// Listen when switching to messages section
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.nav-item[data-section="messages"]').forEach(item => {
        item.addEventListener('click', function () {
            listenToAdminMessages();
        });
    });
});
// ===== Messaging Modal Logic =====
let messageModalRecipientId = null;
let messageModalRecipientRole = null;
let messageModalUserName = null;

window.openMessageModal = function (recipientId, userName, recipientRole) {
    messageModalRecipientId = recipientId;
    messageModalRecipientRole = recipientRole;
    messageModalUserName = userName;
    const userNameEl = document.getElementById('messageModalUserName');
    const textEl = document.getElementById('messageModalText');
    const modalEl = document.getElementById('messageModal');
    if (userNameEl) userNameEl.textContent = userName;
    if (textEl) textEl.value = '';
    if (modalEl) modalEl.style.display = 'flex';
};

window.closeMessageModal = function () {
    const modalEl = document.getElementById('messageModal');
    if (modalEl) modalEl.style.display = 'none';
    messageModalRecipientId = null;
    messageModalRecipientRole = null;
    messageModalUserName = null;
};

const messageModalSendBtn = document.getElementById('messageModalSendBtn');
if (messageModalSendBtn) {
    messageModalSendBtn.onclick = async function () {
        const textElLocal = document.getElementById('messageModalText');
        const text = textElLocal ? textElLocal.value.trim() : '';
        if (!text) {
            alert('Please enter a message.');
            return;
        }
        try {
            const senderId = firebase.auth().currentUser.uid;
            await firebase.firestore().collection('messages').add({
                senderId,
                recipientId: messageModalRecipientId,
                text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
                senderRole: 'admin',
                recipientRole: messageModalRecipientRole
            });
            window.closeMessageModal();
            alert('Message sent!');
        } catch (err) {
            alert('Failed to send message: ' + err.message);
        }
    };
}
// === REAL-TIME ASSIGNMENT LISTENERS ===
function setupAssignmentRealtimeListeners() {
    // Listen for changes to users (students) and update allUsers
    firebase.firestore().collection('users')
        .where('role', '==', 'student')
        .onSnapshot(snapshot => {
            const updatedUsers = allUsers.map(u => u.role === 'student' ? null : u).filter(Boolean);
            snapshot.docs.forEach(doc => {
                updatedUsers.push({ uid: doc.id, ...doc.data() });
            });
            allUsers = updatedUsers;
            // Optionally refresh user table if in users section
            if (currentSection === 'users') displayUsers(allUsers);
        });
    // Listen for changes to agents and update allAgents
    firebase.firestore().collection('agents')
        .onSnapshot(snapshot => {
            allAgents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Optionally refresh agent table if in agents section
            if (currentSection === 'agents') displayAgents(allAgents);
        });
}

// ===== ANNOUNCEMENTS FIRESTORE & REAL-TIME LOGIC =====
// Firestore: announcements collection fields:
// title, content, timestamp, targetType, targetIds, createdBy, readBy, attachmentUrl

let announcements = [];
let announcementUnsubscribe = null;


// Modal helpers
window.openAnnouncementFormModal = function () {
    const el = document.getElementById('announcementFormModal');
    if (el) el.style.display = 'flex';
};
window.closeAnnouncementFormModal = function () {
    const el = document.getElementById('announcementFormModal');
    if (el) el.style.display = 'none';
};
window.openIndividualUserModal = function () {
    const el = document.getElementById('individualUserModal');
    if (el) {
        el.style.display = 'flex';
        renderUserSearchResults();
    }
};
window.closeIndividualUserModal = function () {
    const el = document.getElementById('individualUserModal');
    if (el) el.style.display = 'none';
};

// Individual user selection logic
let selectedUserIds = [];
function renderUserSearchResults(query = '') {
    const allUsers = window.allUsers || [];
    const resultsDiv = document.getElementById('userSearchResults');
    if (!resultsDiv) return;
    let filtered = allUsers;
    if (query) {
        const q = query.toLowerCase();
        filtered = allUsers.filter(u => (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    }
    resultsDiv.innerHTML = filtered.map(u => `
        <div style='display:flex;align-items:center;gap:10px;margin-bottom:8px;'>
            <input type='checkbox' class='individual-user-checkbox' value='${u.uid}' id='user-${u.uid}' ${selectedUserIds.includes(u.uid) ? 'checked' : ''}>
            <label for='user-${u.uid}' style='flex:1;cursor:pointer;'>${u.firstName} ${u.lastName} (${u.email}) <span style='color:#888;font-size:0.9em;'>[${u.role}]</span></label>
        </div>
    `).join('');
}
document.getElementById('userSearchInput')?.addEventListener('input', function (e) {
    renderUserSearchResults(e.target.value);
});
document.getElementById('userSearchResults')?.addEventListener('change', function (e) {
    if (e.target.classList.contains('individual-user-checkbox')) {
        const uid = e.target.value;
        if (e.target.checked) {
            if (!selectedUserIds.includes(uid)) selectedUserIds.push(uid);
        } else {
            selectedUserIds = selectedUserIds.filter(id => id !== uid);
        }
    }
});
const confirmUserSelectionBtnEl = document.getElementById('confirmUserSelectionBtn');
if (confirmUserSelectionBtnEl) confirmUserSelectionBtnEl.addEventListener('click', function () {
    const allUsersLocal = window.allUsers || [];
    const selected = allUsersLocal.filter(u => selectedUserIds.includes(u.uid));
    const selList = document.getElementById('selectedUsersList');
    if (selList) selList.innerHTML = selected.map(u => `${u.firstName} ${u.lastName} (${u.email})`).join('<br>');
    const indModal = document.getElementById('individualUserModal'); if (indModal) indModal.style.display = 'none';
});
// Reset selected users when opening form
const openAnnouncementFormBtnEl = document.getElementById('openAnnouncementFormBtn');
if (openAnnouncementFormBtnEl) openAnnouncementFormBtnEl.addEventListener('click', function () {
    selectedUserIds = [];
    const sel = document.getElementById('selectedUsersList'); if (sel) sel.innerHTML = '';
});

if (openAnnouncementFormBtnEl) openAnnouncementFormBtnEl.onclick = openAnnouncementFormModal;

const announcementTargetTypeEl = document.getElementById('announcementTargetType');
if (announcementTargetTypeEl) announcementTargetTypeEl.onchange = function () {
    const ind = document.getElementById('individualTargetGroup'); if (ind) ind.style.display = this.value === 'individual' ? 'block' : 'none';
};

const openIndividualModalBtnEl = document.getElementById('openIndividualModalBtn');
if (openIndividualModalBtnEl) openIndividualModalBtnEl.onclick = openIndividualUserModal;

const announcementFormEl = document.getElementById('announcementForm');
if (announcementFormEl) announcementFormEl.onsubmit = async function (e) {
    e.preventDefault();
    const titleEl = document.getElementById('announcementTitle');
    const contentEl = document.getElementById('announcementContent');
    const targetTypeEl = document.getElementById('announcementTargetType');
    const title = titleEl ? titleEl.value.trim() : '';
    const content = contentEl ? contentEl.value.trim() : '';
    const targetType = targetTypeEl ? targetTypeEl.value : 'all';
    if (!title || !content) {
        alert('Please provide title and content for the announcement.');
        return;
    }
    try {
        const announcement = {
            title,
            content,
            targetAudience: targetType, // 'agents' | 'students' | 'all' | 'individual'
            targetIds: Array.isArray(selectedUserIds) ? selectedUserIds : [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : null,
            isActive: true
        };
        // Use firebase directly for consistency
        await firebase.firestore().collection('announcements').add(announcement);
        // Create notifications for targeted users
        if (targetType === 'individual' && Array.isArray(selectedUserIds) && selectedUserIds.length) {
            selectedUserIds.forEach(uid => {
                try {
                    window.Notifications?.createNotification({
                        recipientId: uid,
                        type: 'announcement',
                        title,
                        content,
                        link: '/admin-dashboard.html'
                    });
                } catch (e) {
                    console.error('Notification error for user', uid, e);
                }
            });
        } else {
            // Broadcast: notify all users if Notifications module present
            try {
                window.Notifications?.createNotification({
                    recipientId: 'broadcast',
                    type: 'announcement',
                    title,
                    content,
                    link: '/admin-dashboard.html'
                });
            } catch (e) {
                console.error('Broadcast notification error', e);
            }
        }
        // Close and reset
        const indModal = document.getElementById('individualUserModal'); if (indModal) indModal.style.display = 'none';
        const annModal = document.getElementById('announcementFormModal'); if (annModal) annModal.style.display = 'none';
        if (titleEl) titleEl.value = '';
        if (contentEl) contentEl.value = '';
        showToast('Announcement posted successfully');
    } catch (err) {
        console.error('Failed to post announcement', err);
        showToast('Failed to post announcement: ' + (err.message || err));
    }
};
// (announcement logic handled inside the announcement form submit handler)

// Real-time announcements list for admin preview
function listenToAdminAnnouncements() {
    if (announcementUnsubscribe) announcementUnsubscribe();
    announcementUnsubscribe = firebase.firestore().collection('announcements')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAnnouncementsList();
        });
}

function renderAnnouncementsList() {
    const list = document.getElementById('announcementsList');
    if (!list) return;
    if (!announcements.length) {
        list.innerHTML = '<div class="empty-state">No announcements yet.</div>';
        return;
    }
    list.innerHTML = announcements.map(a => {
        // Delivery stats
        let deliveredTo = [];
        const ta = a.targetAudience || a.targetType || 'all';
        if (ta === 'all' || ta === 'general') {
            // All users (students + agents)
            deliveredTo = (window.allUsers || []).map(u => u.uid);
        } else if (ta === 'student' || ta === 'students') {
            deliveredTo = (window.allUsers || []).filter(u => u.role === 'student').map(u => u.uid);
        } else if (ta === 'agent' || ta === 'agents') {
            deliveredTo = (window.allUsers || []).filter(u => u.role === 'agent').map(u => u.uid);
        } else if (ta === 'individual') {
            deliveredTo = a.targetIds || [];
        }
        const readBy = a.readBy || [];
        const totalDelivered = deliveredTo.length;
        const totalRead = readBy.length;
        const totalUnread = Math.max(totalDelivered - totalRead, 0);
        return `
         <div class="card announcement-card">
             <div style="display:flex;align-items:center;justify-content:space-between;">
                 <div style="font-weight:600;font-size:1.1em;">${a.title}</div>
                 <span style="font-size:0.95em;color:var(--gray);">${a.timestamp && a.timestamp.seconds ? new Date(a.timestamp.seconds * 1000).toLocaleString() : ''}</span>
             </div>
             <div style="margin:10px 0 0 0;">${a.content}</div>
             ${a.attachmentUrl ? `<div style='margin-top:8px;'><a href='${a.attachmentUrl}' target='_blank'>View Attachment</a></div>` : ''}
             <div style="margin-top:10px;font-size:0.95em;color:var(--gray);">
                 Target: ${ta === 'all' || ta === 'general' ? 'All Users' : ta.charAt(0).toUpperCase() + ta.slice(1)}
                 ${ta === 'individual' ? ` (${(a.targetIds || []).length} users)` : ''}
             </div>
             <div style="margin-top:8px;font-size:0.95em;color:#007bff;">
                 <strong>Delivery Stats:</strong> Delivered: ${totalDelivered} &nbsp;|&nbsp; Read: ${totalRead} &nbsp;|&nbsp; Unread: ${totalUnread}
             </div>
             <div style="margin-top:8px;display:flex;gap:10px;">
                 <button class="btn-small btn-outline" onclick="editAnnouncement('${a.id}')"><i class="fas fa-edit"></i> Edit</button>
                 <button class="btn-small btn-danger" onclick="deleteAnnouncement('${a.id}')"><i class="fas fa-trash"></i> Delete</button>
             </div>
         </div>
     `;
    }).join('');
}

// Delete announcement
window.deleteAnnouncement = async function (id) {
    if (!confirm('Delete this announcement?')) return;
    try {
        await firebase.firestore().collection('announcements').doc(id).delete();
        showToast('Announcement deleted');
    } catch (err) {
        console.error('Failed to delete announcement', err);
        showToast('Failed to delete announcement: ' + (err.message || err));
    }
};

// TODO: Implement editAnnouncement (optional)

// Start listening on load
// Removed: announcements listener is now only set up when switching to the section

// === ASSIGNMENT MODALS AND LOGIC ===
let selectedStudentId = null;
let selectedAgentId = null;
let assignMode = null; // 'student-to-agent' or 'agent-to-student'

// Open modal to assign agent to student
window.openAssignAgentModal = function (studentId) {
    assignMode = 'student-to-agent';
    selectedStudentId = studentId;
    selectedAgentId = null;
    const modal = document.getElementById('assignAgentModal');
    const list = document.getElementById('agentSelectList');
    if (list) list.innerHTML = allAgents.map(agent => {
        const aid = agent.id || agent.uid || '';
        return `<div style='display:flex;align-items:center;gap:10px;margin-bottom:10px;'>
            <input type='radio' name='assignAgentRadio' value='${aid}' id='agent-${aid}'>
            <label for='agent-${aid}' style='flex:1;cursor:pointer;'>${agent.firstName} ${agent.lastName} (${agent.email})</label>
        </div>`;
    }).join('');
    if (modal) modal.style.display = 'flex';
    const assignAgentConfirmBtnEl = document.getElementById('assignAgentConfirmBtn'); if (assignAgentConfirmBtnEl) assignAgentConfirmBtnEl.onclick = handleAssignAgentConfirm;
}

window.closeAssignAgentModal = function () {
    const modal = document.getElementById('assignAgentModal'); if (modal) modal.style.display = 'none';
    selectedStudentId = null;
    selectedAgentId = null;
}

function handleAssignAgentConfirm() {
    const checked = document.querySelector('input[name="assignAgentRadio"]:checked');
    if (!checked) { alert('Select an agent.'); return; }
    selectedAgentId = checked.value;
    assignAgentToStudent(selectedAgentId, selectedStudentId);
}

// Open modal to assign student to agent
window.openAssignStudentModal = function (agentId) {
    assignMode = 'agent-to-student';
    selectedAgentId = agentId;
    selectedStudentId = null;
    const modal = document.getElementById('assignStudentModal');
    const list = document.getElementById('studentSelectList');
    // Only show students (role === 'student')
    if (list) list.innerHTML = allUsers.filter(u => u.role === 'student').map(student => {
        const sid = student.uid || student.id || '';
        return `<div style='display:flex;align-items:center;gap:10px;margin-bottom:10px;'>
            <input type='radio' name='assignStudentRadio' value='${sid}' id='student-${sid}'>
            <label for='student-${sid}' style='flex:1;cursor:pointer;'>${student.firstName} ${student.lastName} (${student.email})</label>
        </div>`;
    }).join('');
    if (modal) modal.style.display = 'flex';
    const assignStudentConfirmBtnEl = document.getElementById('assignStudentConfirmBtn'); if (assignStudentConfirmBtnEl) assignStudentConfirmBtnEl.onclick = handleAssignStudentConfirm;
}

window.closeAssignStudentModal = function () {
    const modal = document.getElementById('assignStudentModal'); if (modal) modal.style.display = 'none';
    selectedStudentId = null;
    selectedAgentId = null;
}

function handleAssignStudentConfirm() {
    const checked = document.querySelector('input[name="assignStudentRadio"]:checked');
    if (!checked) { alert('Select a student.'); return; }
    selectedStudentId = checked.value;
    assignAgentToStudent(selectedAgentId, selectedStudentId);
}

// Firestore assignment logic
async function assignAgentToStudent(agentId, studentId) {
    if (!agentId || !studentId) { alert('Missing agent or student.'); return; }
    try {
        // Resolve agent document id: prefer direct doc id, fallback to where(uid == agentId)
        let resolvedAgentId = agentId;
        try {
            const direct = await firebase.firestore().collection('agents').doc(agentId).get();
            if (!direct.exists) {
                const q = await firebase.firestore().collection('agents').where('uid', '==', agentId).limit(1).get();
                if (!q.empty) resolvedAgentId = q.docs[0].id;
            } else resolvedAgentId = direct.id;
        } catch (e) {
            console.warn('Agent doc resolution failed, using provided agentId', e);
        }
        // Resolve student document id similarly (users collection)
        let resolvedStudentId = studentId;
        try {
            const directS = await firebase.firestore().collection('users').doc(studentId).get();
            if (!directS.exists) {
                const q2 = await firebase.firestore().collection('users').where('uid', '==', studentId).limit(1).get();
                if (!q2.empty) resolvedStudentId = q2.docs[0].id;
            } else resolvedStudentId = directS.id;
        } catch (e) {
            console.warn('Student doc resolution failed, using provided studentId', e);
        }
        // Check for existing assignment (pending or accepted) in either direction
        const existingQuery = await firebase.firestore().collection('assignments')
            .where('agentId', '==', resolvedAgentId)
            .where('studentId', '==', resolvedStudentId)
            .where('status', 'in', ['pending', 'accepted'])
            .get();
        if (!existingQuery.empty) {
            alert('Assignment already exists!');
            return;
        }
        // NOTE: Allow multiple agents per student — do not block assignment if student has other assignments.
        // Write to assignments collection
        const assignmentData = {
            agentId: resolvedAgentId,
            studentId: resolvedStudentId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        };
        await firebase.firestore().collection('assignments').add(assignmentData);
        console.log('Assignment written to Firestore:', assignmentData);
        alert('Assignment successful!');
        if (assignMode === 'student-to-agent') closeAssignAgentModal();
        else closeAssignStudentModal();
    } catch (err) {
        console.error('Assignment Firestore write failed:', err);
        alert('Assignment failed: ' + err.message);
    }
}

// === REAL-TIME ASSIGNMENTS LISTENER (ADMIN) ===
function setupAssignmentRealtimeListeners() {
    firebase.firestore().collection('assignments')
        .onSnapshot(snapshot => {
            const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Group accepted assignments by agentId for real-time assigned student count
            // Count all accepted assignments (not unique students)
            agentAssignmentsMap = {};
            studentAssignmentStatusMap = {};
            assignments.forEach(a => {
                // Count both pending and accepted assignments towards the agent's total
                if (a.status === 'accepted' || a.status === 'pending') {
                    if (!agentAssignmentsMap[a.agentId]) agentAssignmentsMap[a.agentId] = [];
                    agentAssignmentsMap[a.agentId].push(a);
                }
                // For student listing, consider both pending and accepted as "assigned"
                if (a.status === 'accepted' || a.status === 'pending') {
                    studentAssignmentStatusMap[a.studentId] = a;
                }
            });
            // Update UI in real time
            if (currentSection === 'users') displayUsers(allUsers);
            if (currentSection === 'agents') displayAgents(allAgents);
        });
    // Debug: expose agent assignment counts in console
    try { console.debug('agentAssignmentsMap snapshot:', Object.fromEntries(Object.entries(agentAssignmentsMap).map(([k, v]) => [k, v.length]))); } catch (e) { }
}

// ===== ADMIN DASHBOARD JAVASCRIPT =====

let currentSection = 'dashboard';
let allUsers = [];
let allAgents = [];
let agentAssignmentsMap = {}; // agentId -> array of accepted assignments
let studentAssignmentStatusMap = {}; // studentId -> accepted assignment

// === REAL-TIME DISPLAY FOR PENDING AGENTS ===
function displayPendingAgentsRealtime(agents) {
    const container = document.getElementById('pendingAgentsList');
    if (!container) return;
    if (!agents || agents.length === 0) {
        container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No pending applications</p>';
        return;
    }
    let html = '';
    agents.forEach(agent => {
        const agentId = agent.id || agent.uid || '';
        html += `
            <div class="agent-approval-card" data-agent-id="${agentId}">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start;">
                    <div>
                        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                            <img class="agent-photo" src="${agent.profilePhoto || agent.photo || 'https://via.placeholder.com/80'}" alt="Agent" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">
                            <div>
                                <h3 class="agent-name" style="color: var(--dark); margin: 0 0 5px 0;">${agent.firstName || agent.name || ''} ${agent.lastName || ''}</h3>
                                <p class="agent-email" style="color: var(--gray); font-size: 0.9rem; margin: 0 0 5px 0;">${agent.email}</p>
                                <p class="agent-phone" style="color: var(--gray); font-size: 0.9rem; margin: 0;">${agent.phone || 'N/A'}</p>
                            </div>
                        </div>
                        <div style="background: #f8f9ff; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                            <p style="margin: 0 0 10px 0; font-size: 0.85rem;"><strong>Experience:</strong> <span class="agent-experience">${agent.experience || 0} years</span></p>
                            <p style="margin: 0 0 10px 0; font-size: 0.85rem;"><strong>Country:</strong> <span class="agent-country">${agent.country || '-'}</span></p>
                            <p style="margin: 0; font-size: 0.85rem;"><strong>Applied:</strong> <span class="agent-applied-date">${formatDate(agent.appliedAt || agent.createdAt)}</span></p>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <p style="margin: 0 0 10px 0; font-size: 0.85rem; font-weight: 600;">Professional Bio:</p>
                            <p class="agent-bio" style="margin: 0; font-size: 0.85rem; color: var(--gray); line-height: 1.5;">${agent.bio || '-'}</p>
                        </div>
                    </div>
                    <div style="border-left: 2px solid #e1e5ee; padding-left: 20px; display: flex; flex-direction: column; gap: 15px;">
                        <div style="background: #fffbf0; padding: 15px; border-radius: 6px; border-left: 4px solid #ffa500;">
                            <p style="margin: 0; font-size: 0.85rem; color: #856404;"><i class="fas fa-info-circle"></i> Application pending admin review</p>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; display: block; margin-bottom: 8px; font-weight: 600;">Set Temporary Password:</label>
                            <input type="password" class="agent-temp-password" placeholder="Enter temporary password" style="width: 100%; padding: 8px; border: 1px solid var(--light-gray); border-radius: 4px; font-size: 0.85rem;">
                            <small style="color: var(--gray);">Agent will receive password reset email after approval</small>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn-primary" style="flex: 1; padding: 10px;" onclick="confirmAgentApplication(this)">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button type="button" class="btn-danger" style="flex: 1; padding: 10px; background: #dc3545; border: none; color: white; border-radius: 6px; cursor: pointer;" onclick="rejectAgentApplication(this)">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// === REAL-TIME AGENT LISTENERS ===
function setupAgentRealtimeListeners() {
    // Pending Approval (status: pending)
    firebase.firestore().collection('agents')
        .where('status', '==', AGENT_STATUS.PENDING)
        .onSnapshot(snapshot => {
            const pendingAgents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            displayPendingAgentsRealtime(pendingAgents);
        });

    // Agent Management (status: verified)
    firebase.firestore().collection('agents')
        .where('status', '==', AGENT_STATUS.VERIFIED)
        .onSnapshot(snapshot => {
            allAgents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            displayAgents(allAgents);
        });
}

// === REAL-TIME NOTIFICATION LISTENER ===
function setupNotificationRealtimeListener(userId) {
    // Listen to notifications for the current user (admin, agent, or student)
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
        notificationsDropdown.style.right = '0';
        notificationsDropdown.style.background = '#fff';
        notificationsDropdown.style.boxShadow = '0 8px 32px rgba(44,62,80,0.15)';
        notificationsDropdown.style.borderRadius = '10px';
        notificationsDropdown.style.minWidth = '320px';
        notificationsDropdown.style.maxWidth = '95vw';
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

function showNotificationsDropdown() {
    // If global Notifications modal exists, prefer it
    if (window.Notifications && typeof window.Notifications.setupBell === 'function') {
        // trigger the global bell to open modal
        const bell = document.querySelector('.notification-bell');
        bell && bell.click();
        return;
    }
    renderNotificationsDropdown();
    notificationsDropdown.style.display = 'block';
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
        if (notificationsDropdown && notificationsDropdown.style.display === 'block') {
            hideNotificationsDropdown();
        } else {
            showNotificationsDropdown();
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

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in and is an admin
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'admin-login.html';
            return;
        }

        // Get user data and verify role
        const userData = await getCurrentUserData();
        if (!userData.success || userData.data.role !== USER_ROLES.ADMIN) {
            window.location.href = 'admin-login.html';
            return;
        }

        initializeDashboard();
        setupAgentRealtimeListeners();
        setupAssignmentRealtimeListeners();
        // Setup notification listener for this admin
        setupNotificationRealtimeListener(user.uid);
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);
        });
    });

    // Search functionality
    document.getElementById('userSearchInput')?.addEventListener('input', filterUsers);
    document.getElementById('agentSearchInput')?.addEventListener('input', filterAgents);

    // Create admin form
    const createAdminForm = document.getElementById('createAdminForm');
    if (createAdminForm) {
        createAdminForm.addEventListener('submit', handleCreateAdmin);
    }
});

/**
 * Initialize admin dashboard (loads stats, users, agents, pending apps, contacts)
 */
async function initializeDashboard() {
    try {
        const userDataRes = await getCurrentUserData();
        if (userDataRes.success) {
            const adminUser = userDataRes.data;
            const firstName = adminUser.firstName || 'Admin';
            const lastName = adminUser.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();

            if (document.getElementById('adminWelcomeName')) document.getElementById('adminWelcomeName').textContent = firstName;
            if (document.getElementById('adminInfoAvatar')) document.getElementById('adminInfoAvatar').textContent = firstName.charAt(0).toUpperCase();
            if (document.getElementById('adminInfoFullName')) document.getElementById('adminInfoFullName').textContent = fullName;
            if (document.getElementById('adminInfoEmail')) document.getElementById('adminInfoEmail').textContent = adminUser.email || 'Not provided';
            if (document.getElementById('adminInfoPhone')) document.getElementById('adminInfoPhone').textContent = adminUser.phone || 'Not provided';
            document.querySelectorAll('#sectionUserAvatar').forEach(el => el.textContent = firstName.charAt(0).toUpperCase());
            document.querySelectorAll('#sectionUserName').forEach(el => el.textContent = fullName);
        }

        await loadStatistics();
        await loadAllUsers();
        // Real-time listeners now handle agent updates
        // === REAL-TIME AGENT LISTENERS ===
        function setupAgentRealtimeListeners() {
            // Pending Approval (status: pending)
            firebase.firestore().collection('agents')
                .where('status', '==', AGENT_STATUS.PENDING)
                .onSnapshot(snapshot => {
                    const pendingAgents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    displayPendingAgentsRealtime(pendingAgents);
                });

            // Agent Management (status: verified)
            firebase.firestore().collection('agents')
                .where('status', '==', AGENT_STATUS.VERIFIED)
                .onSnapshot(snapshot => {
                    allAgents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    displayAgents(allAgents);
                });
        }

        // Real-time display for pending agents
        function displayPendingAgentsRealtime(agents) {
            const container = document.getElementById('pendingAgentsList');
            if (!container) return;
            if (!agents || agents.length === 0) {
                container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No pending applications</p>';
                return;
            }
            let html = '';
            agents.forEach(agent => {
                const agentId = agent.id || agent.uid || '';
                html += `
                    <div class="agent-approval-card" data-agent-id="${agentId}">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start;">
                            <div>
                                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                                    <img class="agent-photo" src="${agent.profilePhoto || agent.photo || 'https://via.placeholder.com/80'}" alt="Agent" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">
                                    <div>
                                        <h3 class="agent-name" style="color: var(--dark); margin: 0 0 5px 0;">${agent.firstName || agent.name || ''} ${agent.lastName || ''}</h3>
                                        <p class="agent-email" style="color: var(--gray); font-size: 0.9rem; margin: 0 0 5px 0;">${agent.email}</p>
                                        <p class="agent-phone" style="color: var(--gray); font-size: 0.9rem; margin: 0;">${agent.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div style="background: #f8f9ff; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                                    <p style="margin: 0 0 10px 0; font-size: 0.85rem;"><strong>Experience:</strong> <span class="agent-experience">${agent.experience || 0} years</span></p>
                                    <p style="margin: 0 0 10px 0; font-size: 0.85rem;"><strong>Country:</strong> <span class="agent-country">${agent.country || '-'}</span></p>
                                    <p style="margin: 0; font-size: 0.85rem;"><strong>Applied:</strong> <span class="agent-applied-date">${formatDate(agent.appliedAt || agent.createdAt)}</span></p>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <p style="margin: 0 0 10px 0; font-size: 0.85rem; font-weight: 600;">Professional Bio:</p>
                                    <p class="agent-bio" style="margin: 0; font-size: 0.85rem; color: var(--gray); line-height: 1.5;">${agent.bio || '-'}</p>
                                </div>
                            </div>
                            <div style="border-left: 2px solid #e1e5ee; padding-left: 20px; display: flex; flex-direction: column; gap: 15px;">
                                <div style="background: #fffbf0; padding: 15px; border-radius: 6px; border-left: 4px solid #ffa500;">
                                    <p style="margin: 0; font-size: 0.85rem; color: #856404;"><i class="fas fa-info-circle"></i> Application pending admin review</p>
                                </div>
                                <div>
                                    <label style="font-size: 0.85rem; display: block; margin-bottom: 8px; font-weight: 600;">Set Temporary Password:</label>
                                    <input type="password" class="agent-temp-password" placeholder="Enter temporary password" style="width: 100%; padding: 8px; border: 1px solid var(--light-gray); border-radius: 4px; font-size: 0.85rem;">
                                    <small style="color: var(--gray);">Agent will receive password reset email after approval</small>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button type="button" class="btn-primary" style="flex: 1; padding: 10px;" onclick="confirmAgentApplication(this)">
                                        <i class="fas fa-check"></i> Approve
                                    </button>
                                    <button type="button" class="btn-danger" style="flex: 1; padding: 10px; background: #dc3545; border: none; color: white; border-radius: 6px; cursor: pointer;" onclick="rejectAgentApplication(this)">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
        await loadContacts();
    } catch (err) {
        console.error('initializeDashboard error:', err);
    }
}

/**
 * Load all users and display in the users table
 */
async function loadAllUsers() {
    try {
        const result = await getAllUsers();
        if (!result.success) {
            const el = document.getElementById('usersList');
            if (el) el.innerHTML = '<p style="color: var(--gray);">Failed to load users</p>';
            return;
        }

        allUsers = result.data;
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        const el = document.getElementById('usersList');
        if (el) el.innerHTML = '<p style="color: var(--gray);">Failed to load users</p>';
    }
}

/**
 * Load and display statistics (admin)
 */
async function loadStatistics() {
    try {
        const result = await getUserStatistics();
        if (!result.success) return;

        if (document.getElementById('totalUsers')) document.getElementById('totalUsers').textContent = result.data.totalUsers;
        if (document.getElementById('totalAgents')) document.getElementById('totalAgents').textContent = result.data.totalAgents;
        if (document.getElementById('verifiedAgents')) document.getElementById('verifiedAgents').textContent = result.data.verifiedAgents;
        if (document.getElementById('pendingAgents')) document.getElementById('pendingAgents').textContent = result.data.pendingAgents;

        document.querySelectorAll('.notification-badge').forEach(el => { el.textContent = result.data.pendingAgents; });
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

/**
 * Cleanup helper for end-to-end simulation
 */
async function runEndToEndCleanup() {
    try {
        if (!window.__lastE2ETest) return { success: false, error: 'No test run found' };
        const { uid, authCreated } = window.__lastE2ETest;
        const steps = {};

        try {
            await firebase.firestore().collection('agents').doc(uid).delete();
            steps.agentDeleted = true;
        } catch (e) {
            steps.agentDeleted = false;
            steps.agentError = e.message;
        }

        try {
            await firebase.firestore().collection('users').doc(uid).delete();
            steps.userDeleted = true;
        } catch (e) {
            steps.userDeleted = false;
            steps.userError = e.message;
        }

        if (authCreated) {
            steps.authNote = 'Auth user may exist in Firebase Authentication. Delete manually from Firebase Console if needed.';
        }

        window.__lastE2ETest = null;
        return { success: true, steps };
    } catch (error) {
        console.error('Cleanup error:', error);
        return { success: false, error: error.message };
    }
}

// UI trigger helpers
window.runEndToEndSimulation = runEndToEndSimulation;
window.runEndToEndCleanup = runEndToEndCleanup;
function runEndToEndSimulationUI() {
    runEndToEndSimulation().then(result => {
        console.log('E2E simulation result:', result);
        alert('E2E simulation completed. Success: ' + !!result.success);
    }).catch(err => {
        console.error(err);
        alert('E2E simulation failed: ' + err.message);
    });
}
function runEndToEndCleanupUI() {
    runEndToEndCleanup().then(result => {
        console.log('E2E cleanup result:', result);
        alert('Cleanup completed.');
    }).catch(err => {
        console.error(err);
        alert('Cleanup failed: ' + err.message);
    });
}
function displayUsers(users) {
    const usersList = document.getElementById('usersList');

    if (users.length === 0) {
        usersList.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No users found</p>';
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Country</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
        let statusBadge = '';
        if (user.role === 'student') {
            statusBadge = studentAssignmentStatusMap[user.uid] ?
                '<span class="status-badge status-assigned">Assigned</span>' :
                '<span class="status-badge status-unassigned">Unassigned</span>';
        }
        html += `
            <tr>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${capitalizeRole(user.role)}</span></td>
                <td>${user.country || 'N/A'}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn-small" onclick="viewUserDetails('${user.uid}')">View</button>
                    <button class="btn-small btn-danger" onclick="deleteUserAccount('${user.uid}', '${user.email}')">Delete</button>
                    <button class="btn-small btn-primary" onclick="openMessageModal('${user.uid}', '${user.firstName} ${user.lastName}', '${user.role}')">Message</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    usersList.innerHTML = html;
}

/**
 * Filter users
 */
function filterUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
    const filtered = allUsers.filter(user =>
        user.firstName.toLowerCase().includes(searchTerm) ||
        user.lastName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    displayUsers(filtered);
}

/**
 * Load all verified agents
 */
async function loadAllAgents() {
    // Deprecated: now handled by real-time listener
    // (kept for reference, can be removed)
}

/**
 * Display agents in table
 */
function displayAgents(agents) {
    const agentsList = document.getElementById('verifiedAgentsList');

    if (agents.length === 0) {
        agentsList.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No verified agents yet</p>';
        return;
    }

    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>University</th>
                    <th>Experience</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    agents.forEach(agent => {
        const agentDocId = agent.id || '';
        const agentAuthUid = agent.uid || '';
        // Build a combined list of assignments keyed by either doc id or auth uid (avoid double-counting)
        const listByDoc = agentAssignmentsMap[agentDocId] || [];
        const listByUid = (agentAuthUid && agentAuthUid !== agentDocId) ? (agentAssignmentsMap[agentAuthUid] || []) : [];
        const merged = [];
        const seenIds = new Set();
        listByDoc.concat(listByUid).forEach(a => { if (a && a.id && !seenIds.has(a.id)) { seenIds.add(a.id); merged.push(a); } });
        const assignedCount = merged.length;
        html += `
            <tr>
                <td>${agent.firstName} ${agent.lastName}</td>
                <td>${agent.email}</td>
                <td>${agent.university || 'N/A'}</td>
                <td>${agent.experience || 0} years</td>
                <td>${agent.country || 'N/A'}</td>
                <td><span class="status-badge status-${agent.status}">${capitalizeStatus(agent.status)}</span></td>
                <td>
                    <button class="btn-small" onclick="viewAgentDetails('${agentDocId || agentAuthUid}')">View</button>
                    <button class="btn-small btn-danger" onclick="removeAgent('${agentDocId || agentAuthUid}', '${agent.email}')">Remove</button>
                    <button class='btn-small btn-primary' onclick='openAssignStudentModal("${agentDocId || agentAuthUid}")'>Assign</button>
                    <span style="margin-left:8px;font-weight:bold;color:#2a7;">${assignedCount} assigned</span>
                    <button class='btn-small btn-secondary' style='margin-left:8px;' onclick='viewAssignedStudentsModal("${agentDocId || agentAuthUid}")'>View Assigned Students</button>
                </td>
            </tr>
        `;
    });
    html += `
            </tbody >
        </table >
            `;
    agentsList.innerHTML = html;
}

/**
 * Filter agents
 */
function filterAgents() {
    const searchTerm = document.getElementById('agentSearchInput').value.toLowerCase();
    const filtered = allAgents.filter(agent =>
        agent.firstName.toLowerCase().includes(searchTerm) ||
        agent.lastName.toLowerCase().includes(searchTerm) ||
        agent.email.toLowerCase().includes(searchTerm)
    );
    displayAgents(filtered);
}



/**
 * Approve agent application
 */
async function approveAgentHandler(agentUid) {
    if (!confirm('Approve this agent and create account?')) return;

    // Generate a temporary password for the agent account
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

    try {
        const result = await approveAgent(agentUid, tempPassword);
        if (result.success) {
            alert('Agent approved. A password reset email was sent to the agent.');
            await loadPendingAgents();
            await loadStatistics();
        } else {
            alert('Failed to approve agent: ' + result.error);
        }
    } catch (error) {
        alert('Failed to approve agent: ' + error.message);
    }
}

/**
 * Reject agent application
 */
async function rejectAgentApplication(agentUid) {
    const reason = prompt('Enter rejection reason (optional):');

    const result = await rejectAgent(agentUid, reason);
    if (result.success) {
        alert('Agent application rejected');
        await loadPendingAgents();
        await loadStatistics();
    } else {
        alert('Failed to reject agent: ' + result.error);
    }
}

/**
 * QA helper: validate that an approved agent has proper users and agents records
 * Returns { success: boolean, details: {...} }
 */
async function runAgentApprovalQA(uidOrAgentId) {
    try {
        // Try users/{uid} first
        const userDoc = await firebase.firestore().collection('users').doc(uidOrAgentId).get();
        const agentDoc = await firebase.firestore().collection('agents').doc(uidOrAgentId).get();

        const details = {
            userExists: userDoc.exists,
            agentExists: agentDoc.exists,
            userData: userDoc.exists ? userDoc.data() : null,
            agentData: agentDoc.exists ? agentDoc.data() : null
        };

        // Basic expectations
        const userOk = userDoc.exists && userDoc.data().role === USER_ROLES.AGENT && (userDoc.data().status === AGENT_STATUS.VERIFIED || userDoc.data().status === 'verified');
        const agentOk = agentDoc.exists && agentDoc.data().status === AGENT_STATUS.VERIFIED;

        return { success: userOk && agentOk, details };
    } catch (error) {
        console.error('Error running agent approval QA:', error);
        return { success: false, error: error.message };
    }
}

/**
 * End-to-end simulation helper (for admin/testing)
 * - Registers a test agent user
 * - Ensures an agents/{uid} doc exists (status: pending)
 * - Approves the agent via approveAgent()
 * - Verifies agent appears in verified agents list
 * Returns { success: boolean, steps: { ... } }
 */
/**
 * End-to-end simulation helper (for admin/testing)
 * - If authMode is true, creates a real Auth user (logs out admin!)
 * - Otherwise, runs safe mode (no Auth user, just Firestore docs)
 * Usage: runEndToEndSimulation(true) for full test
 */
async function runEndToEndSimulation(authMode = false) {
    try {
        await waitForFirebase();

        const timestamp = Date.now();
        const testEmail = `test.agent.${timestamp} @example.com`;
        const testPassword = 'TestPass1!';
        const userData = {
            firstName: 'E2E',
            lastName: `Agent${timestamp} `,
            phone: '',
            country: 'Testland'
        };

        const steps = {};
        let uid = null;
        let authCreated = false;

        if (authMode) {
            // Warn: this will log out the current admin!
            steps.authMode = true;
            // Save current user for re-login
            const adminUser = firebase.auth().currentUser;
            steps.adminUser = adminUser ? adminUser.email : null;
            // Create Auth user
            const reg = await registerUserWithRole(testEmail, testPassword, userData, USER_ROLES.AGENT, null);
            steps.register = reg;
            if (!reg.success) return { success: false, steps, error: 'Registration failed' };
            uid = reg.uid;
            authCreated = true;
        } else {
            // Safe mode: only create Firestore docs
            uid = 'E2E-' + timestamp;
            steps.authMode = false;
            steps.fakeUid = uid;
            // Create users/{uid}
            await firebase.firestore().collection('users').doc(uid).set({
                uid: uid,
                email: testEmail,
                role: USER_ROLES.AGENT,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                country: userData.country,
                status: AGENT_STATUS.PENDING,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // 2) Ensure agents/{uid} doc exists
        try {
            const agentRef = firebase.firestore().collection('agents').doc(uid);
            const adoc = await agentRef.get();
            if (!adoc.exists) {
                await agentRef.set({
                    uid: uid,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: testEmail,
                    phone: userData.phone || '',
                    experience: 0,
                    bio: '',
                    country: userData.country || '',
                    profilePhoto: null,
                    status: AGENT_STATUS.PENDING,
                    assignedStudentCount: 0,
                    successfulStudents: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    approvedAt: null
                });
                steps.agentDoc = { created: true };
            } else {
                steps.agentDoc = { created: false };
            }
        } catch (e) {
            steps.agentDoc = { error: e.message };
        }

        // 3) Approve agent
        const approveResult = await approveAgent(uid, testPassword);
        steps.approve = approveResult;
        if (!approveResult.success) return { success: false, steps, error: 'Approval failed' };

        // 4) Verify agent appears in verified agents list
        const verified = await getVerifiedAgents();
        steps.verifiedAgentsQuery = verified;
        if (!verified.success) return { success: false, steps, error: 'Could not query verified agents' };

        const found = verified.data.some(a => (a.uid === uid || a.id === uid || a.email === testEmail));
        steps.foundInList = found;

        // Save for cleanup
        window.__lastE2ETest = { uid, authCreated };

        // If we created a real Auth user, log out (admin will need to log back in)
        if (authMode) {
            await firebase.auth().signOut();
            steps.adminLoggedOut = true;
        }

        return { success: found, steps };
    } catch (error) {
        console.error('End-to-end simulation error:', error);
        return { success: false, error: error.message };
    }
}

// Expose helper to window for manual triggering from console
window.runEndToEndSimulation = runEndToEndSimulation;

/**
 * Remove verified agent
 */
async function removeAgent(agentUid, email) {
    if (!confirm(`Are you sure you want to remove ${email} as an agent ? `)) {
        return;
    }

    try {
        await firebase.firestore().collection('agents').doc(agentUid).delete();
        alert('Agent removed successfully');
        await loadAllAgents();
        await loadStatistics();
    } catch (error) {
        alert('Failed to remove agent: ' + error.message);
    }
}

/**
 * Delete user account
 */
async function deleteUserAccount(uid, email) {
    if (!confirm(`Are you sure you want to delete the account for ${email} ? This cannot be undone.`)) {
        return;
    }

    try {
        // Delete user document
        await firebase.firestore().collection('users').doc(uid).delete();
        alert('User account deleted');
        await loadAllUsers();
        await loadStatistics();
    } catch (error) {
        alert('Failed to delete user: ' + error.message);
    }
}

/**
 * View user details (can be expanded)
 */
function viewUserDetails(uid) {
    const user = allUsers.find(u => u.uid === uid);
    if (user) {
        alert(`User: ${user.firstName} ${user.lastName} \nEmail: ${user.email} \nRole: ${user.role} \nCountry: ${user.country} `);
    }
}

/**
 * View agent details (can be expanded)
 */
function viewAgentDetails(uid) {
    const agent = allAgents.find(a => a.uid === uid);
    if (agent) {
        alert(`Agent: ${agent.firstName} ${agent.lastName} \nEmail: ${agent.email} \nUniversity: ${agent.university} \nExperience: ${agent.experience} years`);
    }
}

/**
 * Handle create admin account
 */
async function handleCreateAdmin(e) {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('adminError');
    const successElement = document.getElementById('adminSuccess');

    if (!isValidEmail(email)) {
        showFormError(errorElement, 'Please enter a valid email');
        return;
    }

    if (!isValidPassword(password)) {
        showFormError(errorElement, 'Password must be at least 6 characters');
        return;
    }

    try {
        // Create user in Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // Create admin user in Firestore
        await firebase.firestore().collection('users').doc(uid).set({
            uid: uid,
            email: email,
            role: USER_ROLES.ADMIN,
            firstName: 'Admin',
            lastName: 'User',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        successElement.textContent = 'Admin account created successfully!';
        successElement.style.display = 'block';
        document.getElementById('createAdminForm').reset();

        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    } catch (error) {
        showFormError(errorElement, error.message);
    }
}

/**
 * Switch section
 */
function switchSection(section) {
    console.log('[switchSection] Switching to section:', section);
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    const sectionElement = document.getElementById(section + '-section');
    if (sectionElement) {
        sectionElement.style.display = '';
        sectionElement.classList.add('active');
        console.log('[switchSection] Showing section element:', sectionElement.id, sectionElement);
        // Debug: log section innerHTML length
        console.log('[switchSection] Section innerHTML length:', sectionElement.innerHTML.length);
    } else {
        console.warn('[switchSection] Section element not found for:', section);
    }

    // Add active class to nav item
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    // Update page title and section header titles
    const titles = {
        dashboard: 'Dashboard',
        users: 'User Management',
        agents: 'Agent Management',
        'pending-agents': 'Pending Approvals',
        contacts: 'Contact Messages',
        settings: 'Settings',
        announcements: 'Announcements'
    };
    const title = titles[section] || 'Dashboard';

    // Update pageTitle if it exists
    if (document.getElementById('pageTitle')) {
        document.getElementById('pageTitle').textContent = title;
    }

    // Update section-header h1 in the active section
    const sectionHeader = sectionElement?.querySelector('.section-header h1, .section-header h2');
    if (sectionHeader) {
        sectionHeader.textContent = title;
    }

    // Scroll to top
    if (document.querySelector('.dashboard-container')) {
        document.querySelector('.dashboard-container').scrollTop = 0;
    }

    // Special: if announcements section, ensure announcements list is loaded and visible
    if (section === 'announcements') {
        console.log('[switchSection] Announcements section selected, calling listenToAdminAnnouncements');
        listenToAdminAnnouncements();
        // Debug: log announcementsList element
        setTimeout(() => {
            const list = document.getElementById('announcementsList');
            if (list) {
                console.log('[switchSection] announcementsList element found:', list, 'innerHTML length:', list.innerHTML.length);
            } else {
                console.warn('[switchSection] announcementsList element NOT found');
            }
            if (list && !list.innerHTML.trim()) {
                list.innerHTML = '<div class="empty-state">No announcements yet.</div>';
            }
        }, 500);
    }

    currentSection = section;
}

/**
 * Logout admin
 */
async function logoutAdmin() {
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

    // Desktop: keep collapsed behavior for spacing
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

// Helper: get initials from a name (for avatar fallback)
function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Show form error
 */
function showFormError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

/**
 * Capitalize role
 */
function capitalizeRole(role) {
    const roles = {
        student: 'Student',
        agent: 'Agent',
        admin: 'Administrator'
    };
    return roles[role] || role;
}

/**
 * Capitalize status
 */
function capitalizeStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
 * Load contacts from Firestore
 */
async function loadContacts() {
    try {
        const contactsList = document.getElementById('contactsList');
        // Real-time listener for contacts
        firebase.firestore().collection('contacts').orderBy('submittedAt', 'desc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    contactsList.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px;">No contact messages</p>';
                    return;
                }
                let html = `
                <div style="overflow-x:auto;">
                <table class="admin-table" style="min-width:700px;width:100%;border-collapse:collapse;">
                    <thead style="background:#f8f9ff;">
                        <tr>
                            <th style="padding:15px;text-align:left;">Name</th>
                            <th style="padding:15px;text-align:left;">Email</th>
                            <th style="padding:15px;text-align:left;">Subject</th>
                            <th style="padding:15px;text-align:left;">Date</th>
                            <th style="padding:15px;text-align:left;">Status</th>
                            <th style="padding:15px;text-align:center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                `;
                snapshot.forEach(doc => {
                    const contact = doc.data();
                    const date = contact.submittedAt ? new Date(contact.submittedAt.toDate()).toLocaleDateString() : 'N/A';
                    const status = contact.status || 'new';
                    html += `
                        <tr style="border-bottom:1px solid #e1e5ee;">
                            <td style="padding:15px;">${contact.fullName}</td>
                            <td style="padding:15px;">${contact.email}</td>
                            <td style="padding:15px;">${contact.subject}</td>
                            <td style="padding:15px;">${date}</td>
                            <td style="padding:15px;"><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                            <td style="padding:15px;text-align:center;">
                                <button class="btn-small" onclick="viewContactMessage('${doc.id}')">View</button>
                                <button class="btn-small" onclick="markContactAsRead('${doc.id}')">Mark Read</button>
                            </td>
                        </tr>
                    `;
                });
                html += `
                    </tbody>
                </table>
                </div>
                `;
                contactsList.innerHTML = html;
            }, error => {
                console.error('Error loading contacts:', error);
                contactsList.innerHTML = '<p style="color: var(--gray);">Failed to load contacts</p>';
            });
    } catch (error) {
        console.error('Error loading contacts:', error);
        document.getElementById('contactsList').innerHTML = '<p style="color: var(--gray);">Failed to load contacts</p>';
    }
}

/**
 * View contact message details
 */
async function viewContactMessage(contactId) {
    try {
        const doc = await firebase.firestore().collection('contacts').doc(contactId).get();
        if (doc.exists) {
            const contact = doc.data();
            const message = `
        From: ${contact.fullName}
        Email: ${contact.email}
        Phone: ${contact.phone}
        Subject: ${contact.subject}

        Message:
${contact.message}
        `;
            alert(message);
        }
    } catch (error) {
        console.error('Error viewing contact:', error);
        alert('Error loading contact message');
    }
}

/**
 * Mark contact as read
 */
async function markContactAsRead(contactId) {
    try {
        await firebase.firestore().collection('contacts').doc(contactId).update({
            status: 'read'
        });
        await loadContacts();
    } catch (error) {
        console.error('Error marking contact as read:', error);
    }
}

/**
 * Approve agent application and create account
 */
async function confirmAgentApplication(button) {
    const card = button.closest('.agent-approval-card');

    // Attempt to find agentId on the card (data attribute or hidden element)
    let agentId = card?.dataset?.agentId || card?.getAttribute('data-agent-id') || null;

    // Fallback: try to find an element with class 'agent-id'
    if (!agentId) {
        const idEl = card?.querySelector('.agent-id');
        if (idEl) agentId = idEl.textContent.trim();
    }

    // Fallback: lookup by email
    const email = card.querySelector('.agent-email')?.textContent?.trim();
    if (!agentId && email) {
        try {
            const snap = await firebase.firestore().collection('agents').where('email', '==', email).limit(1).get();
            if (!snap.empty) agentId = snap.docs[0].id;
        } catch (err) {
            console.warn('Agent lookup by email failed:', err);
        }
    }

    if (!agentId) {
        alert('Unable to determine agent record. Please refresh and try again.');
        return;
    }

    // Fetch agent doc to determine whether a linked uid exists
    let agentDocData = null;
    try {
        const adoc = await firebase.firestore().collection('agents').doc(agentId).get();
        if (adoc.exists) agentDocData = adoc.data();
    } catch (err) {
        console.warn('Could not fetch agent doc for approval check:', err);
    }

    const tempPassword = card.querySelector('.agent-temp-password')?.value || '';
    // If the applicant already registered and agent doc has uid, temp password is optional
    if (!agentDocData || !agentDocData.uid) {
        if (!tempPassword || tempPassword.length < 6) {
            alert('Please enter a valid temporary password (minimum 6 characters)');
            return;
        }
    }

    button.disabled = true;
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const result = await approveAgent(agentId, tempPassword);
        if (result.success) {
            alert('Agent approved successfully. Password reset email will be sent.');
            // Refresh lists
            await loadPendingAgents();
            await loadAllAgents();
            await loadStatistics();
            // Run QA checks for this agent
            try {
                const approvedUid = result.uid || agentId;
                const qa = await runAgentApprovalQA(approvedUid);
                if (!qa.success) {
                    console.warn('QA check found issues:', qa);
                    alert('Approval completed but QA detected issues. Check console for details.');
                } else {
                    console.log('QA passed for agent', approvedUid);
                }
            } catch (qaErr) {
                console.warn('Error running approval QA:', qaErr);
            }
        } else {
            throw new Error(result.error || 'Failed to approve agent');
        }
    } catch (error) {
        console.error('Error approving agent:', error);
        alert(error.message || 'Error approving agent');
    } finally {
        button.disabled = false;
        button.innerHTML = originalHtml || '<i class="fas fa-check"></i> Approve';
    }
}

/**
 * Reject agent application
 */
async function rejectAgentApplication(button) {
    if (!confirm('Are you sure you want to reject this agent application?')) {
        return;
    }

    const card = button.closest('.agent-approval-card');

    // Determine agentId similar to approve flow
    let agentId = card?.dataset?.agentId || card?.getAttribute('data-agent-id') || null;
    if (!agentId) {
        const idEl = card?.querySelector('.agent-id');
        if (idEl) agentId = idEl.textContent.trim();
    }

    const email = card.querySelector('.agent-email')?.textContent?.trim();
    if (!agentId && email) {
        try {
            const snap = await firebase.firestore().collection('agents').where('email', '==', email).limit(1).get();
            if (!snap.empty) agentId = snap.docs[0].id;
        } catch (err) {
            console.warn('Agent lookup by email failed:', err);
        }
    }

    if (!agentId) {
        alert('Unable to determine agent record. Please refresh and try again.');
        return;
    }

    button.disabled = true;
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const result = await rejectAgent(agentId, 'Rejected by admin');
        if (result.success) {
            alert('Agent application rejected');
            await loadPendingAgents();
            await loadStatistics();
        } else {
            throw new Error(result.error || 'Failed to reject agent');
        }
    } catch (error) {
        console.error('Error rejecting agent:', error);
        alert(error.message || 'Error rejecting application');
    } finally {
        button.disabled = false;
        button.innerHTML = originalHtml;
    }
}


window.viewAssignedStudentsModal = function (agentId) {
    // Remove any existing modal
    const oldModal = document.getElementById('assignedStudentsModal');
    if (oldModal) oldModal.remove();

    // Modal background
    const modalBg = document.createElement('div');
    modalBg.id = 'assignedStudentsModal';
    modalBg.className = 'modal-bg';
    modalBg.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;';

    // Modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style = 'background:#fff;padding:30px 20px;border-radius:10px;min-width:320px;max-width:95vw;max-height:80vh;overflow:auto;box-shadow:0 4px 24px rgba(0,0,0,0.10);width:100%;';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;';
    const title = document.createElement('h2');
    title.textContent = 'Assigned Students';
    title.style = 'margin:0;font-size:1.3rem;';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'assignedStudentsCloseBtn';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style = 'font-size:1.5rem;background:none;border:none;cursor:pointer;line-height:1;padding:0 8px;color:#333;';
    header.appendChild(title);
    header.appendChild(closeBtn);

    // List container
    const listDiv = document.createElement('div');
    listDiv.id = 'assignedStudentsList';
    listDiv.style = 'margin-bottom:10px;';

    // Append all
    modalContent.appendChild(header);
    modalContent.appendChild(listDiv);
    modalBg.appendChild(modalContent);
    document.body.appendChild(modalBg);
    // Close handler: unsubscribe and remove modal
    let unsubscribe = null;
    closeBtn.onclick = () => {
        if (typeof unsubscribe === 'function') try { unsubscribe(); } catch (e) { /* ignore */ }
        modalBg.remove();
    };

    // Real-time Firestore listener for assignments for this agent
    (async () => {
        // Try to resolve agent auth uid (some assignments use auth uid, others use agent doc id)
        let authUid = null;
        try {
            const doc = await firebase.firestore().collection('agents').doc(agentId).get();
            if (doc.exists) authUid = doc.data() && doc.data().uid ? doc.data().uid : null;
            else {
                const q = await firebase.firestore().collection('agents').where('uid', '==', agentId).limit(1).get();
                if (!q.empty) {
                    authUid = agentId;
                    // also set agentId to the doc id if needed (we already have the passed agentId)
                }
            }
        } catch (err) {
            console.warn('Failed to resolve agent uid for assigned students modal', err);
        }

        const keys = [agentId];
        if (authUid && authUid !== agentId) keys.push(authUid);

        if (keys.length === 1) {
            unsubscribe = firebase.firestore().collection('assignments')
                .where('agentId', '==', agentId)
                .where('status', '==', 'accepted')
                .onSnapshot(async snapshot => {
                    const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Fetch student details for each assignment
                    const studentPromises = assignments.map(async a => {
                        const studentDoc = await firebase.firestore().collection('users').doc(a.studentId).get();
                        if (studentDoc.exists) {
                            const s = studentDoc.data();
                            return `<li style='padding:10px 0;border-bottom:1px solid #f0f0f0;display:flex;flex-direction:column;gap:2px;'>
                                <span style='font-weight:600;'>${s.firstName || ''} ${s.lastName || ''}</span>
                                <span style='color:#555;font-size:0.97em;'>${s.email}</span>
                                <span style='color:#aaa;font-size:0.85em;'>ID: ${studentDoc.id}</span>
                            </li>`;
                        } else {
                            return `<li style='padding:10px 0;border-bottom:1px solid #f0f0f0;'><span style='font-weight:600;'>${a.studentId}</span></li>`;
                        }
                    });
                    const studentList = await Promise.all(studentPromises);
                    listDiv.innerHTML = `<ul style='list-style:none;padding:0;margin:0;'>${studentList.join('')}</ul>`;
                });
        } else {
            unsubscribe = firebase.firestore().collection('assignments')
                .where('agentId', 'in', keys)
                .where('status', '==', 'accepted')
                .onSnapshot(async snapshot => {
                    const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const studentPromises = assignments.map(async a => {
                        const studentDoc = await firebase.firestore().collection('users').doc(a.studentId).get();
                        if (studentDoc.exists) {
                            const s = studentDoc.data();
                            return `<li style='padding:10px 0;border-bottom:1px solid #f0f0f0;display:flex;flex-direction:column;gap:2px;'>
                                <span style='font-weight:600;'>${s.firstName || ''} ${s.lastName || ''}</span>
                                <span style='color:#555;font-size:0.97em;'>${s.email}</span>
                                <span style='color:#aaa;font-size:0.85em;'>ID: ${studentDoc.id}</span>
                            </li>`;
                        } else {
                            return `<li style='padding:10px 0;border-bottom:1px solid #f0f0f0;'><span style='font-weight:600;'>${a.studentId}</span></li>`;
                        }
                    });
                    const studentList = await Promise.all(studentPromises);
                    listDiv.innerHTML = `<ul style='list-style:none;padding:0;margin:0;'>${studentList.join('')}</ul>`;
                });
        }
    })();

// Close modal logic
closeBtn.onclick = function () {
    modalBg.remove();
    unsubscribe();
};
modalBg.addEventListener('click', function (e) {
    if (e.target === modalBg) {
        modalBg.remove();
        unsubscribe();
    }
});
};
