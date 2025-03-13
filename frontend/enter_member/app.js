document.addEventListener('DOMContentLoaded', () => {
    // Get sidebar button elements
    const homeBtn = document.getElementById('home-btn');
    const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
    const registerBtn = document.getElementById('register-btn');
    const allTraineesBtn = document.getElementById('all-trainees-btn');

    // Sidebar navigation
    homeBtn.addEventListener('click', () => {
        window.location.href = '/main_page';
    });

    scanBarcodeBtn.addEventListener('click', () => {
        window.location.href = '/scan_qr';
    });

    registerBtn.addEventListener('click', () => {
        window.location.href = '/enter_member';
    });

    allTraineesBtn.addEventListener('click', () => {
        window.location.href = '/all_members';
        console.log('All trainees button clicked');
    });

    // Registration form handling
    const registrationForm = document.getElementById('registration-form');
    const cancelBtn = document.getElementById('cancel-btn');

    // Add event listener to payment method dropdown to control subscription validity
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const subscriptionValidField = document.getElementById('subscriptionvalid');

    // Initially disable the subscription valid field
    subscriptionValidField.disabled = true;

    paymentMethodSelect.addEventListener('change', function() {
        if (this.value === 'מזומן') {
            // For cash payment, enable the field for manual date entry
            subscriptionValidField.disabled = false;
            subscriptionValidField.value = '';
        } else if (this.value === 'אשראי') {
            // For credit card payment, set a constant far future date and disable the field
            subscriptionValidField.disabled = true;
            subscriptionValidField.value = '9999-12-12';
        } else {
            // If no payment method is selected, disable the field
            subscriptionValidField.disabled = true;
            subscriptionValidField.value = '';
        }
    });

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Check if the user is working out today
        const workoutToday = document.getElementById('workoutToday').value;
        
        // Set lastVisit and allVisits based on workout today selection
        let lastVisit = null;
        let allVisits = [];
        
        if (workoutToday === 'yes') {
            lastVisit = new Date().toISOString();
            allVisits = [lastVisit];
        } else {
            // If not working out today, both lastVisit and allVisits should remain empty
            lastVisit = null;
            allVisits = [];
        }
        
        const formData = {
            fullName: document.getElementById('fullName').value,
            idNumber: document.getElementById('idNumber').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            birthDate: document.getElementById('birthDate').value,
            membershipType: document.getElementById('membershipType').value,
            weeklyTraining: document.getElementById('weeklyTraining').value,
            paymentMethod: document.getElementById('paymentMethod').value,
            subscriptionvalid: document.getElementById('subscriptionvalid').value,
            lastVisit: lastVisit,
            allVisits: allVisits,
            paymentStatus: "paid",
            membershipStatus: "active"
        };

        try {
            const response = await fetch('/api/v1/members/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                alert('מתאמן נרשם בהצלחה!');
                // Proper form reset
                registrationForm.reset();
                // Reset additional fields and states
                subscriptionValidField.disabled = true;
                subscriptionValidField.value = '';
                // Reset any select elements to their first option
                document.getElementById('membershipType').selectedIndex = 0;
                document.getElementById('weeklyTraining').selectedIndex = 0;
                document.getElementById('paymentMethod').selectedIndex = 0;
                document.getElementById('workoutToday').selectedIndex = 0;
            } else {
                const error = await response.json();
                console.error('Server error:', error);
                alert(`שגיאה: ${error.detail || 'אירעה שגיאה בעת רישום המתאמן'}`);
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('אירעה שגיאה בעת רישום המתאמן');
        }
    });

    cancelBtn.addEventListener('click', () => {
        window.location.href = '/main_page';
    });
});