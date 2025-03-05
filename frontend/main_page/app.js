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

// Call this when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuth();
    if (!user) return; // Stop execution if not authenticated

    // Get sidebar button elements
    const homeBtn = document.getElementById('home-btn');
    const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
    const registerBtn = document.getElementById('register-btn');
    const allTraineesBtn = document.getElementById('all-trainees-btn');

    homeBtn.addEventListener('click', () => {
        window.location.href = '/main_page';
    });

    scanBarcodeBtn.addEventListener('click', () => {
        window.location.href = '/scan_qr';
    });

    registerBtn.addEventListener('click', () => {
        window.location.href = '/enter_member';
        console.log('Register button clicked');
    });

    allTraineesBtn.addEventListener('click', () => {
        window.location.href = '/all_members';  
        console.log('All trainees button clicked');
    });

});