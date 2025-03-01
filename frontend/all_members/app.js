document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Navigation
    const homeBtn = document.getElementById('home-btn');
    const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
    const registerBtn = document.getElementById('register-btn');
    const allTraineesBtn = document.getElementById('all-trainees-btn');

    // Navigation event listeners
    homeBtn.addEventListener('click', () => {
        window.location.href = '/frontend/main_page/index.html';
    });

    scanBarcodeBtn.addEventListener('click', () => {
        window.location.href = '/frontend/scan_qr/index.html';
    });

    registerBtn.addEventListener('click', () => {
        window.location.href = '/frontend/enter_member/index.html';
    });

    allTraineesBtn.addEventListener('click', () => {
        window.location.href = '/frontend/all_members/index.html';
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', filterMembers);

    let allMembers = []; // Store all members for filtering

    // Function to load members from API
    async function loadMembers() {
        try {
            const response = await fetch('http://3.76.224.214/api/members');
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

    // Function to display members
    function displayMembers(members) {
        const tableBody = document.getElementById('members-table-body');
        tableBody.innerHTML = '';

        members.forEach(member => {
            const row = document.createElement('tr');
            
            // Calculate if payment is due (30 days from last renewal)
            const lastRenewalDate = new Date(member.lastRenewal);
            const isPaymentDue = lastRenewalDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            row.innerHTML = `
                <td>${member.fullName}</td>
                <td>${member.phone}</td>
                <td>${member.email}</td>
                <td>${member.membershipType}</td>
                <td>${member.weeklyTraining}</td>
                <td>${member.paymentMethod}</td>
                <td>${formatDate(member.lastRenewal)}</td>
                <td>${formatDate(member.lastVisit)}</td>
                <td>
                    <span class="payment-status ${isPaymentDue ? 'status-due' : 'status-paid'}">
                        ${isPaymentDue ? 'לחדש מנוי' : 'מנוי בתוקף'}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="edit-btn" onclick="editMember('${member._id}')">ערוך</button>
                    <button class="delete-btn" onclick="deleteMember('${member._id}')">מחק</button>
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
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return new Date(dateString).toLocaleDateString('he-IL', options);
    }

    // Delete member function
    window.deleteMember = async function(memberId) {
        if (confirm('האם אתה בטוח שברצונך למחוק מתאמן זה?')) {
            try {
                const response = await fetch(`http://3.76.224.214/api/members/${memberId}`, {
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
        window.location.href = `/frontend/enter_member/index.html?edit=true&id=${memberId}`;
    };

    // Initial load
    loadMembers();
});
