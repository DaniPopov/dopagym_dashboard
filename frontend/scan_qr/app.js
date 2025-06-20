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
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },  // Smaller size for mobile
            rememberLastUsedCamera: true,
            aspectRatio: 1.0,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true  // Better for mobile
            }
        }
    );

    function onScanSuccess(decodedText) {
        console.log(`QR Code detected: ${decodedText}`);
        
        // Stop the scanner after successful scan
        html5QrcodeScanner.clear();
        
        // Make sure the scan-result element exists
        let resultContainer = document.getElementById('scan-result');
        
        // If the element doesn't exist, create it
        if (!resultContainer) {
            resultContainer = document.createElement('div');
            resultContainer.id = 'scan-result';
            document.querySelector('.main-content').appendChild(resultContainer);
        }
        
        // Show loading state
        resultContainer.innerHTML = '<div class="loading-indicator">מעבד את הנתונים...</div>';
        
        // Call API to process the scan
        processScan(decodedText);
    }

    function onScanError(error) {
        // Log all errors during development
        console.log(`QR Scan Error (full): ${error}`);
        
        // Only show relevant errors to user
        if (error?.includes("No MultiFormat Readers") || 
            error?.includes("No barcode or QR code detected")) {
            return; // Ignore normal scanning process messages
        }
        
        // Check for permission errors
        if (error?.includes("Permission") || error?.includes("denied")) {
            displayScanError("נדרשת הרשאה לשימוש במצלמה. אנא אשר את ההרשאה בדפדפן.");
        } else if (error?.includes("camera")) {
            displayScanError("לא ניתן לגשת למצלמה. אנא ודא שהמצלמה פנויה ומופעלת.");
        } else {
            console.warn(`QR Scan Error: ${error}`);
        }
    }

    async function processScan(memberId) {
        try {
            console.log("Member ID from QR code:", memberId);
            
            // Validate member ID
            if (!memberId || typeof memberId !== 'string') {
                throw new Error('קוד QR לא תקין');
            }

            // Make the API call
            const response = await fetch(`/api/v1/members/id/${encodeURIComponent(memberId.trim())}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 404) {
                    throw new Error('מתאמן לא נמצא');
                }
                throw new Error(errorData.detail || 'שגיאה בעיבוד הסריקה');
            }

            const data = await response.json();
            console.log("Member data:", data);
            
            // Check subscription and payment status
            const membershipStatus = checkMembershipStatus(data);
            console.log("Membership status:", membershipStatus);
            const paymentStatus = data.paymentStatus === 'paid';
            
            // Check weekly workout limit
            const workoutLimitCheck = checkWorkoutLimit(data);
            
            // Display the result
            displayScanResult(data, membershipStatus, paymentStatus, workoutLimitCheck);
            
        } catch (error) {
            console.error('Error processing scan:', error);
            displayScanError(error.message);
        }
    }

    function checkMembershipStatus(member) {
        // Check if account is frozen
        if (member.membershipStatus === 'frozen') {
            return {
                valid: false,
                message: 'המנוי מוקפא',
                details: 'לא ניתן להיכנס למכון כאשר המנוי מוקפא'
            };
        }
        
        // For punch card, always valid unless marked as inactive/unpaid
        if (member.weeklyTraining === "כרטסייה של 10 אימונים") {
            if (member.membershipStatus === 'inactive' || member.paymentStatus === 'unpaid') {
                return {
                    valid: false,
                    message: 'הכרטסייה נוצלה במלואה',
                    details: 'יש לרכוש כרטסייה חדשה כדי להמשיך להתאמן',
                    punchCardCompleted: true
                };
            }
            
            return {
                valid: true,
                message: 'כרטסייה בתוקף',
                punchCardCompleted: false
            };
        }

        // For credit card payments, always valid
        if (member.paymentMethod === 'אשראי') {
            return {
                valid: true,
                message: 'מנוי בתוקף'
            };
        }
        
        // For cash payments, check if subscription date has passed
        if (member.paymentMethod === 'מזומן') {
            const membershipDate = new Date(member.subscriptionvalid);
            const today = new Date();
            
            if (membershipDate > today) {
                // Check if this is their last week
                const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                if (membershipDate <= oneWeek) {
                    return {
                        valid: true,
                        message: 'מנוי בתוקף',
                        warning: 'שים לב: זהו השבוע האחרון למנוי שלך. נא לחדש בהקדם'
                    };
                }
                return {
                    valid: true,
                    message: 'מנוי בתוקף'
                };
            } else {
                return {
                    valid: false,
                    message: 'מנוי פג תוקף',
                    details: 'נא לחדש את המנוי'
                };
            }
        }
        
        return {
            valid: false,
            message: 'סטטוס מנוי לא ידוע'
        };
    }

    function checkWorkoutLimit(member) {
        // Check if member has punch card ("כרטסייה של 10 אימונים")
        if (member.weeklyTraining === "כרטסייה של 10 אימונים") {
            // If status already shows inactive/unpaid, card is completed
            if (member.membershipStatus === 'inactive' || member.paymentStatus === 'unpaid') {
                return {
                    canWorkout: false,
                    message: 'הכרטסייה נוצלה במלואה (10 מתוך 10 אימונים)',
                    details: 'יש לרכוש כרטסייה חדשה כדי להמשיך להתאמן',
                    punchCardCompleted: true
                };
            }
            
            // For punch card, count total visits
            const totalVisits = member.allVisits ? member.allVisits.length : 0;
            const visitsInCurrentCard = totalVisits % 10; // This will give us 0-9 visits in current card
            const remainingVisits = 10 - visitsInCurrentCard;
            
            // If this visit will be the 10th (final) visit
            if (visitsInCurrentCard === 9) {
                return {
                    canWorkout: true,
                    message: `אימון ${visitsInCurrentCard + 1} מתוך 10 בכרטסייה`,
                    punchCard: true,
                    remainingVisits: remainingVisits - 1,
                    isLastVisit: true  // Flag to indicate this is the last visit
                };
            }
            
            return {
                canWorkout: true,
                message: `אימון ${visitsInCurrentCard + 1} מתוך 10 בכרטסייה`,
                punchCard: true,
                remainingVisits: remainingVisits - 1
            };
        }
        
        // Regular membership handling for weekly limits
        let allowedWorkoutsPerWeek = 1;
        
        if(member.weeklyTraining === 'פעם בשבוע'){
            allowedWorkoutsPerWeek = 1;
        } else if(member.weeklyTraining === 'שני אימונים בשבוע' || member.weeklyTraining === 'חוג אחד בשבוע (2 כניסות)'){
            allowedWorkoutsPerWeek = 2;
        } else if(member.weeklyTraining === 'שלוש כניסות בשבוע'){
            allowedWorkoutsPerWeek = 3;
        } else if(member.weeklyTraining === 'שני חוגים בשבוע (4 כניסות)'){
            allowedWorkoutsPerWeek = 4;
        } else if(member.weeklyTraining === 'מנוי מלא'){
            allowedWorkoutsPerWeek = 999;
        }

        // Get start of current week (Sunday)
        const today = new Date();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        
        // Count workouts in current week only
        let workoutsThisWeek = 0;
        if (member.allVisits && member.allVisits.length > 0) {
            workoutsThisWeek = member.allVisits.filter(visit => {
                const visitDate = new Date(visit);
                return visitDate >= currentWeekStart;
            }).length;
        }
        
        if (workoutsThisWeek >= allowedWorkoutsPerWeek) {
            const nextWeekStart = new Date(currentWeekStart);
            nextWeekStart.setDate(nextWeekStart.getDate() + 7);
            
            return {
                canWorkout: false,
                message: `הגעת למגבלת האימונים השבועית (${allowedWorkoutsPerWeek} אימונים בשבוע)`,
                nextAvailableDate: formatDate(nextWeekStart)
            };
        }
        
        return {
            canWorkout: true,
            message: `אימון ${workoutsThisWeek + 1} מתוך ${allowedWorkoutsPerWeek} השבוע`
        };
    }

    function formatDate(date) {
        // Format date using Israel timezone (UTC+3)
        const options = { 
            timeZone: 'Asia/Jerusalem',
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        };
        return date.toLocaleDateString('he-IL', options);
    }

    function displayScanResult(member, subscriptionStatus, paymentStatus, workoutLimitCheck) {
        const resultContainer = document.getElementById('scan-result');
        
        // Determine overall status
        const canEnter = subscriptionStatus.valid && paymentStatus && workoutLimitCheck.canWorkout;
        
        let resultHTML = `
            <div class="scan-result ${canEnter ? 'success' : 'error'}">
                <h2>${canEnter ? '✅ כניסה מאושרת' : '❌ כניסה לא מאושרת'}</h2>
                <div class="member-details">
                    <p><strong>שם:</strong> ${member.fullName}</p>
                    <p><strong>טלפון:</strong> ${member.phone}</p>
                    <p><strong>סוג מנוי:</strong> ${member.membershipType}</p>
                    <p><strong>תכנית אימונים:</strong> ${member.weeklyTraining}</p>
                    <p><strong>סטטוס מנוי:</strong> 
                        <span class="${subscriptionStatus.valid ? 'status-valid' : 'status-expired'}">
                            ${subscriptionStatus.message}
                        </span>
                    </p>`;

        // Add warning message if it's the last week
        if (subscriptionStatus.warning) {
            resultHTML += `<p class="warning-message">${subscriptionStatus.warning}</p>`;
        }

        // Add payment status
        resultHTML += `
                    <p><strong>סטטוס תשלום:</strong> 
                        <span class="${paymentStatus ? 'status-paid' : 'status-due'}">
                            ${paymentStatus ? 'מנוי שולם' : 'מנוי לא שולם'}
                        </span>
                    </p>`;
        
        // Display appropriate message for punch card or regular membership
        if (member.weeklyTraining === "כרטסייה של 10 אימונים" && workoutLimitCheck.punchCard) {
            resultHTML += `
                    <p><strong>כרטסייה:</strong> ${workoutLimitCheck.message}</p>
                    <p><strong>נותרו:</strong> ${workoutLimitCheck.remainingVisits} אימונים</p>`;
                
            // Add a hidden data attribute if this is the last visit
            if (workoutLimitCheck.isLastVisit) {
                resultHTML += `<div data-last-punch-card-visit="true" style="display:none;"></div>`;
            }
        } else {
            resultHTML += `
                    <p><strong>אימונים השבוע:</strong> ${workoutLimitCheck.message}</p>`;
        }
        
        resultHTML += `</div>`;

        // Add error details if entry is not allowed
        if (!canEnter) {
            resultHTML += `
                <div class="error-details">
                    ${subscriptionStatus.details ? `<p>${subscriptionStatus.details}</p>` : ''}
                    ${!workoutLimitCheck.canWorkout ? 
                        (workoutLimitCheck.details ? 
                            `<p>${workoutLimitCheck.details}</p>` : 
                            `<p>אימון הבא אפשרי מתאריך: ${workoutLimitCheck.nextAvailableDate}</p>`) : ''}
                </div>`;
        }

        // Add action buttons
        resultHTML += `
                <div class="scan-actions">
                    ${canEnter ? 
                        `<button id="confirm-entry-btn" class="confirm-btn">אשר כניסה</button>
                         <button id="cancel-entry-btn" class="cancel-btn">בטל כניסה</button>` : 
                        `<button id="scan-again-btn" class="scan-again-btn">סרוק שוב</button>`
                    }
                </div>
            </div>`;
        
        resultContainer.innerHTML = resultHTML;
        
        // Add button event listeners
        if (canEnter) {
            document.getElementById('confirm-entry-btn').addEventListener('click', () => {
                confirmEntry(member._id);
            });
            
            document.getElementById('cancel-entry-btn').addEventListener('click', () => {
                cancelEntry();
            });
        } else {
            document.getElementById('scan-again-btn').addEventListener('click', () => {
                resetScanner();
            });
        }
    }

    async function confirmEntry(memberId) {
        try {
            // Updated API endpoint to use member ID
            const response = await fetch(`/api/v1/members/visit/id/${memberId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                // Check if this was the last visit in a punch card
                const resultContainer = document.getElementById('scan-result');
                const isLastPunchCardVisit = resultContainer.querySelector('[data-last-punch-card-visit="true"]');
                
                if (isLastPunchCardVisit) {
                    // This was the 10th visit of a punch card, update the member's status
                    await updateMemberStatus(memberId, 'unpaid', 'inactive');
                    console.log('Updated member status to unpaid/inactive after last punch card visit');
                }
                
                resultContainer.innerHTML = `
                    <div class="scan-result success">
                        <h2>✅ כניסה נרשמה בהצלחה</h2>
                        <button id="scan-again-btn" class="scan-again-btn">סרוק שוב</button>
                    </div>
                `;
                
                document.getElementById('scan-again-btn').addEventListener('click', () => {
                    resetScanner();
                });
            } else {
                const error = await response.json();
                displayScanError(error.detail || 'אירעה שגיאה בעת רישום הכניסה');
            }
        } catch (error) {
            console.error('Error confirming entry:', error);
            displayScanError('אירעה שגיאה בעת רישום הכניסה');
        }
    }

    function displayScanError(message) {
        const resultContainer = document.getElementById('scan-result');
        resultContainer.innerHTML = `
            <div class="scan-result error">
                <h2>❌ שגיאה</h2>
                <p>${message}</p>
                <button id="scan-again-btn" class="scan-again-btn">סרוק שוב</button>
            </div>
        `;
        
        document.getElementById('scan-again-btn').addEventListener('click', () => {
            resetScanner();
        });
    }

    function resetScanner() {
        const resultContainer = document.getElementById('scan-result');
        resultContainer.innerHTML = '';
        
        // Clear the existing scanner first
        html5QrcodeScanner.clear().then(() => {
            // Then create a new scanner instance
            html5QrcodeScanner = new Html5QrcodeScanner(
                "reader",
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },  // Smaller size for mobile
                    rememberLastUsedCamera: true,
                    aspectRatio: 1.0,
                    formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true  // Better for mobile
                    }
                }
            );
            
            // Render the new scanner
            html5QrcodeScanner.render(onScanSuccess, onScanError);
        }).catch((err) => {
            console.error("Failed to clear scanner:", err);
        });
    }

    // Add a new function to handle cancellation
    function cancelEntry() {
        const resultContainer = document.getElementById('scan-result');
        resultContainer.innerHTML = `
            <div class="scan-result info">
                <h2>ℹ️ כניסה בוטלה</h2>
                <p>הכניסה בוטלה ולא נרשמה במערכת.</p>
                <button id="scan-again-btn" class="scan-again-btn">סרוק שוב</button>
            </div>
        `;
        
        document.getElementById('scan-again-btn').addEventListener('click', () => {
            resetScanner();
        });
    }

    // Add this function before rendering the scanner
    async function startScanner() {
        try {
            // Get available cameras
            const devices = await Html5Qrcode.getCameras();
            
            if (devices && devices.length) {
                // On mobile, prefer the back camera
                let cameraId = devices[0].id;
                
                // Try to find back camera
                const backCamera = devices.find(camera => 
                    camera.label.toLowerCase().includes('back') || 
                    camera.label.toLowerCase().includes('rear')
                );
                
                if (backCamera) {
                    cameraId = backCamera.id;
                }
                
                // Initialize scanner with specific camera
                html5QrcodeScanner = new Html5QrcodeScanner(
                    "reader",
                    { 
                        fps: 10, 
                        qrbox: { width: 250, height: 250 },
                        rememberLastUsedCamera: true,
                        defaultDeviceId: cameraId,
                        aspectRatio: 1.0,
                        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
                    }
                );
                
                // Render the scanner
                html5QrcodeScanner.render(onScanSuccess, onScanError);
                
                console.log("Scanner started with camera:", cameraId);
            } else {
                console.error("No cameras found");
                displayScanError("לא נמצאו מצלמות במכשיר");
            }
        } catch (error) {
            console.error("Error starting scanner:", error);
            displayScanError("שגיאה בהפעלת הסורק: " + error.message);
        }
    }

    // Replace the direct render call with startScanner()
    startScanner();

    // Add cleanup on page unload
    window.addEventListener('beforeunload', () => {
        html5QrcodeScanner.clear();
    });

    // Add this new function to update member status
    async function updateMemberStatus(memberId, paymentStatus, membershipStatus) {
        try {
            console.log(`Updating member ${memberId} status to: payment=${paymentStatus}, membership=${membershipStatus}`);
            
            const response = await fetch(`/api/v1/members/id/${memberId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentStatus: paymentStatus,
                    membershipStatus: membershipStatus
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to update member status:', errorData);
            } else {
                console.log('Member status updated successfully');
            }
        } catch (error) {
            console.error('Error updating member status:', error);
        }
    }
}); 