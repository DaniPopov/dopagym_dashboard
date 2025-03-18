document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Navigation
    const homeBtn = document.getElementById('home-btn');
    const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
    const registerBtn = document.getElementById('register-btn');
    const allTraineesBtn = document.getElementById('all-trainees-btn');
    const batYamBtn = document.getElementById('bat-yam-btn');
    
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

    batYamBtn.addEventListener('click', () => {
        window.location.href = '/bat_yam';
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', filterMembers);

    // Modal elements
    const memberModal = document.getElementById('member-modal');
    const closeModalBtn = document.querySelector('.close');
    const memberForm = document.getElementById('member-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const modalTitle = document.getElementById('modal-title');

    let allMembers = []; // Store all members for filtering

    // Add member button click handler
    const addMemberBtn = document.getElementById('add-member-btn');
    addMemberBtn.addEventListener('click', () => {
        openAddMemberModal();
    });

    // Close modal when clicking the X
    closeModalBtn.addEventListener('click', () => {
        memberModal.style.display = 'none';
    });

    // Close modal when clicking the cancel button
    cancelBtn.addEventListener('click', () => {
        memberModal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === memberModal) {
            memberModal.style.display = 'none';
        }
    });

    // Handle payment method changes
    const paymentMethodSelect = document.getElementById('edit-payment-method');
    const subscriptionValidField = document.getElementById('edit-subscription-valid');
    
    paymentMethodSelect.addEventListener('change', function() {
        if (this.value === 'מזומן') {
            // For cash payment, enable the field for manual date entry
            subscriptionValidField.disabled = false;
            subscriptionValidField.value = subscriptionValidField.value || '';
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

    // Form submission handler
    memberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(memberForm);
        const memberId = document.getElementById('member-id').value;
        const isNewMember = !memberId;
        
        // Convert FormData to JSON object
        const memberData = {};
        formData.forEach((value, key) => {
            // Map frontend field names to backend field names
            if (key === 'membershipType') {
                memberData['type_membership'] = value;
            } else if (key === 'paymentMethod') {
                memberData['payment_method'] = value;
            } else if (key === 'subscriptionvalid') {
                memberData['payment_date'] = value;
            } else if (key === 'paymentStatus') {
                memberData['payment_status'] = value;
            } else {
                memberData[key] = value;
            }
        });
        
        // Check payment date for status
        if (memberData.payment_method === 'אשראי') {
            // Credit card payments are always "paid"
            memberData.payment_status = 'paid';
        } else if (memberData.payment_date) {
            const paymentDate = new Date(memberData.payment_date);
            // Set both dates to beginning of day for accurate comparison
            paymentDate.setHours(0, 0, 0, 0);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // If payment date is today or in the future, mark as paid
            if (paymentDate >= today) {
                memberData.payment_status = 'paid';
            } else {
                memberData.payment_status = 'unpaid';
            }
        }
        
        try {
            let response;
            let url;
            
            if (isNewMember) {
                // Creating a new member
                url = '/api/v1/members_batyam/';
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(memberData)
                });
            } else {
                // Updating an existing member
                url = `/api/v1/members_batyam/id/${memberId}`;
                response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(memberData)
                });
            }
            
            if (response.ok) {
                alert(isNewMember ? 'מתאמן נוסף בהצלחה' : 'פרטי המתאמן עודכנו בהצלחה');
                memberModal.style.display = 'none';
                loadMembers(); // Reload the members list
            } else {
                const error = await response.json();
                alert(`שגיאה: ${error.detail || 'אירעה שגיאה בעת עדכון פרטי המתאמן'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('אירעה שגיאה בעת שמירת פרטי המתאמן');
        }
    });

    // Function to load members from API
    async function loadMembers() {
        try {
            const response = await fetch('/api/v1/members_batyam/');
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
        const tableBody = document.querySelector('#members-table-body');
        tableBody.innerHTML = '';
        
        members.forEach(member => {
            // Get subscription status first
            const subscriptionStatus = getSubscriptionStatus(member);
            
            // Display appropriate data based on membership status
            const membershipType = member.type_membership || member.membershipType;
            const paymentMethod = member.payment_method || member.paymentMethod;
            const paymentDate = member.payment_date || formatDate(member.subscriptionvalid);
            
            const paymentStatus = getPaymentStatus(member);
            
            const row = document.createElement('tr');
            
            // Create each cell individually to avoid HTML injection issues
            const nameCell = document.createElement('td');
            nameCell.textContent = member.fullName;
            
            const phoneCell = document.createElement('td');
            phoneCell.textContent = member.phone;

            const phone2Cell = document.createElement('td');
            phone2Cell.textContent = member.phone2 || '';
            
            const typeCell = document.createElement('td');
            typeCell.textContent = member.type_membership;

            const methodCell = document.createElement('td');
            methodCell.textContent = member.payment_method;
            
            const validCell = document.createElement('td');
            validCell.textContent = paymentDate;
            
            // Add payment status cell
            const statusCell = document.createElement('td');
            const statusSpan = document.createElement('span');
            statusSpan.textContent = paymentStatus.text;
            statusSpan.className = paymentStatus.class;
            statusCell.appendChild(statusSpan);
            
            // Action cell with edit button
            const actionCell = document.createElement('td');
            actionCell.className = 'action-buttons';
            
            const editButton = document.createElement('button');
            editButton.className = 'blue-btn';
            editButton.textContent = 'ערוך מתאמן';
            editButton.onclick = function() {
                openEditMemberModal(member);
            };
            
            actionCell.appendChild(editButton);
            
            // Add all cells to the row
            row.appendChild(nameCell);
            row.appendChild(phoneCell);
            row.appendChild(phone2Cell);
            row.appendChild(typeCell);
            row.appendChild(methodCell);
            row.appendChild(validCell);
            row.appendChild(statusCell);  // Add the status cell
            row.appendChild(actionCell);
            
            // Add the row to the table
            tableBody.appendChild(row);
        });
    }

    // Add delete button functionality
    const deleteBtn = document.getElementById('delete-btn');
    
    deleteBtn.addEventListener('click', async () => {
        const memberId = document.getElementById('member-id').value;
        
        if (!memberId) {
            alert('לא ניתן למחוק מתאמן חדש שטרם נוסף למערכת');
            return;
        }
        
        const confirmDelete = confirm('האם אתה בטוח שברצונך למחוק את המתאמן? פעולה זו אינה ניתנת לביטול');
        
        if (confirmDelete) {
            try {
                const response = await fetch(`/api/v1/members_batyam/id/${memberId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('המתאמן נמחק בהצלחה');
                    memberModal.style.display = 'none';
                    loadMembers(); // Reload the members list
                } else {
                    const error = await response.json();
                    alert(`שגיאה: ${error.detail || 'אירעה שגיאה בעת מחיקת המתאמן'}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('אירעה שגיאה בעת מחיקת המתאמן');
            }
        }
    });

    // Function to open add member modal
    function openAddMemberModal() {
        // Clear the form
        memberForm.reset();
        document.getElementById('member-id').value = '';
        
        // Set modal title for adding new member
        modalTitle.textContent = 'הוסף מתאמן חדש';
        
        // Hide delete button for new members
        deleteBtn.classList.add('hide-delete-btn');
        
        // Show the modal
        memberModal.style.display = 'block';
    }

    // Function to open edit member modal
    function openEditMemberModal(member) {
        // Set modal title for editing
        modalTitle.textContent = 'ערוך פרטי מתאמן';
        
        // Show delete button for existing members
        deleteBtn.classList.remove('hide-delete-btn');
        
        // Fill the form with member data
        document.getElementById('member-id').value = member._id;
        document.getElementById('edit-name').value = member.fullName || '';
        document.getElementById('edit-phone').value = member.phone || '';
        document.getElementById('edit-phone2').value = member.phone2 || '';
        document.getElementById('edit-membership-type').value = member.type_membership || '';
        document.getElementById('edit-payment-method').value = member.payment_method || '';
        document.getElementById('edit-subscription-valid').value = formatDateForInput(member.payment_date);
        // Set select values
        setSelectValue('edit-membership-type', member.type_membership);
        setSelectValue('edit-payment-method', member.payment_method);
        setSelectValue('edit-payment-status', member.payment_status);
        setSelectValue('edit-membership-status', member.membership_status);
        
        // Set subscription date
        document.getElementById('edit-subscription-valid').value = formatDateForInput(member.payment_date);
        
        // Set subscription field state based on payment method
        const subscriptionValidField = document.getElementById('edit-subscription-valid');
        if (member.payment_method === 'מזומן') {
            subscriptionValidField.disabled = false;
        } else if (member.payment_method === 'אשראי') {
            subscriptionValidField.disabled = true;
        }
        
        // Show the modal
        memberModal.style.display = 'block';
    }

    // Function to set select value
    function setSelectValue(selectId, value) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) {
                select.selectedIndex = i;
                break;
            }
        }
    }

    // Updated function to check subscription status
    function getSubscriptionStatus(member) {
        // Check if membership is frozen
        if (member.membership_status === 'frozen') {
            return {
                text: 'מנוי מוקפא',
                class: 'status-frozen'
            };
        }
        
        // Check if account is deactivated
        if (member.membership_status === 'inactive') {
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
        // For credit card payments, always show as paid
        if (member.payment_method === 'אשראי') {
            return {
                text: 'מנוי שולם',
                class: 'status-paid'
            };
        }
        
        // Check explicit payment status
        if (member.payment_status === 'paid') {
            return {
                text: 'מנוי שולם',
                class: 'status-paid'
            };
        }
        
        if (member.payment_status === 'unpaid') {
            return {
                text: 'מנוי לא שולם',
                class: 'status-due'
            };
        }
        
        // If no explicit status, check the payment date
        if (member.payment_date) {
            const paymentDate = new Date(member.payment_date);
            paymentDate.setHours(0, 0, 0, 0); // Reset time part
            
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time part
            
            if (paymentDate >= today || member.payment_date.includes('9999-12-12')) {
                return {
                    text: 'מנוי שולם',
                    class: 'status-paid'
                };
            } else {
                return {
                    text: 'מנוי לא שולם',
                    class: 'status-due'
                };
            }
        }
        
        // Default case
        return {
            text: 'בדיקת תשלום',
            class: 'status-due'
        };
    }

    // Function to filter members
    function filterMembers() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredMembers = allMembers.filter(member => 
            member.fullName.toLowerCase().includes(searchTerm) ||
            member.phone.includes(searchTerm) ||
            (member.phone2 && member.phone2.includes(searchTerm))
        );
        displayMembers(filteredMembers);
    }

    // Helper function to format dates for display
    function formatDate(dateString) {
        if (!dateString) return 'לא זמין';
        
        // For the special "forever" date used for credit card payments
        if (dateString.includes('9999-12-12')) {
            return 'ללא הגבלה';  // "Unlimited" in Hebrew
        }
        
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return 'לא הגבלה';
        
        // Format date as DD/MM/YYYY
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
    
    // Helper function to format dates for input fields
    function formatDateForInput(dateString) {
        if (!dateString || dateString.includes('9999-12-12')) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        // Format date as YYYY-MM-DD for input[type="date"]
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }

    // Initial load
    loadMembers();
});
