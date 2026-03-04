document.addEventListener('DOMContentLoaded', function () {
    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            const prevSection = sessionStorage.getItem('prevSection');
            const prevDashboard = sessionStorage.getItem('prevDashboard');
            // If we have a direct previous dashboard page, navigate to it and restore section if available
            if (prevDashboard) {
                const url = prevDashboard + (prevSection ? ('#' + prevSection) : '');
                window.location.href = url;
                return;
            }
            // fallback: if referrer looks like a dashboard, go back
            if (document.referrer && document.referrer.includes('dashboard')) {
                history.back();
                return;
            }
            // Default: go to index
            window.location.href = 'index.html' + (prevSection ? ('#' + prevSection) : '');
        });
    }

    // Initialize the page renderer from js/notifications.js
    if (typeof window.renderNotificationsPage === 'function') {
        window.renderNotificationsPage({ containerId: 'notificationsContainer', loadMoreBtnId: 'loadMoreBtn' });
    }

    // Bulk selection handlers
    const selectAll = document.getElementById('selectAllNotifs');
    const markSelectedBtn = document.getElementById('markSelectedBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const container = document.getElementById('notificationsContainer');

    function getSelectedIds() {
        const checks = container ? container.querySelectorAll('.notif-select-checkbox:checked') : [];
        return Array.from(checks).map(c => c.getAttribute('data-id')).filter(Boolean);
    }

    if (selectAll) {
        selectAll.addEventListener('change', function () {
            const allChecks = container ? container.querySelectorAll('.notif-select-checkbox') : [];
            allChecks.forEach(ch => ch.checked = !!selectAll.checked);
        });
    }

    if (markSelectedBtn) {
        markSelectedBtn.addEventListener('click', async function () {
            const ids = getSelectedIds();
            if (!ids.length) return alert('No notifications selected');
            try {
                const batch = firebase.firestore().batch();
                ids.forEach(id => {
                    const ref = firebase.firestore().collection('notifications').doc(id);
                    batch.update(ref, { read: true });
                });
                await batch.commit();
                // reload page list if available
                if (typeof window.renderNotificationsPage === 'function') {
                    window.renderNotificationsPage({ containerId: 'notificationsContainer', loadMoreBtnId: 'loadMoreBtn' });
                } else location.reload();
            } catch (e) { console.error(e); alert('Failed to mark selected'); }
        });
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', async function () {
            const ids = getSelectedIds();
            if (!ids.length) return alert('No notifications selected');
            if (!confirm('Delete selected notifications?')) return;
            try {
                const batch = firebase.firestore().batch();
                ids.forEach(id => {
                    const ref = firebase.firestore().collection('notifications').doc(id);
                    batch.delete(ref);
                });
                await batch.commit();
                if (typeof window.renderNotificationsPage === 'function') {
                    window.renderNotificationsPage({ containerId: 'notificationsContainer', loadMoreBtnId: 'loadMoreBtn' });
                } else location.reload();
            } catch (e) { console.error(e); alert('Failed to delete selected'); }
        });
    }

    // When notifications list updates (real-time), ensure selectAll state resets
    const observer = new MutationObserver(() => { if (selectAll) selectAll.checked = false; });
    if (container) observer.observe(container, { childList: true, subtree: true });
});
