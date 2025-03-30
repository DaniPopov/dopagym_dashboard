document.addEventListener('DOMContentLoaded', async () => {
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

    // Get member ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');

    console.log('memberId', memberId);

    if (!memberId) {
        alert('מזהה מתאמן חסר');
        window.location.href = '/all_members';
        return;
    }

    // Store the current member data globally
    let currentMember = null;

    // Load member data first before setting up event handlers
    try {
        if (memberId) {
            currentMember = await getMemberById(memberId);
        }
        if (!currentMember) {
            alert('לא נמצא מתאמן');
            window.location.href = '/all_members';
            return;
        }

        console.log('currentMember', currentMember);

        // Display the member data
        displayMemberData(currentMember);
        loadVisitHistory(currentMember);
        
        console.log('Member data loaded:', currentMember);
    } catch (error) {
        console.error('Error loading member data:', error);
        alert('שגיאה בטעינת נתוני המתאמן');
        return;
    }

    // Set up event listeners for buttons
    const editMemberBtn = document.getElementById('edit-member-btn');
    const freezeMemberBtn = document.getElementById('freeze-member-btn');
    const downloadQrBtn = document.getElementById('download-qr-btn');
    const deleteMemberBtn = document.getElementById('delete-member-btn');
    const editNotesBtn = document.getElementById('edit-notes-btn');
    const saveNotesBtn = document.getElementById('save-notes-btn');
    const cancelNotesBtn = document.getElementById('cancel-notes-btn');

    // Edit modal elements
    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.querySelector('.close');
    const editForm = document.getElementById('edit-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    editMemberBtn.addEventListener('click', () => {
        openEditModal(currentMember);
    });

    freezeMemberBtn.addEventListener('click', async () => {
        if (!currentMember) {
            alert('לא נמצא מתאמן');
            return;
        }
        
        const newStatus = currentMember.membershipStatus === 'frozen' ? 'active' : 'frozen';
        const confirmMessage = newStatus === 'frozen' ? 
            'האם אתה בטוח שברצונך להקפיא את המנוי?' : 
            'האם אתה בטוח שברצונך להפשיר את המנוי?';
        
        if (confirm(confirmMessage)) {
            await freezeMember(currentMember._id, newStatus);
            // Reload data
            try {
                currentMember = await getMemberById(currentMember._id);
                displayMemberData(currentMember);
                loadVisitHistory(currentMember);
            } catch (error) {
                console.error('Error reloading member data:', error);
            }
        }
    });

    downloadQrBtn.addEventListener('click', () => {
        if (!currentMember) {
            alert('לא נמצא מתאמן');
            return;
        }
        downloadQRCode(currentMember);
    });

    deleteMemberBtn.addEventListener('click', async () => {
        if (!currentMember) {
            alert('לא נמצא מתאמן');
            return;
        }
        
        if (confirm('האם אתה בטוח שברצונך למחוק את המתאמן? פעולה זו אינה ניתנת לביטול.')) {
            await deleteMember(currentMember._id);
        }
    });

    // Notes functionality
    editNotesBtn.addEventListener('click', () => {
        if (!currentMember) {
            alert('לא נמצא מתאמן');
            return;
        }
        
        const notesDisplay = document.getElementById('notes-display');
        const notesEdit = document.getElementById('notes-edit');
        const notesTextarea = document.getElementById('notes-textarea');
        
        // Initialize with empty string if notes is null
        notesTextarea.value = '';
        
        // Only set value if notes exists and is not null
        if (currentMember.notes !== null && currentMember.notes !== undefined) {
            notesTextarea.value = currentMember.notes;
        }
        
        notesDisplay.style.display = 'none';
        notesEdit.style.display = 'block';
        editNotesBtn.style.display = 'none';
    });

    saveNotesBtn.addEventListener('click', async () => {
        if (!currentMember) {
            alert('לא נמצא מתאמן');
            return;
        }
        
        const notesTextarea = document.getElementById('notes-textarea');
        const notes = notesTextarea.value;
        
        await updateMemberNotes(currentMember._id, notes);
        
        // Update the display
        document.getElementById('notes-display').textContent = notes || 'אין הערות';
        document.getElementById('notes-display').style.display = 'block';
        document.getElementById('notes-edit').style.display = 'none';
        editNotesBtn.style.display = 'block';
        
        // Update the current member object
        currentMember.notes = notes;
    });

    cancelNotesBtn.addEventListener('click', () => {
        document.getElementById('notes-display').style.display = 'block';
        document.getElementById('notes-edit').style.display = 'none';
        editNotesBtn.style.display = 'block';
    });

    // Modal functionality
    closeModalBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    cancelEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            editModal.style.display = 'none';
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentMember) {
            alert('לא נמצא מתאמן');
            return;
        }
        
        const formData = new FormData(editForm);
        const memberData = {};
        
        formData.forEach((value, key) => {
            memberData[key] = value;
        });
        
        // Preserve existing notes since we removed the field from the form
        memberData.notes = currentMember.notes || '';
        
        // Ensure emergency_contact is never null
        if (memberData.emergency_contact === null || memberData.emergency_contact === undefined) {
            memberData.emergency_contact = '';
        }
        
        await updateMember(currentMember._id, memberData);
        editModal.style.display = 'none';
        
        // Reload member data
        try {
            currentMember = await getMemberById(currentMember._id);
            displayMemberData(currentMember);
            loadVisitHistory(currentMember);
        } catch (error) {
            console.error('Error reloading member data:', error);
        }
    });
});

function displayMemberData(member) {
    // Set member name and status badges
    document.getElementById('member-name').textContent = member.fullName || 'לא זמין';
    
    // Set status badges
    const membershipStatusElement = document.getElementById('membership-status');
    const paymentStatusElement = document.getElementById('payment-status');
    membershipStatusElement.className = 'status-badge';
    paymentStatusElement.className = 'status-badge';
    
    console.log("Membership status before display:", member.membershipStatus);
    
    if(member.membershipStatus === 'active'){
        membershipStatusElement.classList.add('status-valid');
        membershipStatusElement.textContent = 'מנוי פעיל';
    }else if(member.membershipStatus === 'inactive'){
        membershipStatusElement.classList.add('status-inactive');
        membershipStatusElement.textContent = 'מנוי פג תוקף';
    }else if(member.membershipStatus === 'frozen'){
        membershipStatusElement.classList.add('status-frozen');
        membershipStatusElement.textContent = 'מנוי מוקפא';
    }
    
    console.log("Applied classes:", membershipStatusElement.className);


    console.log("Payment status before display:", member.paymentStatus);

    if(member.paymentStatus === 'paid'){
        paymentStatusElement.classList.add('status-valid');
        paymentStatusElement.textContent = 'מנוי שולם';
    }else if(member.paymentStatus === 'unpaid'){
        paymentStatusElement.classList.add('status-due');
        paymentStatusElement.textContent = 'מנוי לא שולם';
    }else if(member.paymentStatus === 'frozen'){
        paymentStatusElement.classList.add('status-frozen');
        paymentStatusElement.textContent = 'מנוי מוקפא';
    }

    console.log("Applied classes:", paymentStatusElement.className);

    // Set personal details
    const personalDetails = {
        'member-phone': member.phone,
        'member-email': member.email,
        'member-id': member.idNumber,
        'member-birthdate': formatDate(member.birthDate),
        'emergency-contact': member.emergency_contact
    };

    for (const [id, value] of Object.entries(personalDetails)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || 'לא זמין';
        }
    }

    // Set membership details
    const membershipDetails = {
        'membership-type': member.membershipType,
        'weekly-training': member.weeklyTraining,
        'payment-method': member.paymentMethod,
        'subscription-valid': formatDate(member.subscriptionvalid)
    };

    for (const [id, value] of Object.entries(membershipDetails)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || 'לא זמין';
        }
    }

    // Set QR code image
    const qrCodeImage = document.getElementById('qr-code-image');
    if (member.qrcode_image) {
        qrCodeImage.src = `data:image/png;base64,${member.qrcode_image}`;
    } else {
        qrCodeImage.src = '/static/assets/no-qr-code.png';
    }

    // Set notes
    const notesDisplay = document.getElementById('notes-display');
    if (notesDisplay) {
        notesDisplay.textContent = member.notes || 'אין הערות';
    }

    // Set visit information
    document.getElementById('last-visit').textContent = formatDate(member.lastVisit) || 'אין ביקורים';
    document.getElementById('total-visits').textContent = member.allVisits ? member.allVisits.length : 0;
    
    // Calculate and display visits this week
    const visitsThisWeek = calculateVisitsThisWeek(member.allVisits || []);
    document.getElementById('visits-this-week').textContent = visitsThisWeek;

    // Update freeze button text based on membership status
    const freezeBtn = document.getElementById('freeze-member-btn');
    if (freezeBtn) {
        freezeBtn.textContent = member.membershipStatus === 'frozen' ? 'הפשר מנוי' : 'הקפא מנוי';
    }

    // Add this after setting the membership status badge
    if (member.weeklyTraining === "כרטסייה של 10 אימונים" && 
        member.membershipStatus === 'inactive' &&
        member.paymentStatus === 'unpaid') {
        
        // Create a special notice element for punch card
        const noticeElement = document.createElement('div');
        noticeElement.className = 'punch-card-notice';
        noticeElement.textContent = 'הכרטסייה נוצלה במלואה, יש לרכוש כרטסייה חדשה';
        
        // Insert after the status badges
        const profileInfo = document.querySelector('.profile-info');
        profileInfo.appendChild(noticeElement);
    }
}

async function getMemberById(memberId) {
    const response = await fetch(`/api/v1/members/id/${memberId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch member data');
    }
    return await response.json();
}

function loadVisitHistory(member) {
    // Set last visit
    document.getElementById('last-visit').textContent = formatDate(member.lastVisit);
    
    // Set total visits
    const totalVisits = member.allVisits ? member.allVisits.length : 0;
    document.getElementById('total-visits').textContent = totalVisits;
    
    // Calculate visits this week
    const visitsThisWeek = calculateVisitsThisWeek(member.allVisits || []);
    document.getElementById('visits-this-week').textContent = visitsThisWeek;
    
    // Populate visits table
    const visitsTableBody = document.getElementById('visits-table-body');
    visitsTableBody.innerHTML = '';
    
    if (member.allVisits && member.allVisits.length > 0) {
        // Sort visits in descending order (newest first)
        const sortedVisits = [...member.allVisits].sort((a, b) => new Date(b) - new Date(a));
        
        sortedVisits.forEach(visit => {
            const visitDate = new Date(visit);
            const row = document.createElement('tr');
            
            // Format date as DD/MM/YYYY
            const formattedDate = formatDate(visit);
            
            // Format time as HH:MM
            const hours = visitDate.getHours().toString().padStart(2, '0');
            const minutes = visitDate.getMinutes().toString().padStart(2, '0');
            const formattedTime = `${hours}:${minutes}`;
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${formattedTime}</td>
            `;
            
            visitsTableBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="2" style="text-align: center;">אין ביקורים להצגה</td>`;
        visitsTableBody.appendChild(row);
    }
}

function calculateVisitsThisWeek(visits) {
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Set to the beginning of the week (Sunday)
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Count visits in the current week
    return visits.filter(visit => {
        const visitDate = new Date(visit);
        return visitDate >= startOfWeek;
    }).length;
}

function getSubscriptionStatus(member) {
    // Check if account is frozen
    if (member.accountStatus === 'frozen') {
        return {
            text: 'מנוי מוקפא',
            class: 'status-frozen'
        };
    }
    
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
        const today = new Date();
        
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

async function freezeMember(memberId, newStatus) {
    // TODO: If we freeze the member, for credit just freeze the account
    // for cash, only freeze to two weeks minimun 
    // example: shlomi has a payment until 1/5/2025, today is 11/3/2025 and he asked to freeze for 15 days
    // --> + 15 days to payment date --> 16/3/2025 --> freeze until 16/3/2025

    // example 2: mark asks to freeze for 9 days (minimum 2 weeks) we alert about it ()

    try {
        // Update only the membershipStatus field
        const response = await fetch(`/api/v1/members/id/${memberId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'membershipStatus': newStatus  // 'frozen' or 'active'
            }),
        });

        if (response.ok) {
            alert(newStatus === 'frozen' ? 'המנוי הוקפא בהצלחה' : 'המנוי הופשר בהצלחה');
            return true;
        } else {
            const error = await response.json();
            alert(`שגיאה: ${error.detail || 'אירעה שגיאה בעת עדכון המנוי'}`);
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('אירעה שגיאה בעת עדכון המנוי');
        return false;
    }
}

function downloadQRCode(member) {
    const qrCodeImage = document.getElementById('qr-code-image');
    const memberName = member.fullName;
    
    if (qrCodeImage.src) {
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = qrCodeImage.src;
        link.download = `qrcode_${memberName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert('קוד QR לא זמין להורדה');
    }
}

async function updateMemberNotes(memberId, notes) {
    try {
        const response = await fetch(`/api/v1/members/id/${memberId}`, {
            method: 'PATCH',  // Changed to PATCH for partial update
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'notes': notes
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update notes');
        }
        
        return true;
    } catch (error) {
        console.error('Error updating notes:', error);
        alert('שגיאה בעדכון ההערות');
        return false;
    }
}

async function deleteMember(memberId) {
    try {
        const response = await fetch(`/api/v1/members/id/${memberId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('המתאמן נמחק בהצלחה');
            window.location.href = '/all_members';
            return true;
        } else {
            const error = await response.json();
            alert(`שגיאה במחיקת המתאמן: ${error.detail}`);
            return false;
        }
    } catch (error) {
        console.error('Error deleting member:', error);
        alert('שגיאה במחיקת המתאמן');
        return false;
    }
}

async function updateMember(memberId, memberData) {
    try {
        // Ensure all text fields have at least empty string values
        const fieldsToCheck = ['notes', 'emergency_contact', 'instagram', 'lead_source', 'leaving_reason'];
        
        for (const field of fieldsToCheck) {
            if (field in memberData && (memberData[field] === null || memberData[field] === undefined)) {
                memberData[field] = '';
            }
        }
        
        // Handle punch card renewal
        if (memberData.weeklyTraining === "כרטסייה של 10 אימונים") {
            const response = await fetch(`/api/v1/members/id/${memberId}`);
            const currentMember = await response.json();
            
            // If member is inactive/unpaid and they're getting a new punch card
            if (currentMember.membershipStatus === 'inactive' && 
                currentMember.paymentStatus === 'unpaid' &&
                currentMember.weeklyTraining === "כרטסייה של 10 אימונים") {
                
                // Set new status for fresh punch card
                memberData.paymentStatus = 'paid';
                memberData.membershipStatus = 'active';
                
                // Set subscription valid to 3 months from now
                const today = new Date();
                const threeMonthsLater = new Date(today);
                threeMonthsLater.setMonth(today.getMonth() + 3);
                memberData.subscriptionvalid = threeMonthsLater.toISOString().split('T')[0];
            }
        }
        
        // Check if subscription date was updated to a future date
        if (memberData.subscriptionvalid) {
            const subscriptionDate = new Date(memberData.subscriptionvalid);
            const today = new Date();
            
            // If subscription date is in the future or is the special credit card date
            if (subscriptionDate > today || memberData.subscriptionvalid === '9999-12-12') {
                // Set payment status to paid and membership to active
                memberData.paymentStatus = 'paid';
                memberData.membershipStatus = 'active';
                console.log('Updated payment status to paid and membership to active based on new subscription date');
            }
        }
        
        const response = await fetch(`/api/v1/members/id/${memberId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(memberData),
        });

        if (response.ok) {
            alert('פרטי המתאמן עודכנו בהצלחה');
            return true;
        } else {
            const error = await response.json();
            alert(`שגיאה: ${error.detail || 'אירעה שגיאה בעת עדכון פרטי המתאמן'}`);
            return false;
        }
    } catch (error) {
        console.error('Error updating member:', error);
        alert('אירעה שגיאה בעת עדכון פרטי המתאמן');
        return false;
    }
}

function openEditModal(member) {
    if (!member) return;
    
    // Fill the form with current member data
    document.getElementById('edit-name').value = member.fullName || '';
    document.getElementById('edit-phone').value = member.phone || '';
    document.getElementById('edit-email').value = member.email || '';
    document.getElementById('edit-id').value = member.idNumber || '';
    document.getElementById('edit-birthdate').value = formatDateForInput(member.birthDate);
    document.getElementById('edit-emergency').value = member.emergency_contact || '';
    
    // Set select values
    setSelectValue('edit-membership-type', member.membershipType);
    setSelectValue('edit-weekly-training', member.weeklyTraining);
    setSelectValue('edit-payment-method', member.paymentMethod);
    setSelectValue('edit-payment-status', member.paymentStatus);
    setSelectValue('edit-membership-status', member.membershipStatus);
    
    // Set subscription date
    document.getElementById('edit-subscription-valid').value = formatDateForInput(member.subscriptionvalid);
    
    // Add event listener to payment method select to handle subscription valid field
    const paymentMethodSelect = document.getElementById('edit-payment-method');
    const subscriptionValidField = document.getElementById('edit-subscription-valid');
    
    // Remove any existing event listeners to prevent duplicates
    const newPaymentMethodSelect = paymentMethodSelect.cloneNode(true);
    paymentMethodSelect.parentNode.replaceChild(newPaymentMethodSelect, paymentMethodSelect);
    
    // Set up the event listener for payment method changes
    newPaymentMethodSelect.addEventListener('change', function() {
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
    
    // Initially set the state based on current payment method
    if (member.paymentMethod === 'מזומן') {
        subscriptionValidField.disabled = false;
    } else if (member.paymentMethod === 'אשראי') {
        subscriptionValidField.disabled = true;
    }
    
    // Show the modal
    document.getElementById('edit-modal').style.display = 'block';
}

function setSelectValue(selectId, value) {
    const select = document.getElementById(selectId);
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
            select.selectedIndex = i;
            break;
        }
    }
}

function formatDateForInput(dateString) {
    if (!dateString || dateString.includes('9999-12-12')) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Format date as YYYY-MM-DD for input[type="date"]
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

async function resetPunchCard(memberId) {
    try {
        const response = await fetch(`/api/v1/members/id/${memberId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'paymentStatus': 'paid',
                'membershipStatus': 'active'
            }),
        });

        if (response.ok) {
            alert('הכרטסייה חודשה בהצלחה');
            window.location.reload(); // Reload page to show changes
            return true;
        } else {
            const error = await response.json();
            alert(`שגיאה: ${error.detail || 'אירעה שגיאה בעת חידוש הכרטסייה'}`);
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('אירעה שגיאה בעת חידוש הכרטסייה');
        return false;
    }
}
