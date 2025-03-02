// Add this at the start of each page's JavaScript
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    // Add token to all fetch requests
    const originalFetch = window.fetch;
    window.fetch = function() {
        let [resource, config] = arguments;
        if(config === undefined) {
            config = {};
        }
        if(config.headers === undefined) {
            config.headers = {};
        }
        config.headers['Authorization'] = `Bearer ${token}`;
        return originalFetch(resource, config);
    };
}

// Call this when page loads
checkAuth();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        // Create FormData object
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch('/api/login', {
            method: 'POST',
            body: formData  // Send as form data, not JSON
        });
        
        if (response.ok) {
            const data = await response.json();
            // Store token in localStorage
            localStorage.setItem('token', data.access_token);
            // Add token to all future requests
            window.localStorage.setItem('token', data.access_token);
            // Redirect to main page
            window.location.href = '/main_page';
        } else {
            const error = await response.json();
            errorMessage.textContent = error.detail || 'שם משתמש או סיסמה שגויים';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'שגיאה בהתחברות';
        errorMessage.style.display = 'block';
        console.error('Login error:', error);
    }
});