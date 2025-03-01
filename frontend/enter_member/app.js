document.addEventListener('DOMContentLoaded', () => {
    // Get sidebar button elements
    const homeBtn = document.getElementById('home-btn');
    const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
    const registerBtn = document.getElementById('register-btn');
    const allTraineesBtn = document.getElementById('all-trainees-btn');

    // Sidebar navigation
    homeBtn.addEventListener('click', () => {
        window.location.href = '/main_page/index.html';
    });

    scanBarcodeBtn.addEventListener('click', () => {
        window.location.href = '/scan_qr/index.html';
    });

    registerBtn.addEventListener('click', () => {
        window.location.href = '/enter_member/index.html';
    });

    allTraineesBtn.addEventListener('click', () => {
        window.location.href = '/all_members/index.html';
        console.log('All trainees button clicked');
    });

    // Registration form handling
    const registrationForm = document.getElementById('registration-form');
    const cancelBtn = document.getElementById('cancel-btn');

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            fullName: document.getElementById('fullName').value,
            idNumber: document.getElementById('idNumber').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            membershipType: document.getElementById('membershipType').value,
            weeklyTraining: document.getElementById('weeklyTraining').value,
            paymentMethod: document.getElementById('paymentMethod').value,
            lastRenewal: new Date().toISOString(),
            lastVisit: new Date().toISOString(),
            paymentStatus: "paid"
        };

        console.log('Sending form data:', formData);

        try {
            const response = await fetch('https://3.76.224.214/api/members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('המתאמן נרשם בהצלחה!');
                window.location.href = '/all_members/index.html';
            } else {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                alert(`שגיאה ברישום המתאמן: ${errorData.detail || 'אנא נסה שנית'}`);
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('שגיאה בהתחברות לשרת. אנא נסה שנית.');
        }
    });

    cancelBtn.addEventListener('click', () => {
        window.location.href = '/main_page/index.html';
    });
});