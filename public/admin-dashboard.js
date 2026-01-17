// Session and Auth
let sessionId = localStorage.getItem('sessionId');
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');

// Check authentication
if (!sessionId || currentUser.role !== 'admin') {
    window.location.href = '/login.html';
}

// DOM Elements
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const currentDate = document.getElementById('currentDate');
const pageTitle = document.getElementById('pageTitle');

// Tab elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

// Modal elements
const addTeacherModal = document.getElementById('addTeacherModal');
const assignClassModal = document.getElementById('assignClassModal');
const addStudentModal = document.getElementById('addStudentModal');

const addTeacherBtn = document.getElementById('addTeacherBtn');
const assignClassBtn = document.getElementById('assignClassBtn');
const addStudentBtn = document.getElementById('addStudentBtn');
const refreshAttendanceBtn = document.getElementById('refreshAttendanceBtn');

const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-btn');

// Set user name and date
userName.textContent = currentUser.name || 'Admin';
currentDate.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// ==========================================
// TAB NAVIGATION
// ==========================================

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = item.dataset.tab;
        
        // Remove active class from all
        navItems.forEach(nav => nav.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked
        item.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Update page title
        const titles = {
            'teachers': 'Manage Teachers',
            'assignments': 'Class Assignments',
            'students': 'Manage Students',
            'attendance': 'Attendance Records'
        };
        pageTitle.textContent = titles[tabName] || 'Dashboard';
        
        // Load data for the tab
        loadTabData(tabName);
    });
});

// ==========================================
// API HELPER FUNCTIONS
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
            // Session expired
            localStorage.removeItem('sessionId');
            localStorage.removeItem('user');
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
// LOAD TAB DATA
// ==========================================

function loadTabData(tabName) {
    switch(tabName) {
        case 'teachers':
            loadTeachers();
            break;
        case 'assignments':
            loadAssignments();
            break;
        case 'students':
            loadStudents();
            break;
        case 'attendance':
            loadAttendance();
            break;
    }
}

// ==========================================
// TEACHERS MANAGEMENT
// ==========================================

async function loadTeachers() {
    const teachersList = document.getElementById('teachersList');
    teachersList.innerHTML = '<p class="loading">Loading teachers...</p>';

    const result = await apiCall('/admin/teachers');

    if (!result || !result.success) {
        teachersList.innerHTML = '<p class="empty-state">Failed to load teachers</p>';
        return;
    }

    if (result.data.length === 0) {
        teachersList.innerHTML = '<p class="empty-state">No teachers found</p>';
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>CT of</th>
                    <th>ST of</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    result.data.forEach(teacher => {
        // Skip admin from teacher list
        if (teacher.role === 'admin') return;
        
        // Separate CT and ST assignments
        const ctClasses = teacher.classes.filter(c => c.is_class_teacher).map(c => c.class_name);
        const stClasses = teacher.classes.filter(c => !c.is_class_teacher).map(c => c.class_name);
        
        const ctDisplay = ctClasses.length > 0 ? 
            `<strong style="color: #4caf50;">${ctClasses.join(', ')}</strong>` : 
            '<span style="color: #999;">Not assigned</span>';
        
        const stDisplay = stClasses.length > 0 ? 
            `<span style="color: #2196f3;">${stClasses.join(', ')}</span>` : 
            '<span style="color: #999;">Not assigned</span>';

        html += `
            <tr>
                <td><strong>${teacher.name}</strong></td>
                <td>${teacher.username}</td>
                <td>${teacher.email}</td>
                <td>${ctDisplay}</td>
                <td>${stDisplay}</td>
                <td>
                    <button class="btn-danger" onclick="deleteTeacher(${teacher.id})">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    teachersList.innerHTML = html;
}

async function deleteTeacher(teacherId) {
    if (!confirm('Are you sure you want to delete this teacher? All their class assignments will be removed.')) {
        return;
    }

    const result = await apiCall(`/admin/teachers/${teacherId}`, {
        method: 'DELETE'
    });

    if (result && result.success) {
        alert('Teacher deleted successfully');
        loadTeachers();
    } else {
        alert('Failed to delete teacher');
    }
}

// ==========================================
// CLASS ASSIGNMENTS - ENHANCED
// ==========================================

async function loadAssignments() {
    const assignmentsList = document.getElementById('assignmentsList');
    assignmentsList.innerHTML = '<p class="loading">Loading assignments...</p>';

    const result = await apiCall('/admin/class-assignments');

    if (!result || !result.success) {
        assignmentsList.innerHTML = '<p class="empty-state">Failed to load assignments</p>';
        return;
    }

    if (result.data.length === 0) {
        assignmentsList.innerHTML = '<p class="empty-state">No class assignments yet</p>';
        return;
    }

    // Group by class name for better visualization
    const groupedByClass = {};
    result.data.forEach(assignment => {
        if (!groupedByClass[assignment.class_name]) {
            groupedByClass[assignment.class_name] = {
                ct: null,
                sts: []
            };
        }
        
        if (assignment.is_class_teacher) {
            groupedByClass[assignment.class_name].ct = assignment;
        } else {
            groupedByClass[assignment.class_name].sts.push(assignment);
        }
    });

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Class</th>
                    <th>Class Teacher (CT)</th>
                    <th>Subject Teachers (ST)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.keys(groupedByClass).sort().forEach(className => {
        const data = groupedByClass[className];
        const ctName = data.ct ? data.ct.teacher_name : '<span style="color: #f44336;">⚠️ No CT assigned</span>';
        const stNames = data.sts.length > 0 ? 
            data.sts.map(st => st.teacher_name).join(', ') : 
            '<span style="color: #999;">None</span>';
        
        html += `
            <tr>
                <td><strong>${className}</strong></td>
                <td>${ctName}${data.ct ? ` <button class="btn-sm btn-danger" onclick="removeAssignment(${data.ct.teacher_id}, '${className}')">✕</button>` : ''}</td>
                <td>
                    ${data.sts.map(st => `
                        ${st.teacher_name} <button class="btn-sm btn-danger" onclick="removeAssignment(${st.teacher_id}, '${className}')">✕</button>
                    `).join('<br>')}
                    ${data.sts.length === 0 ? stNames : ''}
                </td>
                <td>
                    <button class="btn-secondary" onclick="quickAssignST('${className}')">+ Add ST</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
            <strong>💡 Quick Reference:</strong>
            <ul style="margin: 10px 0 0 20px;">
                <li><strong>CT (Class Teacher):</strong> Maximum 1 per class, can mark attendance</li>
                <li><strong>ST (Subject Teacher):</strong> Multiple allowed per class, view-only access</li>
                <li>Each teacher can be CT of 1 class and ST of multiple classes</li>
            </ul>
        </div>
    `;

    assignmentsList.innerHTML = html;
}

async function removeAssignment(teacherId, className) {
    if (!confirm(`Remove teacher from ${className}?`)) {
        return;
    }

    const result = await apiCall('/admin/assign-class', {
        method: 'DELETE',
        body: JSON.stringify({ teacherId, className })
    });

    if (result && result.success) {
        alert('Assignment removed successfully');
        loadAssignments();
    } else {
        alert(result?.message || 'Failed to remove assignment');
    }
}

// Quick assign ST to existing class
async function quickAssignST(className) {
    const result = await apiCall('/admin/teachers');
    
    if (!result || !result.success) {
        alert('Failed to load teachers');
        return;
    }
    
    const teachers = result.data;
    const teacherNames = teachers.map(t => `${t.id}. ${t.name}`).join('\n');
    
    const teacherId = prompt(`Assign Subject Teacher to ${className}\n\nEnter Teacher ID:\n\n${teacherNames}`);
    
    if (!teacherId) return;
    
    const assignResult = await apiCall('/admin/assign-class', {
        method: 'POST',
        body: JSON.stringify({
            teacherId: parseInt(teacherId),
            className: className,
            isClassTeacher: false
        })
    });
    
    if (assignResult && assignResult.success) {
        alert('Subject Teacher assigned successfully');
        loadAssignments();
    } else {
        alert(assignResult?.message || 'Failed to assign teacher');
    }
}

// ==========================================
// STUDENTS MANAGEMENT
// ==========================================

// ==========================================
// STUDENTS MANAGEMENT - COMPLETE CRUD
// Replace the loadStudents() function in admin-dashboard.js
// ==========================================

async function loadStudents() {
    const studentsList = document.getElementById('studentsList');
    studentsList.innerHTML = '<p class="loading">Loading students...</p>';

    const result = await apiCall('/admin/students');

    if (!result || !result.success) {
        studentsList.innerHTML = '<p class="empty-state">Failed to load students</p>';
        return;
    }

    if (result.data.length === 0) {
        studentsList.innerHTML = '<p class="empty-state">No students registered yet</p>';
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Card ID</th>
                    <th>Class</th>
                    <th>Roll Number</th>
                    <th>Total Attendance</th>
                    <th>Last Seen</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    result.data.forEach(student => {
        const registeredDate = new Date(student.registered_at).toLocaleDateString();
        const lastSeen = student.stats.lastSeen ? 
            new Date(student.stats.lastSeen).toLocaleString() : 
            'Never';
        
        html += `
            <tr>
                <td><strong>${student.name}</strong></td>
                <td><code>${student.card_id}</code></td>
                <td>${student.class || 'N/A'}</td>
                <td>${student.roll_number || 'N/A'}</td>
                <td><span style="color: #2196f3; font-weight: bold;">${student.stats.totalAttendance}</span></td>
                <td style="font-size: 12px;">${lastSeen}</td>
                <td>
                    <button class="btn-secondary btn-sm" onclick="editStudent(${student.id})">✏️ Edit</button>
                    <button class="btn-danger btn-sm" onclick="deleteStudent(${student.id})">🗑️ Delete</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    studentsList.innerHTML = html;
}

// ==========================================
// EDIT STUDENT
// ==========================================

async function editStudent(studentId) {
    // Get student details
    const result = await apiCall(`/admin/students/${studentId}`);
    
    if (!result || !result.success) {
        alert('Failed to load student details');
        return;
    }

    const student = result.data;

    // Populate edit modal
    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editCardId').value = student.card_id;
    document.getElementById('editName').value = student.name;
    document.getElementById('editClass').value = student.class || '';
    document.getElementById('editRollNumber').value = student.roll_number || '';

    // Show stats
    document.getElementById('editStudentStats').innerHTML = `
        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong>📊 Student Statistics:</strong><br>
            <span style="color: #2196f3;">Total Attendance: ${student.stats.totalAttendance}</span><br>
            <span style="color: #666;">Registered: ${new Date(student.registered_at).toLocaleDateString()}</span>
        </div>
    `;

    // Show modal
    document.getElementById('editStudentModal').classList.add('active');
}

// ==========================================
// DELETE STUDENT
// ==========================================

async function deleteStudent(studentId) {
    // Get student details first
    const result = await apiCall(`/admin/students/${studentId}`);
    
    if (!result || !result.success) {
        alert('Failed to load student details');
        return;
    }

    const student = result.data;

    if (!confirm(`⚠️ Delete student "${student.name}"?\n\nCard ID: ${student.card_id}\nClass: ${student.class || 'N/A'}\n\nThis action cannot be undone!\n\n(Note: Attendance history will be preserved)`)) {
        return;
    }

    const deleteResult = await apiCall(`/admin/students/${studentId}`, {
        method: 'DELETE'
    });

    if (deleteResult && deleteResult.success) {
        alert('✓ Student deleted successfully');
        loadStudents();
    } else {
        alert('✗ Failed to delete student: ' + (deleteResult?.message || 'Unknown error'));
    }
}

// ==========================================
// FORM HANDLERS - Add to existing code
// ==========================================

// Edit Student Form Submit
document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const studentId = formData.get('studentId');
    
    const data = {
        cardId: formData.get('cardId'),
        name: formData.get('name'),
        studentClass: formData.get('studentClass'),
        rollNumber: formData.get('rollNumber')
    };

    const result = await apiCall(`/admin/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (result && result.success) {
        alert('✓ Student updated successfully');
        document.getElementById('editStudentModal').classList.remove('active');
        e.target.reset();
        loadStudents();
    } else {
        alert('✗ Failed to update student: ' + (result?.message || 'Unknown error'));
    }
});

// Bulk Import Form Submit
document.getElementById('bulkImportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const csvText = formData.get('csvData');

    if (!csvText.trim()) {
        alert('Please enter CSV data');
        return;
    }

    // Parse CSV (simple parser - assumes: cardId,name,class,rollNumber)
    const lines = csvText.trim().split('\n');
    const students = [];

    lines.forEach((line, index) => {
        // Skip header if exists
        if (index === 0 && line.toLowerCase().includes('card')) {
            return;
        }

        const parts = line.split(',').map(p => p.trim());
        
        if (parts.length >= 2) {
            students.push({
                cardId: parts[0],
                name: parts[1],
                studentClass: parts[2] || null,
                rollNumber: parts[3] || null
            });
        }
    });

    if (students.length === 0) {
        alert('No valid student data found');
        return;
    }

    const result = await apiCall('/admin/students/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ students })
    });

    if (result && result.success) {
        const { success, failed, errors } = result.data;
        let message = `✓ Import complete!\n\nSuccess: ${success}\nFailed: ${failed}`;
        
        if (errors.length > 0 && errors.length <= 5) {
            message += '\n\nErrors:\n' + errors.map(e => `Row ${e.row}: ${e.error}`).join('\n');
        }
        
        alert(message);
        document.getElementById('bulkImportModal').classList.remove('active');
        e.target.reset();
        loadStudents();
    } else {
        alert('✗ Failed to import students');
    }
});
// ==========================================
// ATTENDANCE RECORDS
// ==========================================

// Find the loadAttendance() function and update the header section

async function loadAttendance() {
    const attendanceList = document.getElementById('attendanceList');
    attendanceList.innerHTML = '<p class="loading">Loading attendance...</p>';

    const statsResult = await apiCall('/attendance/stats');
    const recordsResult = await apiCall('/attendance/latest');

    if (statsResult && statsResult.success) {
        document.getElementById('totalRecords').textContent = statsResult.data.total_records || 0;
        document.getElementById('todayCount').textContent = statsResult.data.today_count || 0;
        document.getElementById('uniqueStudents').textContent = statsResult.data.unique_students || 0;
    }

    if (!recordsResult || !recordsResult.success) {
        attendanceList.innerHTML = '<p class="empty-state">Failed to load attendance records</p>';
        return;
    }

    if (recordsResult.data.length === 0) {
        attendanceList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 64px; margin-bottom: 20px;">📋</div>
                <h3 style="color: #666;">No attendance records yet</h3>
                <p>Records will appear here when students scan their cards</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Card ID</th>
                    <th>Timestamp</th>
                </tr>
            </thead>
            <tbody>
    `;

    recordsResult.data.forEach(record => {
        const timestamp = new Date(record.timestamp).toLocaleString();
        
        html += `
            <tr>
                <td><strong>${record.student_name}</strong></td>
                <td>${record.class}</td>
                <td><code>${record.card_id}</code></td>
                <td>${timestamp}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    attendanceList.innerHTML = html;
}

// ==========================================
// MODAL HANDLERS
// ==========================================

// Make sure the clear button exists and add click handler
const clearAttendanceBtn = document.getElementById('clearAttendanceBtn');
if (clearAttendanceBtn) {
    clearAttendanceBtn.addEventListener('click', clearAllAttendance);
}

addTeacherBtn.addEventListener('click', () => {
    addTeacherModal.classList.add('active');
});

assignClassBtn.addEventListener('click', async () => {
    // Load teachers into select
    const result = await apiCall('/admin/teachers');
    const teacherSelect = document.getElementById('teacherSelect');
    
    teacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>';
    
    if (result && result.success) {
        result.data.forEach(teacher => {
            // Skip admin
            if (teacher.role === 'admin') return;
            
            // Show current CT assignment in dropdown
            const ctClass = teacher.classes.find(c => c.is_class_teacher);
            const ctInfo = ctClass ? ` [CT of ${ctClass.class_name}]` : '';
            const stCount = teacher.classes.filter(c => !c.is_class_teacher).length;
            const stInfo = stCount > 0 ? ` [ST of ${stCount} classes]` : '';
            
            teacherSelect.innerHTML += `<option value="${teacher.id}">${teacher.name}${ctInfo}${stInfo}</option>`;
        });
    }
    
    assignClassModal.classList.add('active');
});

addStudentBtn.addEventListener('click', () => {
    addStudentModal.classList.add('active');
});

closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        addTeacherModal.classList.remove('active');
        assignClassModal.classList.remove('active');
        addStudentModal.classList.remove('active');
    });
});

// ==========================================
// FORM SUBMISSIONS
// ==========================================

document.getElementById('addTeacherForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        name: formData.get('name'),
        email: formData.get('email'),
        role: 'class_teacher' // Always create as 'teacher'
    };

    const result = await apiCall('/admin/teachers', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result && result.success) {
        alert('Teacher created successfully! Now assign them to classes in the "Class Assignments" tab.');
        addTeacherModal.classList.remove('active');
        e.target.reset();
        loadTeachers();
    } else {
        alert(result?.message || 'Failed to create teacher');
    }
});

document.getElementById('assignClassForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const isClassTeacherValue = formData.get('isClassTeacher');
    
    // Convert to boolean - check for '1' (CT) or any truthy value
    const isClassTeacher = isClassTeacherValue === '1' || isClassTeacherValue === 'true';
    
    const data = {
        teacherId: parseInt(formData.get('teacherId')),
        className: formData.get('className'),
        isClassTeacher: isClassTeacher
    };

    console.log('Submitting assignment:', data); // Debug log

    const result = await apiCall('/admin/assign-class', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result && result.success) {
        alert(result.message || 'Class assigned successfully');
        assignClassModal.classList.remove('active');
        e.target.reset();
        loadAssignments();
        loadTeachers(); // Refresh to show updated assignments
    } else {
        alert(result?.message || 'Failed to assign class');
    }
});

document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const result = await apiCall('/students/register', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result && result.success) {
        alert('Student registered successfully');
        addStudentModal.classList.remove('active');
        e.target.reset();
        loadStudents();
    } else {
        alert(result?.message || 'Failed to register student');
    }
});

refreshAttendanceBtn.addEventListener('click', loadAttendance);

// ==========================================
// LOGOUT
// ==========================================

logoutBtn.addEventListener('click', async () => {
    await apiCall('/auth/logout', { method: 'POST' });
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
});

// 1. ADD THIS FUNCTION anywhere in admin-dashboard.js

/**
 * Clear all attendance records with confirmation
 */
async function clearAllAttendance() {
    // First confirmation
    const firstConfirm = confirm(
        '⚠️ WARNING: Clear ALL Attendance Records?\n\n' +
        'This will DELETE all attendance data permanently!\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Are you sure you want to continue?'
    );

    if (!firstConfirm) {
        return;
    }

    // Second confirmation (double safety)
    const secondConfirm = prompt(
        '🔴 FINAL WARNING!\n\n' +
        'Type "DELETE ALL" to confirm deletion of all attendance records:\n\n' +
        '(Type exactly: DELETE ALL)'
    );

    if (secondConfirm !== 'DELETE ALL') {
        alert('❌ Cancelled - Incorrect confirmation text');
        return;
    }

    // Show loading
    const attendanceList = document.getElementById('attendanceList');
    const originalContent = attendanceList.innerHTML;
    attendanceList.innerHTML = '<p class="loading">⏳ Deleting all records...</p>';

    try {
        const result = await apiCall('/attendance/clear', {
            method: 'DELETE'
        });

        if (result && result.success) {
            alert(`✅ Success!\n\nDeleted ${result.message || 'all attendance records'}`);
            
            // Refresh attendance view
            loadAttendance();
            
            // Update stats to zero
            document.getElementById('totalRecords').textContent = '0';
            document.getElementById('todayCount').textContent = '0';
            document.getElementById('uniqueStudents').textContent = '0';
        } else {
            alert('❌ Failed to clear attendance: ' + (result?.message || 'Unknown error'));
            attendanceList.innerHTML = originalContent;
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
        attendanceList.innerHTML = originalContent;
    }
}


// ==========================================
// LOAD INITIAL DATA
// ==========================================

loadTeachers();