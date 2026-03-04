// Shared Notifications client
(function () {
    // Utility escape
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (s) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]); });
    }

    // Create redesigned modal UI (compact header + footer)
    function createModal() {
        if (document.getElementById('notificationsModal')) return;
        const modal = document.createElement('div');
        modal.id = 'notificationsModal';
        modal.className = 'notifications-modal-backdrop';
        modal.style.display = 'none';

        modal.innerHTML = `
      <div class="notifications-modal" role="dialog" aria-modal="true">
        <header class="notifications-modal-header">
          <h3 class="notifications-modal-title">Notifications</h3>
          <button id="closeNotificationsBtn" class="notifications-modal-close" aria-label="Close">&times;</button>
        </header>
        <div id="notificationsList" class="notifications-list" aria-live="polite"></div>
        <footer class="notifications-modal-footer">
          <button id="clearReadBtn" class="btn btn-outline" type="button">Clear read</button>
          <a href="notifications.html" id="viewAllNotifications" class="btn-link">View all notifications</a>
        </footer>
      </div>`;

        document.body.appendChild(modal);

        // When clicking "View all notifications", remember the current section and dashboard so the page can return
        const viewAllLink = document.getElementById('viewAllNotifications');
        if (viewAllLink) {
            viewAllLink.addEventListener('click', function () {
                try {
                    const activeNav = document.querySelector('.nav-item.active')?.getAttribute('data-section') || window.location.hash.replace('#', '') || 'dashboard';
                    sessionStorage.setItem('prevSection', activeNav);
                    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                    sessionStorage.setItem('prevDashboard', currentPage);
                } catch (e) { /* ignore */ }
            });
        }

        // Close behavior
        const closeBtn = document.getElementById('closeNotificationsBtn');
        function closeModal() {
            const mm = document.getElementById('notificationsModal'); if (mm) mm.style.display = 'none';
            window.removeEventListener('keydown', escListener);
        }
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        // Close when clicking on backdrop (outside modal)
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });

        // Close on Escape
        function escListener(e) { if (e.key === 'Escape') closeModal(); }
        window.addEventListener('keydown', escListener);

        // Clear read button in footer
        const clearBtn = document.getElementById('clearReadBtn');
        if (clearBtn) clearBtn.addEventListener('click', async () => {
            // Delete read notifications older than 30 days
            try {
                const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
                const snap = await firebase.firestore().collection('notifications')
                    .where('read', '==', true)
                    .where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(cutoff))
                    .get();
                const batch = firebase.firestore().batch();
                snap.forEach(d => batch.delete(d.ref));
                if (!snap.empty) await batch.commit();
                renderList(window._latestNotifications || []);
            } catch (e) { console.error('Clear read failed', e); }
        });
    }

    // Render list with individual actions and improved layout
    function renderList(list) {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        container.innerHTML = '';
        if (!list || !list.length) {
            container.innerHTML = '<div class="notifications-empty">No notifications</div>';
            return;
        }

        function timeAgo(ts) {
            if (!ts) return '';
            const then = (ts.seconds ? ts.seconds * 1000 : (typeof ts === 'number' ? ts : Date.parse(ts)));
            const diff = Date.now() - then; const sec = Math.floor(diff / 1000);
            if (sec < 60) return sec + 's ago';
            const m = Math.floor(sec / 60); if (m < 60) return m + 'm ago';
            const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
            const d = Math.floor(h / 24); if (d < 7) return d + 'd ago';
            return new Date(then).toLocaleString();
        }

        list.slice(0, 50).forEach(n => {
            const item = document.createElement('div');
            item.className = 'notification-item' + (n.read ? ' read' : ' unread');

            const iconClass = n.icon || (n.type === 'announcement' ? 'fas fa-bullhorn' : (n.type === 'message' ? 'fas fa-envelope' : (n.type === 'assignment' ? 'fas fa-file-alt' : 'fas fa-bell')));
            item.innerHTML = `
                <div class="notification-icon"><i class="${iconClass}"></i></div>
                <div class="notification-body">
                    <div class="notification-row">
                        <div class="notification-title">${escapeHtml(n.title || 'Notification')}</div>
                        <div class="notification-time">${n.timestamp ? timeAgo(n.timestamp) : ''}</div>
                    </div>
                    <div class="notification-content">${escapeHtml(n.content || '')}</div>
                </div>
                <div class="notification-actions">
                    ${n.read ? '<span class="notification-read-indicator"><i class="fas fa-check"></i></span>' : '<button class="mark-read-btn btn-small" aria-label="Mark as read">Mark as read</button>'}
                    <button class="delete-notif-btn btn-small btn-danger" title="Delete" aria-label="Delete notification">Delete</button>
                </div>
            `;

            // Click navigates
            item.addEventListener('click', function (e) {
                // if click on action buttons ignore navigation
                if (e.target.closest('.mark-read-btn') || e.target.closest('.delete-notif-btn')) return;
                (async () => {
                    try { if (!n.read) await firebase.firestore().collection('notifications').doc(n.id).update({ read: true }); } catch (err) { console.error(err); }
                    const modalEl = document.getElementById('notificationsModal'); if (modalEl) modalEl.style.display = 'none';
                    if (n.link && n.link.startsWith('#')) {
                        const section = n.link.replace('#', '').replace('-section', '');
                        if (typeof window.switchSection === 'function') window.switchSection(section);
                        else window.location.hash = n.link;
                    } else if (n.link) {
                        window.location.href = n.link;
                    }
                })();
            });

            // Mark as read
            const markBtn = item.querySelector('.mark-read-btn');
            if (markBtn) {
                markBtn.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    try { await firebase.firestore().collection('notifications').doc(n.id).update({ read: true }); }
                    catch (e) { console.error(e); }
                });
            }

            // Delete
            const delBtn = item.querySelector('.delete-notif-btn');
            if (delBtn) {
                delBtn.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    try { await firebase.firestore().collection('notifications').doc(n.id).delete(); }
                    catch (e) { console.error(e); }
                });
            }

            container.appendChild(item);
        });
    }

    // Attach bell behavior: show redesigned modal
    function setupBell() {
        document.body.addEventListener('click', function (e) {
            const bell = e.target.closest('.notification-bell');
            if (!bell) return;
            createModal();
            const modal = document.getElementById('notificationsModal');
            if (modal) {
                modal.style.display = 'flex';
                renderList(window._latestNotifications || []);
            }
        });
    }

    // Intercept clicks to notifications.html (user dropdown links) to remember previous dashboard/section
    document.addEventListener('click', function (e) {
        const anchor = e.target.closest('a[href$="notifications.html"]');
        if (!anchor) return;
        try {
            const activeNav = document.querySelector('.nav-item.active')?.getAttribute('data-section') || window.location.hash.replace('#', '') || 'dashboard';
            sessionStorage.setItem('prevSection', activeNav);
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            sessionStorage.setItem('prevDashboard', currentPage);
        } catch (err) { /* ignore */ }
    });

    // Real-time listener and badge update
    function startRealtimeListener() {
        firebase.auth().onAuthStateChanged(function (user) {
            if (!user) return;
            // unsubscribe previous
            if (window._notifUnsub) window._notifUnsub();
            window._notifUnsub = firebase.firestore().collection('notifications')
                .where('recipientId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .onSnapshot(snap => {
                    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    window._latestNotifications = arr;
                    const unread = arr.filter(n => !n.read).length;
                    document.querySelectorAll('.notification-badge').forEach(el => {
                        el.textContent = unread > 0 ? unread : '';
                        el.style.display = unread > 0 ? 'inline-block' : 'none';
                    });
                    const globalBadge = document.getElementById('globalNotificationBadge');
                    if (globalBadge) {
                        globalBadge.textContent = unread > 0 ? unread : '';
                        globalBadge.style.display = unread > 0 ? 'inline-block' : 'none';
                    }
                    // If modal open, refresh list
                    const modalNow = document.getElementById('notificationsModal');
                    if (modalNow && modalNow.style.display === 'flex') {
                        renderList(arr);
                    }
                });
        });
    }

    // Public API
    async function createNotification({ recipientId, userRole, type, title, content, link = '', data = {}, icon = '' }) {
        try {
            // Basic validation to prevent undefined fields from reaching Firestore
            const payload = { recipientId, userRole, type, title, content, link, data, icon };
            // If a global validator exists (server-side tests), use it
            let valid = true, errors = [];
            if (window && window.Validators && typeof window.Validators.validateNotificationPayload === 'function') {
                const res = window.Validators.validateNotificationPayload(payload);
                valid = res.valid;
                errors = res.errors;
            } else {
                // Inline minimal validation
                if (!recipientId && recipientId !== 'broadcast') {
                    valid = false;
                    errors.push('recipientId is required (use "broadcast" for global notifications)');
                }
                const nestedUndefineds = (function check(o, path = '') {
                    if (o === undefined) return [path || 'value'];
                    if (o === null) return [];
                    if (Array.isArray(o)) return o.flatMap((v, i) => check(v, `${path}[${i}]`));
                    if (typeof o === 'object') return Object.keys(o).flatMap(k => check(o[k], path ? `${path}.${k}` : k));
                    return [];
                })(data, 'data');
                if (nestedUndefineds.length) { valid = false; errors.push(...nestedUndefineds.map(p => `data.${p} is undefined`)); }
            }

            if (!valid) {
                const errorMsg = 'Notification creation failed: ' + errors.join('; ');
                console.error(errorMsg);
                alert(errorMsg);
                throw new Error(errorMsg);
            }

            const cleaned = {
                recipientId,
                userRole: userRole || null,
                type: type || 'generic',
                title: title || '',
                content: content || '',
                link: link || '',
                data: data || {},
                read: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                icon: icon || ''
            };

            await firebase.firestore().collection('notifications').add(cleaned);
            return true;
        } catch (err) {
            console.error('createNotification error', err);
            return false;
        }
    }

    window.Notifications = { createNotification };

    // Page renderer API: render notifications page with pagination, filters, sort
    // options: { containerId, loadMoreBtnId, pageSize }
    window.renderNotificationsPage = function (options = {}) {
        const container = document.getElementById(options.containerId || 'notificationsContainer');
        const loadMoreBtn = document.getElementById(options.loadMoreBtnId || 'loadMoreBtn');
        const pageSize = options.pageSize || 20;
        let lastDoc = null;
        let finished = false;
        let currentFilter = 'all';
        let currentSort = 'desc';

        const filterEl = document.getElementById('notifFilter');
        const sortEl = document.getElementById('notifSort');
        const markAllBtn = document.getElementById('markAllReadPageBtn');
        const deleteReadBtn = document.getElementById('deleteReadPageBtn');

        function clearContainer() { if (container) container.innerHTML = ''; }

        async function loadPage(reset = false) {
            if (!container) return;
            if (reset) { lastDoc = null; finished = false; clearContainer(); }
            if (finished) return;
            let q = firebase.firestore().collection('notifications');
            if (currentFilter === 'unread') q = q.where('read', '==', false);
            if (currentFilter === 'read') q = q.where('read', '==', true);
            q = q.orderBy('timestamp', currentSort === 'desc' ? 'desc' : 'asc');
            if (lastDoc) q = q.startAfter(lastDoc);
            q = q.limit(pageSize);
            const snap = await q.get();
            if (snap.empty) { finished = true; loadMoreBtn && (loadMoreBtn.style.display = 'none'); return; }
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            docs.forEach(d => {
                const el = renderNotificationCard(d);
                container.appendChild(el);
            });
            lastDoc = snap.docs[snap.docs.length - 1];
            if (snap.size < pageSize) { finished = true; loadMoreBtn && (loadMoreBtn.style.display = 'none'); }
            else loadMoreBtn && (loadMoreBtn.style.display = 'inline-block');
        }

        function renderNotificationCard(n) {
            const card = document.createElement('div');
            card.className = 'notif-card';
            card.setAttribute('data-id', n.id || '');
            const icon = n.icon || 'fas fa-bell';
            card.innerHTML = `
                <div style="width:56px;display:flex;flex-direction:column;align-items:center;gap:6px;">
                    <input type="checkbox" class="notif-select-checkbox" data-id="${n.id || ''}" aria-label="Select notification">
                    <i class="${icon}" style="font-size:18px;color:var(--primary);"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;gap:12px;">
                        <div style="font-weight:${n.read ? 400 : 600};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(n.title || '')}</div>
                        <div style="color:var(--gray);font-size:0.9rem;white-space:nowrap;">${n.timestamp && n.timestamp.seconds ? timeAgo(n.timestamp.seconds * 1000) : ''}</div>
                    </div>
                    <div style="margin-top:6px;color:var(--dark);word-wrap:break-word;">${escapeHtml(n.content || '')}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
                    <button class="btn-small mark-read-page-btn">${n.read ? 'Mark unread' : 'Mark read'}</button>
                    <button class="btn-small btn-danger delete-page-btn">Delete</button>
                </div>
            `;

            // actions
            card.querySelector('.mark-read-page-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await firebase.firestore().collection('notifications').doc(n.id).update({ read: !!n.read ? false : true });
                    card.remove();
                } catch (err) { console.error(err); }
            });
            card.querySelector('.delete-page-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                try { await firebase.firestore().collection('notifications').doc(n.id).delete(); card.remove(); }
                catch (err) { console.error(err); }
            });

            card.addEventListener('click', () => {
                if (n.link && n.link.startsWith('#')) {
                    const section = n.link.replace('#', '').replace('-section', '');
                    if (typeof window.switchSection === 'function') window.switchSection(section);
                    else window.location.hash = n.link;
                } else if (n.link) window.location.href = n.link;
            });

            return card;
        }

        function timeAgo(ts) {
            const diff = Date.now() - ts; const sec = Math.floor(diff / 1000);
            if (sec < 60) return sec + 's ago';
            const m = Math.floor(sec / 60); if (m < 60) return m + 'm ago';
            const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
            const d = Math.floor(h / 24); return d + 'd ago';
        }

        // events
        if (filterEl) filterEl.addEventListener('change', () => { currentFilter = filterEl.value; loadPage(true); });
        if (sortEl) sortEl.addEventListener('change', () => { currentSort = sortEl.value; loadPage(true); });
        if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => loadPage(false));
        if (markAllBtn) markAllBtn.addEventListener('click', async () => {
            try {
                const snap = await firebase.firestore().collection('notifications').where('read', '==', false).get();
                const batch = firebase.firestore().batch(); snap.forEach(d => batch.update(d.ref, { read: true })); if (!snap.empty) await batch.commit();
                loadPage(true);
            } catch (e) { console.error(e); }
        });
        if (deleteReadBtn) deleteReadBtn.addEventListener('click', async () => {
            try {
                const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
                const snap = await firebase.firestore().collection('notifications').where('read', '==', true).where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(cutoff)).get();
                const batch = firebase.firestore().batch(); snap.forEach(d => batch.delete(d.ref)); if (!snap.empty) await batch.commit(); loadPage(true);
            } catch (e) { console.error(e); }
        });

        // initial load
        loadPage(true);
    };

    // attach small public helpers
    window.Notifications = Object.assign(window.Notifications || {}, { createNotification, renderList, setupBell });
    // Init
    document.addEventListener('DOMContentLoaded', function () {
        setupBell();
        startRealtimeListener();
    });

})();
