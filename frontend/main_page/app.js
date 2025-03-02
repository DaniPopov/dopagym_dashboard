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