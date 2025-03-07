document.addEventListener('DOMContentLoaded', () => {
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
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', filterMembers);

    let allMembers = []; // Store all members for filtering

    // Function to load members from API
    async function loadMembers() {
        try {
            const response = await fetch('/api/v1/members/');
            if (!response.ok) {
                throw new Error('Failed to fetch members');
            }
            allMembers = await response.json();
            displayMembers(allMembers);
        } catch (error) {
            console.error('Error loading members:', error);
            alert('שגיאה בטעינת המתאמנים. אנא נסה שנית.');
        }
    }

    // Function to display members - COMPLETELY REWRITTEN
    function displayMembers(members) {
        const tableBody = document.querySelector('#members-table-body');
        tableBody.innerHTML = '';
        
        members.forEach(member => {
            const today = new Date();
            
            // Get subscription status based on new logic
            const subscriptionStatus = getSubscriptionStatus(member);
            
            // Get payment status based on new logic
            const paymentStatus = getPaymentStatus(member);
            
            // Display appropriate data based on account status
            const membershipType = member.accountStatus === 'frozen' ? '-' : member.membershipType;
            const weeklyTraining = member.accountStatus === 'frozen' ? '-' : member.weeklyTraining;
            const paymentMethod = member.accountStatus === 'frozen' ? '-' : member.paymentMethod;
            const subscriptionValid = member.accountStatus === 'frozen' ? '-' : formatDate(member.subscriptionvalid);
            const lastVisit = member.accountStatus === 'frozen' ? '-' : formatDate(member.lastVisit);
            
            const row = document.createElement('tr');
            
            // Create each cell individually to avoid HTML injection issues
            const nameCell = document.createElement('td');
            nameCell.textContent = member.fullName;
            
            const phoneCell = document.createElement('td');
            phoneCell.textContent = member.phone;
            
            const emailCell = document.createElement('td');
            emailCell.textContent = member.email;
            
            const typeCell = document.createElement('td');
            typeCell.textContent = membershipType;
            
            const weeklyCell = document.createElement('td');
            weeklyCell.textContent = weeklyTraining;
            
            const methodCell = document.createElement('td');
            methodCell.textContent = paymentMethod;
            
            const validCell = document.createElement('td');
            validCell.textContent = subscriptionValid;
            
            const visitCell = document.createElement('td');
            visitCell.textContent = lastVisit;
            
            // Payment status cell
            const paymentCell = document.createElement('td');
            const paymentSpan = document.createElement('span');
            paymentSpan.className = paymentStatus.class;
            paymentSpan.textContent = paymentStatus.text;
            paymentCell.appendChild(paymentSpan);
            
            // Subscription status cell
            const statusCell = document.createElement('td');
            const statusSpan = document.createElement('span');
            statusSpan.className = subscriptionStatus.class;
            statusSpan.textContent = subscriptionStatus.text;
            statusCell.appendChild(statusSpan);
            
            // Action cell with only one button
            const actionCell = document.createElement('td');
            actionCell.className = 'action-buttons';
            
            const viewButton = document.createElement('button');
            viewButton.className = 'blue-btn';
            viewButton.textContent = 'צפה בפרופיל';
            viewButton.onclick = function() {
                viewMemberProfile(member._id);
            };
            
            actionCell.appendChild(viewButton);
            
            // Add all cells to the row
            row.appendChild(nameCell);
            row.appendChild(phoneCell);
            row.appendChild(emailCell);
            row.appendChild(typeCell);
            row.appendChild(weeklyCell);
            row.appendChild(methodCell);
            row.appendChild(validCell);
            row.appendChild(visitCell);
            row.appendChild(paymentCell);
            row.appendChild(statusCell);
            row.appendChild(actionCell);
            
            // Add the row to the table
            tableBody.appendChild(row);
        });
    }

    // Updated function to check subscription status
    function getSubscriptionStatus(member) {
        // Check if account is frozen
        if (member.accountStatus === 'frozen') {
            return {
                text: 'מנוי מוקפא',
                class: 'status-frozen'
            };
        }
        
        // Check if account is deactivated
        if (member.accountStatus === 'inactive') {
            return {
                text: 'מנוי לא בתוקף',
                class: 'status-expired'
            };
        }
        
        // Otherwise, the membership is active
        return {
            text: 'מנוי בתוקף',
            class: 'status-valid'
        };
    }

    // New function to check payment status
    function getPaymentStatus(member) {
        const today = new Date();
        
        // For credit card payments, always paid
        if (member.paymentMethod === 'אשראי') {
            return {
                text: 'מנוי שולם',
                class: 'status-paid'
            };
        }
        
        // For cash payments, check if subscription date has passed
        if (member.subscriptionvalid) {
            const subscriptionDate = new Date(member.subscriptionvalid);
            
            // If subscription date is in the future or today, it's paid
            if (subscriptionDate >= today) {
                return {
                    text: 'מנוי שולם',
                    class: 'status-paid'
                };
            } else {
                // If subscription date has passed, it's not paid
                return {
                    text: 'מנוי לא שולם',
                    class: 'status-due'
                };
            }
        }
        
        // Default case
        return {
            text: 'מנוי לא שולם',
            class: 'status-due'
        };
    }

    // Function to filter members
    function filterMembers() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredMembers = allMembers.filter(member => 
            member.fullName.toLowerCase().includes(searchTerm) ||
            member.phone.includes(searchTerm) ||
            member.email.toLowerCase().includes(searchTerm)
        );
        displayMembers(filteredMembers);
    }

    // Helper function to format dates
    function formatDate(dateString) {
        if (!dateString) return 'לא זמין';
        
        // For the special "forever" date used for credit card payments
        if (dateString.includes('9999-12-12')) {
            return 'ללא הגבלה';  // "Unlimited" in Hebrew
        }
        
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return 'לא זמין';
        
        // Format date as DD/MM/YYYY
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }

    // Keep only the viewMemberProfile function
    window.viewMemberProfile = function(_id) {
        window.location.href = `/member_profile?id=${_id}`;
    };

    // IMPORTANT: Remove any other global functions that might be defined elsewhere
    window.editMember = undefined;
    window.deleteMember = undefined;
    window.freezeMember = undefined;

    // Initial load
    loadMembers();
});
