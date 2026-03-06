// announcements-view.js
// Minimal, shared announcements viewer for agent & student dashboards
// Requires compat SDKs: firebase-app-compat, firebase-auth-compat, firebase-firestore-compat
(function () {
    // Render helper
    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderList(el, items) {
        if (!el) return;
        console.log('[Announcements] received', items.length);
        if (!items || items.length === 0) {
            el.innerHTML = '<div style="color:var(--gray);padding:12px;">No announcements.</div>';
            return;
        }
        el.innerHTML = items
            .map(a => {
                const date = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : '';
                return `<div class="announcement-item" style="padding:12px;border-bottom:1px solid #f0f0f0;">
            <div style="font-weight:600">${escapeHtml(a.title || '')}</div>
            <div style="color:var(--gray);margin-top:6px">${escapeHtml(a.content || '')}</div>
            <div style="font-size:0.85em;color:#888;margin-top:6px">${date}</div>
          </div>`;
            })
            .join('');
    }

    // Main listener: looks for #announcements-list on the page
    firebase && firebase.auth && firebase.auth().onAuthStateChanged && firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;
        const listEl = document.getElementById('announcements-list');
        if (!listEl) return; // nothing to render into

        // Determine role from users/{uid}.role; fallback if not present
        let role = 'students';
        try {
            const udoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (udoc.exists && udoc.data().role) role = udoc.data().role;
        } catch (e) {
            console.warn('Could not read user role, defaulting to students', e);
        }
        // Normalize role to the plural form used in announcements ('student' -> 'students')
        function normalizeRoleKey(r) {
            if (!r) return r;
            const s = r.toString().toLowerCase();
            if (s === 'student') return 'students';
            if (s === 'agent') return 'agents';
            return s;
        }
        const roleKey = normalizeRoleKey(role);
        console.log('[Announcements] user role:', role, 'normalized:', roleKey);

        const col = firebase.firestore().collection('announcements');

        // Try server-side 'in' query first; fall back to client-side filter if index error
        try {
            const q = col.where('isActive', '==', true).where('targetAudience', 'in', [roleKey, 'all']).orderBy('createdAt', 'desc');
            q.onSnapshot(snap => {
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderList(listEl, items);
            }, err => {
                console.warn('Announcements onSnapshot error (indexed query):', err);
                fallbackListener();
            });
        } catch (err) {
            console.warn('Announcements query failed, falling back to client-side filter', err);
            fallbackListener();
        }

        function fallbackListener() {
            col.where('isActive', '==', true).orderBy('createdAt', 'desc').onSnapshot(snap => {
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const filtered = docs.filter(a => {
                    const ta = (a.targetAudience || 'all').toString().toLowerCase();
                    // match 'all', exact normalized role, or allow singular/plural variants
                    if (ta === 'all') return true;
                    if (ta === roleKey) return true;
                    if (ta === role) return true; // in case stored as singular
                    if (ta === 'individual' && Array.isArray(a.targetIds) && a.targetIds.includes(user.uid)) return true;
                    return false;
                });
                renderList(listEl, filtered);
            }, e => console.error('Announcements fallback listener failed', e));
        }
    });
})();
