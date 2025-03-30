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
        const memberData = {
            // Set default values for essential fields
            fullName: '',
            phone: '',
            phone2: '',
            type_membership: 'היאבקות ',
            payment_method: 'מזומן',
            payment_date: '',
            payment_status: 'paid',
            weeklyTraining: '250',
            notes: ''
        };
        
        // Override with actual form values
        formData.forEach((value, key) => {
            console.log('key, value', key, value);
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
        
        // Ensure we have essential fields from the form directly
        memberData.weeklyTraining = document.getElementById('edit-weekly-training').value;
        memberData.notes = document.getElementById('edit-notes').value;
        memberData.fullName = document.getElementById('edit-name').value;
        memberData.phone = document.getElementById('edit-phone').value;
        memberData.payment_date = document.getElementById('edit-subscription-valid').value;
        
        // Check payment date for status
        if (memberData.payment_method === 'אשראי') {
            // Credit card payments are always "paid" with a special date
            memberData.payment_status = 'paid';
            if (!memberData.payment_date) {
                memberData.payment_date = '9999-12-12';
            }
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
            displayNotesTable(allMembers);
            displayExpiringSubscriptions(allMembers);
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
            const membershipType = member.type_membership || member.membershipType || '-';
            const paymentMethod = member.payment_method || member.paymentMethod || '-';
            const paymentDate = member.payment_date ? formatDate(member.payment_date) : 
                               (member.subscriptionvalid ? formatDate(member.subscriptionvalid) : '-');
            const weeklyTraining = member.weeklyTraining ? `${member.weeklyTraining} ₪` : '-';
            
            const paymentStatus = getPaymentStatus(member);
            
            const row = document.createElement('tr');
            
            // Create each cell individually to avoid HTML injection issues
            const nameCell = document.createElement('td');
            nameCell.textContent = member.fullName || '-';
            
            const phoneCell = document.createElement('td');
            phoneCell.textContent = member.phone || '-';

            const phone2Cell = document.createElement('td');
            phone2Cell.textContent = member.phone2 || '-';
            
            const typeCell = document.createElement('td');
            typeCell.textContent = membershipType;

            const methodCell = document.createElement('td');
            methodCell.textContent = paymentMethod;
            
            // Add weekly training cost cell
            const weeklyTrainingCell = document.createElement('td');
            weeklyTrainingCell.textContent = weeklyTraining;
            
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
            
            // Add all cells to the row in the correct order
            row.appendChild(nameCell);
            row.appendChild(phoneCell);
            row.appendChild(phone2Cell);
            row.appendChild(typeCell);
            row.appendChild(methodCell);
            row.appendChild(weeklyTrainingCell);
            row.appendChild(validCell);
            row.appendChild(statusCell);
            row.appendChild(actionCell);
            
            // Add the row to the table
            tableBody.appendChild(row);
        });
    }

    // New function to display notes table
    function displayNotesTable(members) {
        const notesTableBody = document.querySelector('#notes-table-body');
        if (!notesTableBody) {
            console.error('Notes table body element not found');
            return;
        }
        
        notesTableBody.innerHTML = '';
        
        // Filter members that have notes
        const membersWithNotes = members.filter(member => {
            return member.notes && typeof member.notes === 'string' && member.notes.trim() !== '';
        });
        
        if (membersWithNotes.length === 0) {
            // If no members have notes, add a single row with a message
            const row = document.createElement('tr');
            
            const messageCell = document.createElement('td');
            messageCell.colSpan = 2;
            messageCell.textContent = 'אין הערות למתאמנים';
            messageCell.className = 'no-notes-message';
            
            row.appendChild(messageCell);
            notesTableBody.appendChild(row);
            return;
        }
        
        // Debug
        console.log('Members with notes:', membersWithNotes.map(m => ({name: m.fullName, notes: m.notes})));
        
        // Sort members by name for better readability
        membersWithNotes.sort((a, b) => a.fullName.localeCompare(b.fullName));
        
        // Add a row for each member with notes
        membersWithNotes.forEach(member => {
            const row = document.createElement('tr');
            
            // Member name cell with link to edit
            const nameCell = document.createElement('td');
            const nameLink = document.createElement('a');
            nameLink.textContent = member.fullName || 'שם לא ידוע';
            nameLink.href = '#';
            nameLink.className = 'member-name-link';
            nameLink.onclick = function(e) {
                e.preventDefault();
                openEditMemberModal(member);
            };
            nameCell.appendChild(nameLink);
            
            // Notes cell
            const notesCell = document.createElement('td');
            notesCell.textContent = member.notes || '';
            notesCell.className = 'member-notes-cell';
            
            row.appendChild(nameCell);
            row.appendChild(notesCell);
            
            notesTableBody.appendChild(row);
        });
    }

    // Function to display expiring subscriptions
    function displayExpiringSubscriptions(members) {
        const tableBody = document.querySelector('#expiring-subscriptions-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const weekFromNow = new Date(today);
        weekFromNow.setDate(today.getDate() + 7);
        
        // Filter members with expired or expiring subscriptions
        const expiringMembers = members.filter(member => {
            if (member.payment_method === 'אשראי') return false;
            
            const paymentDate = new Date(member.payment_date);
            paymentDate.setHours(0, 0, 0, 0);
            
            return paymentDate <= weekFromNow;
        });
        
        if (expiringMembers.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 5;
            cell.textContent = 'אין מנויים שפגו תוקף או עומדים לפוג';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }
        
        // Sort by payment date (expired first)
        expiringMembers.sort((a, b) => {
            const dateA = new Date(a.payment_date);
            const dateB = new Date(b.payment_date);
            return dateA - dateB;
        });
        
        expiringMembers.forEach(member => {
            const row = document.createElement('tr');
            const paymentStatus = getPaymentStatus(member);
            
            // Create cells
            const nameCell = document.createElement('td');
            nameCell.textContent = member.fullName;
            
            const phoneCell = document.createElement('td');
            phoneCell.textContent = member.phone;
            
            const validCell = document.createElement('td');
            validCell.textContent = formatDate(member.payment_date);
            
            const statusCell = document.createElement('td');
            const statusSpan = document.createElement('span');
            statusSpan.textContent = paymentStatus.text;
            statusSpan.className = paymentStatus.class;
            statusCell.appendChild(statusSpan);
            
            const actionCell = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.className = 'blue-btn';
            editButton.textContent = 'ערוך מתאמן';
            editButton.onclick = () => openEditMemberModal(member);
            actionCell.appendChild(editButton);
            
            // Add cells to row
            row.appendChild(nameCell);
            row.appendChild(phoneCell);
            row.appendChild(validCell);
            row.appendChild(statusCell);
            row.appendChild(actionCell);
            
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
        
        // Explicitly clear all fields including notes and weekly training
        document.getElementById('edit-name').value = '';
        document.getElementById('edit-phone').value = '';
        document.getElementById('edit-phone2').value = '';
        document.getElementById('edit-notes').value = ''; // Reset notes field
        document.getElementById('edit-subscription-valid').value = '';
        
        // Reset select elements to their first option
        document.getElementById('edit-membership-type').selectedIndex = 0;
        document.getElementById('edit-payment-method').selectedIndex = 0;
        document.getElementById('edit-payment-status').selectedIndex = 0;
        document.getElementById('edit-weekly-training').selectedIndex = 0; // Reset weekly training
        
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
        document.getElementById('edit-notes').value = member.notes || '';
        
        // Set select values
        setSelectValue('edit-membership-type', member.type_membership);
        setSelectValue('edit-payment-method', member.payment_method);
        setSelectValue('edit-payment-status', member.payment_status);
        setSelectValue('edit-weekly-training', member.weeklyTraining);
        
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
        
        if (!value) {
            // If value is undefined or empty, set to first option
            select.selectedIndex = 0;
            return;
        }
        
        let valueFound = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) {
                select.selectedIndex = i;
                valueFound = true;
                break;
            }
        }
        
        // If the value wasn't found in any option, default to first option
        if (!valueFound) {
            select.selectedIndex = 0;
            console.warn(`Value "${value}" not found in select options for ${selectId}, defaulting to first option`);
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

        if (!member.payment_date) {
            return {
                text: 'בדיקת תשלום',
                class: 'status-due'
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const paymentDate = new Date(member.payment_date);
        paymentDate.setHours(0, 0, 0, 0);
        
        const weekFromNow = new Date(today);
        weekFromNow.setDate(today.getDate() + 7);

        // Payment is expired
        if (paymentDate < today) {
            return {
                text: 'מנוי לא שולם',
                class: 'status-due'
            };
        }
        
        // Payment will expire within a week
        if (paymentDate <= weekFromNow) {
            return {
                text: 'מנוי עומד לפוג',
                class: 'status-going-to-expire'
            };
        }
        
        // Payment is valid and not expiring soon
        return {
            text: 'מנוי שולם',
            class: 'status-paid'
        };
    }

    // Update the filter function to filter both tables
    function filterMembers() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredMembers = allMembers.filter(member => 
            member.fullName.toLowerCase().includes(searchTerm) ||
            member.phone.includes(searchTerm) ||
            (member.phone2 && member.phone2.includes(searchTerm))
        );
        displayMembers(filteredMembers);
        displayNotesTable(filteredMembers);
        displayExpiringSubscriptions(filteredMembers);
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
