// Import required modules
const express = require('express');
const path = require('path');
const cors = require('cors');
const database = require('./database');

// Create Express application
const app = express();
const PORT = 8080;

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

// Enable CORS for ESP8266 requests
app.use(cors());

// Parse incoming JSON data
app.use(express.json());

// Parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' folder with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==========================================
// API ENDPOINTS - ATTENDANCE
// ==========================================

/**
 * POST /attendance
 * Record attendance from ESP8266 or manual submission
 */
app.post('/attendance', (req, res) => {
  try {
    const { cardId, time } = req.body;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'cardId is required'
      });
    }

    const timestamp = time || new Date().toISOString();
    console.log(`📝 Attendance request received for card: ${cardId}`);

    const student = database.students.getByCardId(cardId);

    const result = database.attendance.record(
      cardId,
      student ? student.id : null,
      student ? student.name : 'Unknown Student',
      student ? student.class : 'N/A',
      timestamp
    );

    console.log('✓ Attendance recorded:', {
      id: result.lastInsertRowid,
      cardId,
      student: student ? student.name : 'Unknown'
    });

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: {
        id: result.lastInsertRowid,
        cardId: cardId,
        timestamp: timestamp,
        student: student || { name: 'Unknown Student', class: 'N/A' }
      }
    });

  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/attendance', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const records = database.attendance.getAll(limit);

    res.json({
      success: true,
      count: records.length,
      data: records
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records'
    });
  }
});

app.get('/attendance/latest', (req, res) => {
  try {
    const records = database.attendance.getLatest();

    res.json({
      success: true,
      count: records.length,
      data: records
    });

  } catch (error) {
    console.error('Error fetching latest attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest records'
    });
  }
});

app.get('/attendance/today', (req, res) => {
  try {
    const records = database.attendance.getToday();

    res.json({
      success: true,
      count: records.length,
      data: records
    });

  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s attendance'
    });
  }
});

app.get('/attendance/stats', (req, res) => {
  try {
    const stats = database.attendance.getStats();
    const todayCount = database.attendance.getTodayCount();

    res.json({
      success: true,
      data: {
        ...stats,
        todayByStudent: todayCount
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

app.get('/attendance/student/:id', (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 50;
    
    const records = database.attendance.getByStudent(studentId, limit);

    res.json({
      success: true,
      count: records.length,
      data: records
    });

  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student attendance'
    });
  }
});

app.delete('/attendance/clear', (req, res) => {
  try {
    const result = database.attendance.clearAll();

    console.log(`✓ Cleared all attendance records`);

    res.json({
      success: true,
      message: `Cleared ${result.changes} records`
    });

  } catch (error) {
    console.error('Error clearing attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear records'
    });
  }
});

// ==========================================
// API ENDPOINTS - STUDENTS
// ==========================================

app.post('/students/register', (req, res) => {
  try {
    const { cardId, name, studentClass, rollNumber } = req.body;

    if (!cardId || !name) {
      return res.status(400).json({
        success: false,
        message: 'cardId and name are required'
      });
    }

    if (database.students.cardExists(cardId)) {
      return res.status(409).json({
        success: false,
        message: 'Card ID already registered'
      });
    }

    const result = database.students.register(
      cardId,
      name,
      studentClass || null,
      rollNumber || null
    );

    console.log('✓ Student registered:', name);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        id: result.lastInsertRowid,
        cardId,
        name
      }
    });

  } catch (error) {
    console.error('Error registering student:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({
        success: false,
        message: 'Card ID already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to register student'
      });
    }
  }
});

app.get('/students', (req, res) => {
  try {
    const students = database.students.getAll();

    res.json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
});

app.get('/students/:id', (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = database.students.getById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student'
    });
  }
});

app.put('/students/:id', (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { name, studentClass, rollNumber } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const result = database.students.update(
      studentId,
      name,
      studentClass || null,
      rollNumber || null
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('✓ Student updated:', studentId);

    res.json({
      success: true,
      message: 'Student updated successfully'
    });

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student'
    });
  }
});

app.delete('/students/:id', (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const result = database.students.delete(studentId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('✓ Student deleted:', studentId);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student'
    });
  }
});

// ==========================================
// UTILITY ENDPOINTS
// ==========================================

// Add this temporary endpoint to app.js to check:
app.get('/debug/students', (req, res) => {
  const students = database.students.getAll();
  res.json(students);
});


app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    database: 'SQLite (Local)'
  });
});

app.get('/health', (req, res) => {
  try {
    const stats = database.attendance.getStats();
    const studentCount = database.students.getAll().length;

    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      stats: {
        students: studentCount,
        ...stats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log('=================================');
  console.log('🎓 RFID Attendance System Started');
  console.log('=================================');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/index.html`);
  console.log(`Register: http://localhost:${PORT}/register.html`);
  console.log(`Database: SQLite (attendance.db)`);
  console.log(`\nESP8266 Endpoint: http://YOUR_IP:${PORT}/attendance`);
  console.log('\nPress Ctrl+C to stop');
  console.log('=================================\n');
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  database.db.close();
  console.log('✓ Database connection closed');
  process.exit(0);
});