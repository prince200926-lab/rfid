/**
 * SQLite Database Configuration
 * Handles all database operations for the RFID attendance system
 */

const Database = require('better-sqlite3');
const path = require('path');

// Create/open database file
const dbPath = path.join(__dirname, 'attendance.db');
const db = new Database(dbPath);

console.log('✓ Database connected:', dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ==========================================
// CREATE TABLES
// ==========================================

/**
 * Students Table
 * Stores student information linked to RFID cards
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class TEXT,
    roll_number TEXT,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * Attendance Table
 * Stores attendance records with student reference
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,
    student_id INTEGER,
    student_name TEXT,
    class TEXT,
    timestamp DATETIME NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  )
`);

/**
 * Create indexes for better query performance
 */
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_card_id ON students(card_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(timestamp);
  CREATE INDEX IF NOT EXISTS idx_attendance_card ON attendance(card_id);
`);

console.log('✓ Database tables created/verified');

// ==========================================
// STUDENT OPERATIONS
// ==========================================

/**
 * Register a new student
 */
const registerStudent = db.prepare(`
  INSERT INTO students (card_id, name, class, roll_number)
  VALUES (?, ?, ?, ?)
`);

/**
 * Get student by card ID
 */
const getStudentByCardId = db.prepare(`
  SELECT * FROM students WHERE card_id = ?
`);

/**
 * Get all students
 */
const getAllStudents = db.prepare(`
  SELECT * FROM students ORDER BY name ASC
`);

/**
 * Get student by ID
 */
const getStudentById = db.prepare(`
  SELECT * FROM students WHERE id = ?
`);

/**
 * Update student information
 */
const updateStudent = db.prepare(`
  UPDATE students 
  SET name = ?, class = ?, roll_number = ?
  WHERE id = ?
`);

/**
 * Delete student
 */
const deleteStudent = db.prepare(`
  DELETE FROM students WHERE id = ?
`);

/**
 * Check if card ID exists
 */
const cardIdExists = db.prepare(`
  SELECT COUNT(*) as count FROM students WHERE card_id = ?
`);

// ==========================================
// ATTENDANCE OPERATIONS
// ==========================================

/**
 * Record attendance
 */
const recordAttendance = db.prepare(`
  INSERT INTO attendance (card_id, student_id, student_name, class, timestamp)
  VALUES (?, ?, ?, ?, ?)
`);

/**
 * Get all attendance records
 */
const getAllAttendance = db.prepare(`
  SELECT * FROM attendance ORDER BY recorded_at DESC LIMIT ?
`);

/**
 * Get latest attendance records
 */
const getLatestAttendance = db.prepare(`
  SELECT * FROM attendance ORDER BY recorded_at DESC LIMIT 10
`);

/**
 * Get today's attendance
 */
const getTodayAttendance = db.prepare(`
  SELECT * FROM attendance 
  WHERE DATE(timestamp) = DATE('now')
  ORDER BY timestamp DESC
`);

/**
 * Get attendance by date range
 */
const getAttendanceByDateRange = db.prepare(`
  SELECT * FROM attendance 
  WHERE DATE(timestamp) BETWEEN ? AND ?
  ORDER BY timestamp DESC
`);

/**
 * Get attendance for specific student
 */
const getStudentAttendance = db.prepare(`
  SELECT * FROM attendance 
  WHERE student_id = ?
  ORDER BY timestamp DESC
  LIMIT ?
`);

/**
 * Get attendance count for today by student
 */
const getTodayAttendanceCount = db.prepare(`
  SELECT student_id, student_name, COUNT(*) as count
  FROM attendance
  WHERE DATE(timestamp) = DATE('now')
  GROUP BY student_id, student_name
`);

/**
 * Clear all attendance records
 */
const clearAllAttendance = db.prepare(`
  DELETE FROM attendance
`);

/**
 * Get attendance statistics
 */
const getAttendanceStats = db.prepare(`
  SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT card_id) as unique_students,
    COUNT(CASE WHEN DATE(timestamp) = DATE('now') THEN 1 END) as today_count,
    MIN(timestamp) as first_record,
    MAX(timestamp) as last_record
  FROM attendance
`);

// ==========================================
// EXPORT DATABASE FUNCTIONS
// ==========================================

module.exports = {
  db,
  
  // Student operations
  students: {
    register: (cardId, name, studentClass, rollNumber) => {
      return registerStudent.run(cardId, name, studentClass, rollNumber);
    },
    
    getByCardId: (cardId) => {
      return getStudentByCardId.get(cardId);
    },
    
    getById: (id) => {
      return getStudentById.get(id);
    },
    
    getAll: () => {
      return getAllStudents.all();
    },
    
    update: (id, name, studentClass, rollNumber) => {
      return updateStudent.run(name, studentClass, rollNumber, id);
    },
    
    delete: (id) => {
      return deleteStudent.run(id);
    },
    
    cardExists: (cardId) => {
      const result = cardIdExists.get(cardId);
      return result.count > 0;
    }
  },
  
  // Attendance operations
  attendance: {
    record: (cardId, studentId, studentName, studentClass, timestamp) => {
      return recordAttendance.run(cardId, studentId, studentName, studentClass, timestamp);
    },
    
    getAll: (limit = 100) => {
      return getAllAttendance.all(limit);
    },
    
    getLatest: () => {
      return getLatestAttendance.all();
    },
    
    getToday: () => {
      return getTodayAttendance.all();
    },
    
    getByDateRange: (startDate, endDate) => {
      return getAttendanceByDateRange.all(startDate, endDate);
    },
    
    getByStudent: (studentId, limit = 50) => {
      return getStudentAttendance.all(studentId, limit);
    },
    
    getTodayCount: () => {
      return getTodayAttendanceCount.all();
    },
    
    clearAll: () => {
      return clearAllAttendance.run();
    },
    
    getStats: () => {
      return getAttendanceStats.get();
    }
  }
};