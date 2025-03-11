// No need to duplicate the auth check since it's in auth.js now
document.addEventListener('DOMContentLoaded', async function() {
    // Sidebar Navigation
    setupNavigation();
    
    // Load and display all data
    await loadDashboardData();
});

function setupNavigation() {
    const homeBtn = document.getElementById('home-btn');
    const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
    const registerBtn = document.getElementById('register-btn');
    const allTraineesBtn = document.getElementById('all-trainees-btn');

    homeBtn.addEventListener('click', () => window.location.href = '/main_page');
    scanBarcodeBtn.addEventListener('click', () => window.location.href = '/scan_qr');
    registerBtn.addEventListener('click', () => window.location.href = '/enter_member');
    allTraineesBtn.addEventListener('click', () => window.location.href = '/all_members');
}

async function loadDashboardData() {
    try {
        const response = await fetch('/api/v1/members/');
        const members = await response.json();
        
        updateStats(members);
        createClassDistributionChart(members);
        createWeeklyEntriesChart(members);
        updateExpiringMembershipsTable(members);
        updateFrozenMembersTable(members);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateStats(members) {
    const today = new Date().toISOString().split('T')[0];
    
    // Count today's entries
    const todayEntries = members.filter(member => 
        member.lastVisit && member.lastVisit.startsWith(today)
    ).length;
    
    // Count active members
    const activeMembers = members.filter(member => 
        member.membershipStatus === 'active'
    ).length;
    
    document.getElementById('today-entries').textContent = todayEntries;
    document.getElementById('total-members').textContent = members.length;
    document.getElementById('active-members').textContent = activeMembers;
}

function createClassDistributionChart(members) {
    try {
        const canvas = document.getElementById('class-distribution');
        if (!canvas) {
            console.error('Cannot find class-distribution canvas');
            return;
        }

        // Clear any existing chart
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        const classTypes = {};
        members.forEach(member => {
            if (member.membershipType) {
                classTypes[member.membershipType] = (classTypes[member.membershipType] || 0) + 1;
            }
        });

        const ctx = canvas.getContext('2d');
        canvas.chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(classTypes),
                datasets: [{
                    data: Object.values(classTypes),
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        rtl: true,
                        labels: {
                            font: {
                                size: 20 // Reduced font size
                            },
                            boxWidth: 15 // Smaller legend boxes
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating class distribution chart:', error);
    }
}

function createWeeklyEntriesChart(members) {
    try {
        const canvas = document.getElementById('weekly-entries');
        if (!canvas) {
            console.error('Cannot find weekly-entries canvas');
            return;
        }

        // Clear any existing chart
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
        const entriesPerDay = new Array(6).fill(0);
        
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());

        members.forEach(member => {
            if (member.allVisits) {
                member.allVisits.forEach(visit => {
                    const visitDate = new Date(visit);
                    if (visitDate >= weekStart && visitDate.getDay() < 6) {
                        entriesPerDay[visitDate.getDay()]++;
                    }
                });
            }
        });

        const ctx = canvas.getContext('2d');
        canvas.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'כניסות',
                    data: entriesPerDay,
                    backgroundColor: '#36A2EB'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                size: 11 // Reduced font size
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11 // Reduced font size
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        rtl: true,
                        labels: {
                            font: {
                                size: 12 // Reduced font size
                            },
                            boxWidth: 15 // Smaller legend boxes
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating weekly entries chart:', error);
    }
}

function updateExpiringMembershipsTable(members) {
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    const today = new Date();
    
    // Get members with expiring memberships or unpaid status
    const expiringMembers = members.filter(member => {
        // Skip unlimited memberships
        if (member.subscriptionvalid === '9999-12-12') return false;
        
        // Include members with unpaid payment status
        if (member.paymentStatus === 'unpaid') return true;
        
        // Include members with expired or soon-to-expire memberships
        const expiryDate = new Date(member.subscriptionvalid);
        return expiryDate <= tenDaysFromNow;
    });

    const tbody = document.querySelector('#expiring-memberships tbody');
    tbody.innerHTML = expiringMembers.map(member => {
        const expiryDate = new Date(member.subscriptionvalid);
        const status = member.paymentStatus === 'unpaid' ? 'לא שולם' : 
                      (expiryDate < today ? 'פג תוקף' : 'עומד לפוג');
        
        return `
            <tr>
                <td>${member.fullName}</td>
                <td>${member.phone}</td>
                <td>${new Date(member.subscriptionvalid).toLocaleDateString('he-IL')}</td>
                <td>${member.membershipType}</td>
                <td><span class="${status === 'לא שולם' ? 'status-unpaid' : 'status-expiring'}">${status}</span></td>
            </tr>
        `;
    }).join('');
}

function updateFrozenMembersTable(members) {
    // Get frozen members
    const frozenMembers = members.filter(member => 
        member.membershipStatus === 'frozen'
    );

    const tbody = document.querySelector('#frozen-members tbody');
    tbody.innerHTML = frozenMembers.map(member => {
        return `
            <tr>
                <td>${member.fullName}</td>
                <td>${member.phone}</td>
                <td>${member.lastVisit ? new Date(member.lastVisit).toLocaleDateString('he-IL') : 'לא זמין'}</td>
                <td>${member.membershipType || 'לא זמין'}</td>
            </tr>
        `;
    }).join('');
}

function updateInactiveMembersTable(members) {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    const inactiveMembers = members.filter(member => {
        const lastVisit = new Date(member.lastVisit);
        return lastVisit < tenDaysAgo;
    });

    const tbody = document.querySelector('#inactive-members tbody');
    tbody.innerHTML = inactiveMembers.map(member => {
        const lastVisit = new Date(member.lastVisit);
        const daysSinceVisit = Math.floor((new Date() - lastVisit) / (1000 * 60 * 60 * 24));
        
        return `
            <tr>
                <td>${member.fullName}</td>
                <td>${member.phone}</td>
                <td>${lastVisit.toLocaleDateString('he-IL')}</td>
                <td>${daysSinceVisit}</td>
            </tr>
        `;
    }).join('');
}