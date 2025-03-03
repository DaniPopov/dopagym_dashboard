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
        console.log('Register button clicked');
    });
    
    allTraineesBtn.addEventListener('click', () => {
        window.location.href = '/all_members';  
        console.log('All trainees button clicked');
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', filterMembers);

    let allMembers = []; // Store all members for filtering

    // Function to load members from API
    async function loadMembers() {
        try {
            const response = await fetch('/api/members');
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

    // Add this function to check subscription status
    function getSubscriptionStatus(member) {
        // Check if account is frozen
        if (member.accountStatus === 'frozen') {
            return {
                text: 'מנוי מוקפא',
                class: 'status-frozen'
            };
        }
        
        const today = new Date();
        console.log("Today's date:", today.toISOString());
        
        // For credit card payments, always valid
        if (member.paymentMethod === 'אשראי') {
            return {
                text: 'מנוי בתוקף',
                class: 'status-unlimited'
            };
        }
        
        // For cash payments, check if subscription date has passed
        if (member.subscriptionvalid) {
            const subscriptionDate = new Date(member.subscriptionvalid);
            if (subscriptionDate > today) {
                return {
                    text: 'מנוי בתוקף',
                    class: 'status-valid'
                };
            } else {
                return {
                    text: 'מנוי פג תוקף',
                    class: 'status-expired'
                };
            }
        }
        
        return {
            text: 'לא ידוע',
            class: ''
        };
    }

    // Function to display members
    function displayMembers(members) {
        const tableBody = document.querySelector('#members-table-body');
        tableBody.innerHTML = '';
        
        members.forEach(member => {
            const today = new Date();
            console.log("this is the date now: ", today.getTime());
            
            const subscriptionStatus = getSubscriptionStatus(member);
            
            // Convert payment status to Hebrew
            const paymentStatusHebrew = member.paymentStatus === 'paid' ? 'מנוי שולם' : 'מנוי לא שולם';
            const paymentStatusClass = member.paymentStatus === 'paid' ? 'status-paid' : 'status-due';
            
            // Display appropriate data based on account status
            const membershipType = member.accountStatus === 'frozen' ? '-' : member.membershipType;
            const weeklyTraining = member.accountStatus === 'frozen' ? '-' : member.weeklyTraining;
            const paymentMethod = member.accountStatus === 'frozen' ? '-' : member.paymentMethod;
            const subscriptionValid = member.accountStatus === 'frozen' ? '-' : formatDate(member.subscriptionvalid);
            const lastVisit = member.accountStatus === 'frozen' ? '-' : formatDate(member.lastVisit);
            const paymentStatus = member.accountStatus === 'frozen' ? '-' : `<span class="${paymentStatusClass}">${paymentStatusHebrew}</span>`;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${member.fullName}</td>
                <td>${member.phone}</td>
                <td>${member.email}</td>
                <td>${membershipType}</td>
                <td>${weeklyTraining}</td>
                <td>${paymentMethod}</td>
                <td>${subscriptionValid}</td>
                <td>${lastVisit}</td>
                <td>${paymentStatus}</td>
                <td><span class="${subscriptionStatus.class}">${subscriptionStatus.text}</span></td>
                <td class="action-buttons">
                    <button class="edit-btn" onclick="editMember('${member._id}')">ערוך</button>
                    <button class="delete-btn" onclick="deleteMember('${member._id}')">מחק</button>
                    <button class="freeze-btn" onclick="freezeMember('${member._id}', '${member.accountStatus === 'frozen' ? 'active' : 'frozen'}')">
                        ${member.accountStatus === 'frozen' ? 'הפשר מנוי' : 'הקפא מנוי'}
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
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

    // Delete member function
    window.deleteMember = async function(memberId) {
        if (confirm('האם אתה בטוח שברצונך למחוק מתאמן זה?')) {
            try {
                const response = await fetch(`/api/members/${memberId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('המתאמן נמחק בהצלחה');
                    loadMembers(); // Reload the list
                } else {
                    const error = await response.json();
                    alert(`שגיאה במחיקת המתאמן: ${error.detail}`);
                }
            } catch (error) {
                console.error('Error deleting member:', error);
                alert('שגיאה במחיקת המתאמן');
            }
        }
    };

    // Edit member function
    window.editMember = function(memberId) {
        // Store the member ID in session storage and redirect to edit page
        sessionStorage.setItem('editMemberId', memberId);
        window.location.href = `/enter_member/index.html?edit=true&id=${memberId}`;
    };

    // Add freeze member function
    window.freezeMember = async function(memberId, newStatus) {
        if (confirm(newStatus === 'frozen' ? 'האם אתה בטוח שברצונך להקפיא את המנוי?' : 'האם אתה בטוח שברצונך להפשיר את המנוי?')) {
            try {
                // Get the member's phone number first
                const response = await fetch(`/api/members/${memberId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch member data');
                }
                
                const member = await response.json();
                const phoneNumber = member.phone;
                
                // Update the member's account status
                const updateResponse = await fetch(`/api/members/${phoneNumber}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        accountStatus: newStatus
                    }),
                });

                if (updateResponse.ok) {
                    alert(newStatus === 'frozen' ? 'המנוי הוקפא בהצלחה' : 'המנוי הופשר בהצלחה');
                    loadMembers(); // Reload the members list
                } else {
                    const error = await updateResponse.json();
                    alert(`שגיאה: ${error.detail || 'אירעה שגיאה בעת עדכון המנוי'}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('אירעה שגיאה בעת עדכון המנוי');
            }
        }
    };

    // Initial load
    loadMembers();
});
