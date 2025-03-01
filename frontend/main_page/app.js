// Get sidebar button elements
const homeBtn = document.getElementById('home-btn');
const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
const registerBtn = document.getElementById('register-btn');
const allTraineesBtn = document.getElementById('all-trainees-btn');

homeBtn.addEventListener('click', () => {
    window.location.href = '/main_page/index.html';  // Replace with your actual home page URL
});

scanBarcodeBtn.addEventListener('click', () => {
    window.location.href = '/scan_qr/index.html';  // Replace with your actual code review page URL
});

registerBtn.addEventListener('click', () => {
    window.location.href = '/enter_member/index.html';  // Remove 'frontend' from path
    console.log('Register button clicked');
});

allTraineesBtn.addEventListener('click', () => {
    window.location.href = '/all_members/index.html';  // Replace with your actual trainees page URL
    console.log('All trainees button clicked');
});