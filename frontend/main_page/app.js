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
    const batYamBtn = document.getElementById('bat-yam-btn');

    homeBtn.addEventListener('click', () => window.location.href = '/main_page');
    scanBarcodeBtn.addEventListener('click', () => window.location.href = '/scan_qr');
    registerBtn.addEventListener('click', () => window.location.href = '/enter_member');
    allTraineesBtn.addEventListener('click', () => window.location.href = '/all_members');
    batYamBtn.addEventListener('click', () => window.location.href = '/bat_yam');
}

async function loadDashboardData() {
    try {
        // Fetch members
        const response = await fetch('/api/v1/members/');
        const members = await response.json();
        window._dashboardMembers = members; // Store globally for modal use

        updateStats(members);
        updateTodayEntriesTable(members);
        createClassDistributionChart(members);
        createWeeklyEntriesChart(members);
        updateExpiringMembershipsTable(members);
        updateFrozenMembersTable(members);

        // Fetch weekly entries count
        const weeklyRes = await fetch('/api/v1/members/weekly_entries');
        const weeklyData = await weeklyRes.json();
        document.getElementById('weekly-entries-count').textContent = weeklyData.weekly_entries || 0;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('weekly-entries-count').textContent = 'שגיאה';
    }
}

// Modal logic for editing members
function showEditMembersModal(members, title = 'עריכת מתאמנים') {
    const modal = document.getElementById('edit-members-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalList = document.getElementById('modal-members-list');
    modalTitle.textContent = title;
    modalList.innerHTML = '';
    if (!members.length) {
        modalList.innerHTML = '<div style="padding:20px;">לא נמצאו מתאמנים</div>';
    } else {
        // Table like all_members
        const table = document.createElement('table');
        table.className = 'modal-members-table';
        table.innerHTML = `<thead><tr><th>שם</th><th>טלפון</th><th>מייל</th><th>סוג מנוי</th><th>סטטוס</th><th>פעולה</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        members.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${member.fullName || '-'}</td>
                <td>${member.phone || '-'}</td>
                <td>${member.email || '-'}</td>
                <td>${member.membershipType || '-'}</td>
                <td>${member.membershipStatus || '-'}</td>
                <td><button class="blue-btn" onclick="window.location.href='/member_profile?id=${member._id}'">צפה בפרופיל</button></td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        modalList.appendChild(table);
    }
    modal.style.display = 'block';
}

document.getElementById('close-modal-btn').onclick = () => {
    document.getElementById('edit-members-modal').style.display = 'none';
};
window.onclick = function(event) {
    const modal = document.getElementById('edit-members-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

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

// New: Update today's entries table
function updateTodayEntriesTable(members) {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = members.filter(member => 
        member.lastVisit && member.lastVisit.startsWith(today)
    );
    const tbody = document.querySelector('#today-entries-table tbody');
    tbody.innerHTML = '';
    if (todayEntries.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = 'אין כניסות היום';
        cell.style.textAlign = 'center';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    todayEntries.forEach(member => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = member.fullName || member.name || '-';
        const timeCell = document.createElement('td');
        if (member.lastVisit) {
            const time = member.lastVisit.split('T')[1]?.slice(0,5) || '';
            timeCell.textContent = time;
        } else {
            timeCell.textContent = '-';
        }
        const phoneCell = document.createElement('td');
        phoneCell.textContent = member.phone || '-';
        const typeCell = document.createElement('td');
        typeCell.textContent = member.membershipType || '-';
        const statusCell = document.createElement('td');
        statusCell.textContent = member.membershipStatus || '-';
        row.appendChild(nameCell);
        row.appendChild(timeCell);
        row.appendChild(phoneCell);
        row.appendChild(typeCell);
        row.appendChild(statusCell);
        tbody.appendChild(row);
    });
}


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
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(classTypes),
                datasets: [{
                    data: Object.values(classTypes),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FFA07A', '#8FBC8F'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        rtl: true,
                        labels: { font: { size: 15 }, boxWidth: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                onClick: function(evt, elements) {
                    if (elements && elements.length > 0) {
                        const idx = elements[0].index;
                        const label = chart.data.labels[idx];
                        // Filter members by this type
                        const filtered = window._dashboardMembers.filter(m => m.membershipType === label);
                        showEditMembersModal(filtered, `מתאמנים מסוג: ${label}`);
                    }
                }
            }
        });
        canvas.chart = chart;
        // Ensure container fits the chart
        canvas.parentElement.style.height = '250px';
        canvas.style.height = '250px';
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
                <td><button class="blue-btn" onclick="window.location.href='/member_profile?id=${member._id}'">צפה בפרופיל</button></td>
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