// This is the login page - no need to check for auth or redirect to login

document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    
    // Check if user is already logged in
    checkAuthStatus();

    // Get the login form
    const loginForm = document.getElementById('loginForm');
    
    // Add submit event listener
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Login form submitted');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        
        try {
            // Create FormData object
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            
            // Send login request
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                body: formData,
                credentials: 'include'  // Important: This tells fetch to send and receive cookies
            });
            
            if (response.ok) {
                console.log('Login successful');
                // Redirect to main page
                window.location.href = '/main_page';
            } else {
                const error = await response.json();
                errorMessage.textContent = error.detail || 'שם משתמש או סיסמה שגויים';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'שגיאה בהתחברות';
            errorMessage.style.display = 'block';
        }
    });
    
    // Function to check if user is already authenticated
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/v1/auth/me', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                // User is already logged in, redirect to main page
                window.location.href = '/main_page';
            }
        } catch (error) {
            console.log('Not authenticated, staying on login page');
        }
    }
});

// Remove the duplicate auth interceptor setup code at the bottom
// It's causing conflicts with the login process