// js/auth.js
// Runs immediately on every page load.
// Compares stored server session ID with current server session ID.
// If they differ (server restarted), clears all localStorage and redirects to index.html.

(async function enforceSessionCheck() {
    // Skip this check on login page to avoid a redirect loop during authentication
    const path = window.location.pathname;
    if (path.endsWith('login.html')) {
        return;
    }

    try {
        const res = await fetch('http://localhost:3000/api/sys/session');
        if (!res.ok) return; // Server error — don't force logout
        const data = await res.json();

        const stored = localStorage.getItem('server_session_id');

        if (!stored) {
            // First time visiting — just store the session ID
            localStorage.setItem('server_session_id', data.sessionId);
        } else if (stored !== data.sessionId) {
            // Server was restarted — force full logout
            localStorage.clear();
            window.location.replace('index.html');
        }
    } catch (e) {
        // Network error — don't force logout, it would lock users out when server is down
        console.warn('Session check failed:', e.message);
    }
})();
