// Session and Auth
let sessionId = localStorage.getItem('sessionId');
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');
let assignments = JSON.parse(localStorage.getItem('assignments') || '{"ct":[],"st":[]}');

// Check authentication
if (!sessionId || !currentUser.id) {
    window.location.href = '/login.html';
}

// Redirect admin to admin dashboard
if (currentUser.role === 'admin') {
    window.location.href = '/admin-dashboard.html';
}

// DOM Elements
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const currentDate = document.getElementById('currentDate');
const assignmentsSidebar = document.getElementById('assignmentsSidebar');
const ctSection = document.getElementById('ctSection');
const stSection = document.getElementById('stSection');
const ctContent = document.getElementById('ctContent');
const stContent = document.getElementById('stContent');

// Set user info
userName.textContent = currentUser.name || 'Teacher';
currentDate.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// Current selected classes
let selectedCTClass = null;
let selectedSTClass = null;

// ==========================================
// API HELPER
// ==========================================

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId,
                ...options.headers
            }
        });

        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login.html';
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('API call error:', error);
        return null;
    }
}

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

async function initDashboard() {
    console.log('Initializing dashboard...');
    console.log('CT assignments:', assignments.ct);
    console.log('ST assignments:', assignments.st);

    // Update sidebar
    updateSidebar();

    // Initialize CT section
    if (assignments.ct && assignments.ct.length > 0) {
        selectedCTClass = assignments.ct[0].class_name;
        await initCTSection();
    } else {
        ctContent.innerHTML = `
            <div class="no-assignment-notice">
                <h3>📋 No CT Assignment</h3>
                <p>You are not assigned as Class Teacher of any class yet.</p>
                <p style="color: #999; font-size: 14px;">Contact your administrator to get assigned.</p>
            </div>
        `;
    }

    // Initialize ST section
    if (assignments.st && assignments.st.length > 0) {
        selectedSTClass = assignments.st[0].class_name;
        await initSTSection();
    } else {
        stContent.innerHTML = `
            <div class="no-assignment-notice">
                <h3>📋 No ST Assignment</h3>
                <p>You are not assigned as Subject Teacher of any class yet.</p>
                <p style="color: #999; font-size: 14px;">You can be ST of multiple classes.</p>
            </div>
        `;
    }
}

// ==========================================
// UPDATE SIDEBAR
// ==========================================

function updateSidebar() {
    let html = '';

    if (assignments.ct && assignments.ct.length > 0) {
        html += '<div style="margin-bottom: 15px;">';
        html += '<strong style="color: #4CAF50; font-size: 12px;">CT of:</strong><br>';
        assignments.ct.forEach(a => {
            html += `<span style="color: #333; font-size: 14px;">• ${a.class_name}</span><br>`;
        });
        html += '</div>';
    }

    if (assignments.st && assignments.st.length > 0) {
        html += '<div>';
        html += '<strong style="color: #2196F3; font-size: 12px;">ST of:</strong><br>';
        assignments.st.forEach(a => {
            html += `<span style="color: #333; font-size: 14px;">• ${a.class_name}</span><br>`;
        });
        html += '</div>';
    }

    if (!html) {
        html = '<p style="color: #999; font-size: 13px;">No assignments yet</p>';
    }

    assignmentsSidebar.innerHTML = html;
}

// ==========================================
// CLASS TEACHER SECTION
// ==========================================

async function initCTSection() {
    let html = '';

    // Class selector (if multiple CT classes)
    if (assignments.ct.length > 1) {
        html += `
            <div class="class-selector">
                <label>Select Class:</label>
                <select id="ctClassSelect" onchange="handleCTClassChange(this.value)">
                    ${assignments.ct.map(a => 
                        `<option value="${a.class_name}" ${a.class_name === selectedCTClass ? 'selected' : ''}>
                            ${a.class_name}
                        </option>`
                    ).join('')}
                </select>
            </div>
        `;
    } else {
        html += `<h3 style="margin: 0 0 15px 0; color: #4CAF50;">Class: ${selectedCTClass}</h3>`;
    }

    // Stats
    html += '<div id="ctStats"><p class="loading">Loading stats...</p></div>';

    // Attendance controls
    html += `
        <div class="attendance-controls">
            <h4 style="margin: 0 0 10px 0;">Mark Attendance</h4>
            <div class="card-input-group">
                <input type="text" id="ctCardInput" placeholder="Scan or enter RFID card ID" autocomplete="off">
                <button onclick="markCTAttendance()">✓ Mark Present</button>
            </div>
        </div>
    `;

    // Student lists
    html += `
        <div class="student-lists">
            <div class="student-list-box">
                <h3>✓ Present Today (<span id="ctPresentCount">0</span>)</h3>
                <div id="ctPresentList"><p class="empty-list">No students marked present yet</p></div>
            </div>
            <div class="student-list-box">
                <h3>✗ Absent (<span id="ctAbsentCount">0</span>)</h3>
                <div id="ctAbsentList"><p class="empty-list">Loading...</p></div>
            </div>
        </div>
    `;

    // Quick actions
    html += `
        <div class="quick-actions">
            <button class="btn-add-student" onclick="showAddStudentModal()">+ Add Student</button>
            <button class="btn-view-history" onclick="viewCTHistory()">📊 View History</button>
        </div>
    `;

    ctContent.innerHTML = html;

    // Load data
    await loadCTData();

    // Auto-focus card input
    document.getElementById('ctCardInput')?.focus();

    // Listen for Enter key
    document.getElementById('ctCardInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            markCTAttendance();
        }
    });
}

async function loadCTData() {
    // Load stats and attendance
    const result = await apiCall(`/attendance/class/${selectedCTClass}/today`);

    if (result && result.success) {
        // Update stats
        const stats = result.data.stats;
        document.getElementById('ctStats').innerHTML = `
            <div class="stats-mini-grid">
                <div class="stat-mini-card">
                    <h4>Total</h4>
                    <p>${stats.total}</p>
                </div>
                <div class="stat-mini-card" style="background: #e8f5e9;">
                    <h4>Present</h4>
                    <p style="color: #4CAF50;">${stats.present}</p>
                </div>
                <div class="stat-mini-card" style="background: #ffebee;">
                    <h4>Absent</h4>
                    <p style="color: #f44336;">${stats.absent}</p>
                </div>
            </div>
        `;

        // Update counts
        document.getElementById('ctPresentCount').textContent = stats.present;
        document.getElementById('ctAbsentCount').textContent = stats.absent;

        // Update present list
        const presentList = document.getElementById('ctPresentList');
        if (result.data.records && result.data.records.length > 0) {
            presentList.innerHTML = result.data.records.map(r => `
                <div class="student-item present">
                    <div>
                        <div class="student-name">${r.student_name}</div>
                        <div class="student-roll">Roll: ${r.student_id || 'N/A'}</div>
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        ${new Date(r.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            `).join('');
        } else {
            presentList.innerHTML = '<p class="empty-list">No students marked present yet</p>';
        }

        // Update absent list
        const absentList = document.getElementById('ctAbsentList');
        if (result.data.absentStudents && result.data.absentStudents.length > 0) {
            absentList.innerHTML = result.data.absentStudents.map(s => `
                <div class="student-item absent">
                    <div>
                        <div class="student-name">${s.name}</div>
                        <div class="student-roll">Roll: ${s.roll_number || 'N/A'}</div>
                    </div>
                </div>
            `).join('');
        } else {
            absentList.innerHTML = '<p class="empty-list">All students present! 🎉</p>';
        }
    }
}

async function markCTAttendance() {
    const cardInput = document.getElementById('ctCardInput');
    const cardId = cardInput.value.trim();

    if (!cardId) {
        alert('Please enter a card ID');
        return;
    }

    const result = await apiCall('/attendance', {
        method: 'POST',
        body: JSON.stringify({
            cardId: cardId,
            time: new Date().toISOString()
        })
    });

    if (result && result.success) {
        cardInput.value = '';
        cardInput.focus();
        
        // Show success
        alert(`✓ Attendance marked for ${result.data.student.name}`);
        
        // Reload data
        await loadCTData();
    } else {
        alert(result?.message || 'Failed to mark attendance');
    }
}

function handleCTClassChange(className) {
    selectedCTClass = className;
    initCTSection();
}

function viewCTHistory() {
    alert('History view coming soon! Will show attendance records for ' + selectedCTClass);
}

function showAddStudentModal() {
    const name = prompt('Enter student name:');
    if (!name) return;
    
    const cardId = prompt('Enter student card ID:');
    if (!cardId) return;
    
    const rollNumber = prompt('Enter roll number (optional):');
    
    apiCall('/students/register', {
        method: 'POST',
        body: JSON.stringify({
            name: name,
            cardId: cardId,
            studentClass: selectedCTClass,
            rollNumber: rollNumber || null
        })
    }).then(result => {
        if (result && result.success) {
            alert('Student added successfully!');
            loadCTData();
        } else {
            alert(result?.message || 'Failed to add student');
        }
    });
}

// ==========================================
// SUBJECT TEACHER SECTION
// ==========================================

async function initSTSection() {
    let html = '';

    // Class selector
    html += `
        <div class="class-selector">
            <label>Select Class:</label>
            <select id="stClassSelect" onchange="handleSTClassChange(this.value)">
                ${assignments.st.map(a => 
                    `<option value="${a.class_name}" ${a.class_name === selectedSTClass ? 'selected' : ''}>
                        ${a.class_name}
                    </option>`
                ).join('')}
            </select>
        </div>
    `;

    // Stats only (no names, no controls)
    html += '<div id="stStats"><p class="loading">Loading stats...</p></div>';

    // Info notice
    html += `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <strong>ℹ️ Subject Teacher Access:</strong>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                As a Subject Teacher, you can view attendance statistics but cannot see individual student names or mark attendance.
            </p>
        </div>
    `;

    stContent.innerHTML = html;

    // Load data
    await loadSTData();
}

async function loadSTData() {
    const result = await apiCall(`/attendance/class/${selectedSTClass}/today`);

    if (result && result.success) {
        const stats = result.data.stats;
        
        document.getElementById('stStats').innerHTML = `
            <div class="stats-mini-grid">
                <div class="stat-mini-card">
                    <h4>Total Students</h4>
                    <p>${stats.total}</p>
                </div>
                <div class="stat-mini-card" style="background: #e8f5e9;">
                    <h4>Present Today</h4>
                    <p style="color: #4CAF50;">${stats.present}</p>
                </div>
                <div class="stat-mini-card" style="background: #ffebee;">
                    <h4>Absent Today</h4>
                    <p style="color: #f44336;">${stats.absent}</p>
                </div>
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <div style="font-size: 48px; font-weight: bold; color: #2196F3;">
                    ${((stats.present / stats.total) * 100).toFixed(1)}%
                </div>
                <div style="color: #666; margin-top: 5px;">Attendance Rate</div>
            </div>
        `;
    }
}

function handleSTClassChange(className) {
    selectedSTClass = className;
    loadSTData();
}

// ==========================================
// LOGOUT
// ==========================================

logoutBtn.addEventListener('click', async () => {
    await apiCall('/auth/logout', { method: 'POST' });
    localStorage.clear();
    window.location.href = '/login.html';
});

// ==========================================
// INITIALIZE
// ==========================================

initDashboard();