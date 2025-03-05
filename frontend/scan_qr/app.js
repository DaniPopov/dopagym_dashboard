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
        resultContainer.innerHTML = '<p>מעבד את הנתונים...</p>';
        
        // Call API to process the scan
        processScan(decodedText);
    }

    async function processScan(phoneNumber) {
        try {
            console.log("this is the phone number: ", phoneNumber);
            const response = await fetch(`/api/v1/scan/scan-qr/${phoneNumber}`);
            console.log("this is the response: ", response);
            const data = await response.json();
            console.log("this is the data: ", data);
            
            if (!response.ok) {
                displayScanError(data.detail || 'מתאמן לא נמצא');
                return;
            }
            
            // Check subscription and payment status
            const subscriptionStatus = checkSubscriptionStatus(data);
            const paymentStatus = data.paymentStatus === 'paid';
            
            // Check weekly workout limit
            const workoutLimitCheck = checkWorkoutLimit(data);
            
            // Display the result
            displayScanResult(data, subscriptionStatus, paymentStatus, workoutLimitCheck);
            
        } catch (error) {
            console.error('Error processing scan:', error);
            displayScanError('אירעה שגיאה בעת עיבוד הסריקה');
        }
    }

    function checkSubscriptionStatus(member) {
        // Check if account is frozen
        if (member.accountStatus === 'frozen') {
            return {
                valid: false,
                message: 'המנוי מוקפא'
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
        if (member.subscriptionvalid) {
            const subscriptionDate = new Date(member.subscriptionvalid);
            const today = new Date();
            
            if (subscriptionDate > today) {
                return {
                    valid: true,
                    message: 'מנוי בתוקף'
                };
            } else {
                return {
                    valid: false,
                    message: 'מנוי פג תוקף'
                };
            }
        }
        
        return {
            valid: false,
            message: 'סטטוס מנוי לא ידוע'
        };
    }

    function checkWorkoutLimit(member) {
        // Get allowed workouts per week based on membership type
        let allowedWorkoutsPerWeek = 1; // Default
        
        if (member.weeklyTraining.includes('250')) {
            allowedWorkoutsPerWeek = 1;
        } else if (member.weeklyTraining.includes('350')) {
            allowedWorkoutsPerWeek = 2;
        } else if (member.weeklyTraining.includes('450')) {
            allowedWorkoutsPerWeek = 3;
        }
        
        // Count workouts in the current week
        const today = new Date();
        const currentWeekStart = new Date(today);
        const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
        
        // Set to the beginning of the week (Sunday)
        currentWeekStart.setDate(today.getDate() - dayOfWeek);
        currentWeekStart.setHours(0, 0, 0, 0);
        
        // Find the date of the last workout that counts as the start of the period
        // For example, if they came on Friday, they can't come again until next Friday
        let lastWorkoutDate = null;
        let workoutsThisWeek = 0;
        
        if (member.allVisits && member.allVisits.length > 0) {
            // Sort visits in descending order (newest first)
            const sortedVisits = [...member.allVisits].sort((a, b) => new Date(b) - new Date(a));
            
            // Count workouts in the current week
            workoutsThisWeek = sortedVisits.filter(visit => {
                const visitDate = new Date(visit);
                return visitDate >= currentWeekStart;
            }).length;
            
            // Get the date of the first workout in the current period
            if (workoutsThisWeek > 0) {
                // Find the oldest visit in the current week
                const oldestVisitThisWeek = sortedVisits
                    .filter(visit => new Date(visit) >= currentWeekStart)
                    .pop();
                    
                if (oldestVisitThisWeek) {
                    lastWorkoutDate = new Date(oldestVisitThisWeek);
                }
            }
        }
        
        // Check if member has reached their weekly limit
        if (workoutsThisWeek >= allowedWorkoutsPerWeek) {
            // Calculate when they can come back
            let nextAvailableDate = null;
            if (lastWorkoutDate) {
                nextAvailableDate = new Date(lastWorkoutDate);
                nextAvailableDate.setDate(nextAvailableDate.getDate() + 7);
            }
            
            return {
                canWorkout: false,
                message: `הגעת למגבלת האימונים השבועית (${allowedWorkoutsPerWeek} אימונים בשבוע)`,
                workoutsThisWeek: workoutsThisWeek,
                nextAvailableDate: nextAvailableDate ? formatDate(nextAvailableDate) : 'לא ידוע'
            };
        }
        
        return {
            canWorkout: true,
            message: `אימון ${workoutsThisWeek + 1} מתוך ${allowedWorkoutsPerWeek} השבוע`,
            workoutsThisWeek: workoutsThisWeek
        };
    }

    function formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
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
                    <p><strong>סטטוס מנוי:</strong> <span class="${subscriptionStatus.valid ? 'status-valid' : 'status-expired'}">${subscriptionStatus.message}</span></p>
                    <p><strong>סטטוס תשלום:</strong> <span class="${paymentStatus ? 'status-paid' : 'status-due'}">${paymentStatus ? 'מנוי שולם' : 'מנוי לא שולם'}</span></p>
                    <p><strong>אימונים השבוע:</strong> ${workoutLimitCheck.workoutsThisWeek} מתוך ${member.weeklyTraining.includes('250') ? '1' : member.weeklyTraining.includes('350') ? '2' : '3'}</p>
        `;
        
        if (!workoutLimitCheck.canWorkout) {
            resultHTML += `
                    <p><strong>הערה:</strong> ${workoutLimitCheck.message}</p>
                    <p><strong>אימון הבא אפשרי:</strong> ${workoutLimitCheck.nextAvailableDate}</p>
            `;
        }
        
        resultHTML += `
                </div>
                <div class="scan-actions">
                    ${canEnter ? 
                        `<button id="confirm-entry-btn" class="confirm-btn">אשר כניסה</button>
                         <button id="cancel-entry-btn" class="cancel-btn">בטל כניסה</button>` : 
                        `<button id="scan-again-btn" class="scan-again-btn">סרוק שוב</button>`
                    }
                </div>
            </div>
        `;
        
        resultContainer.innerHTML = resultHTML;
        
        // Add event listeners to buttons
        if (canEnter) {
            document.getElementById('confirm-entry-btn').addEventListener('click', () => {
                confirmEntry(member.phone);
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

    async function confirmEntry(phoneNumber) {
        try {
            const response = await fetch(`/api/v1/members/record-visit/${phoneNumber}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const resultContainer = document.getElementById('scan-result');
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
        
        // Reinitialize the scanner
        html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader", { fps: 10, qrbox: 250 }
        );
        html5QrcodeScanner.render(onScanSuccess, onScanError);
    }

    function onScanError(error) {
        // Check if the error is related to the QR code scanning
        console.log(`QR error: ${error}`);
        
        // Don't try to update the UI for every scan error
        // Only handle critical errors that require user attention
        if (error.toString().includes("TypeError: Cannot set properties of null")) {
            // Create the scan-result element if it doesn't exist
            let resultContainer = document.getElementById('scan-result');
            if (!resultContainer) {
                resultContainer = document.createElement('div');
                resultContainer.id = 'scan-result';
                document.querySelector('.main-content').appendChild(resultContainer);
            }
            
            resultContainer.innerHTML = `
                <div class="scan-result error">
                    <h2>❌ שגיאה</h2>
                    <p>אירעה שגיאה בעת סריקת הקוד. נא לנסות שוב.</p>
                    <button id="scan-again-btn" class="scan-again-btn">סרוק שוב</button>
                </div>
            `;
            
            document.getElementById('scan-again-btn').addEventListener('click', () => {
                resetScanner();
            });
        }
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

    // Render the scanner
    html5QrcodeScanner.render(onScanSuccess, onScanError);
}); 