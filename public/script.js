const cardIdInput = document.getElementById('cardIdInput');
const submitBtn = document.getElementById('submitBtn');
const refreshBtn = document.getElementById('refreshBtn');
const clearBtn = document.getElementById('clearBtn');
const statusMessage = document.getElementById('statusMessage');
const recordsList = document.getElementById('recordsList');

submitBtn.addEventListener('click', recordAttendance);
refreshBtn.addEventListener('click', loadRecentRecords);
clearBtn.addEventListener('click', clearAllRecords);

cardIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        recordAttendance();
    }
});

async function recordAttendance() {
    const cardId = cardIdInput.value.trim();
    
    if (!cardId) {
        showStatus('Please enter a card ID', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Recording...';
    
    try {
        const attendanceData = {
            cardId: cardId,
            time: new Date().toISOString()
        };
        
        const response = await fetch('/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(attendanceData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showStatus(`✓ Attendance recorded for ${cardId}`, 'success');
            loadRecentRecords();
        } else {
            showStatus(`Error: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Error recording attendance:', error);
        showStatus('Failed to connect to server. Is it running?', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✓ Record Attendance';
    }
}

async function loadRecentRecords() {
    try {
        const response = await fetch('/attendance/latest');
        const result = await response.json();
        
        if (response.ok && result.success) {
            displayRecords(result.data);
        } else {
            recordsList.innerHTML = '<p class="empty-state">Failed to load records</p>';
        }
        
    } catch (error) {
        console.error('Error loading records:', error);
        recordsList.innerHTML = '<p class="empty-state">Failed to connect to server</p>';
    }
}

function displayRecords(records) {
    if (!records || records.length === 0) {
        recordsList.innerHTML = '<p class="empty-state">No records yet. Click "Record Attendance" to add one!</p>';
        return;
    }
    
    let html = '';
    records.forEach(record => {
        const timestamp = record.timestamp || record.createdAt?.toDate?.() || new Date();
        const date = new Date(timestamp);
        const formattedTime = date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // FIX: Use snake_case column names from database
        const studentName = record.student_name || 'Unknown Student';
        const studentClass = record.class || 'N/A';
        
        html += `
            <div class="record-item">
                <strong>👤 ${studentName}</strong><br>
                <span style="color: #666;">Class: ${studentClass}</span><br>
                <span style="color: #999; font-size: 0.85em;">Card: ${record.card_id || record.cardId}</span>
                <div class="timestamp">
                    📅 ${formattedTime}
                </div>
            </div>
        `;
    });
    
    recordsList.innerHTML = html;
}

async function clearAllRecords() {
    const confirmed = confirm('Are you sure you want to delete all attendance records? This cannot be undone!');
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/attendance/clear', {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showStatus('All records cleared successfully', 'success');
            loadRecentRecords();
        } else {
            showStatus('Failed to clear records', 'error');
        }
        
    } catch (error) {
        console.error('Error clearing records:', error);
        showStatus('Failed to connect to server', 'error');
    }
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard loaded');
    loadRecentRecords();
});