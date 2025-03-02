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

document.addEventListener('DOMContentLoaded', function () {
    // Sidebar Navigation
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
    });

    allTraineesBtn.addEventListener('click', () => {
        window.location.href = '/all_members';
    });

    // QR Scanner Configuration
    const html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true
        }
    );

    function onScanSuccess(decodedText) {
        // Stop scanning
        html5QrcodeScanner.clear();

        console.log("Scanned phone number:", decodedText);

        // Send to backend
        fetch('/api/scan-qr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone_number: decodedText })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = `
                <div class="scan-result ${data.payment_status}">
                    <h2>שלום ${data.member_name}</h2>
                    <p>מספר טלפון: ${data.phone}</p>
                    <p>סטטוס תשלום: ${data.payment_status === 'valid' ? 'בתוקף ✅' : 'פג תוקף ❌'}</p>
                    <p>ביקור אחרון: ${new Date(data.last_visit).toLocaleDateString('he-IL')}</p>
                    <button class="scan-again-btn" onclick="location.reload()">סריקה חדשה</button>
                </div>
            `;
        })
        .catch(err => {
            console.error('Error:', err);
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = `
                <div class="scan-result error">
                    <h2>שגיאה בסריקה</h2>
                    <p>לא נמצא מתאמן עם מספר טלפון זה</p>
                    <button class="scan-again-btn" onclick="location.reload()">נסה שוב</button>
                </div>
            `;
        });
    }

    function onScanError(error) {
        console.warn(`QR error: ${error}`);
    }

    // Render the scanner
    html5QrcodeScanner.render(onScanSuccess, onScanError);
}); 