// Common authentication functions
async function checkAuth() {
    try {
        const response = await fetch('/api/v1/auth/me', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = '/login';
            return null;
        }
        
        // Get user data
        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login';
        return null;
    }
}

// Check authentication when the script loads
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
});