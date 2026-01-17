/**
 * Bulk Student Registration Script
 * Run this to add multiple students to SQLite database
 */

const database = require('./database');

// ==========================================
// STUDENT DATA
// ==========================================

const students = [
  {
    cardId: "A1B2C3D4",
    name: "John Doe",
    class: "10-A",
    rollNumber: "101"
  },
  {
    cardId: "E5F6G7H8",
    name: "Jane Smith",
    class: "10-A",
    rollNumber: "102"
  },
  {
    cardId: "I9J0K1L2",
    name: "Bob Wilson",
    class: "10-B",
    rollNumber: "103"
  },
  {
    cardId: "M3N4O5P6",
    name: "Alice Brown",
    class: "9-A",
    rollNumber: "201"
  },
  {
    cardId: "Q7R8S9T0",
    name: "Charlie Davis",
    class: "9-B",
    rollNumber: "202"
  }
];

// ==========================================
// REGISTER FUNCTION
// ==========================================

function registerStudents() {
  console.log('=================================');
  console.log('📚 Registering Students...');
  console.log('=================================\n');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const student of students) {
    try {
      // Check if card ID already exists
      if (database.students.cardExists(student.cardId)) {
        console.log(`⚠️  Skipped: ${student.name} (Card ${student.cardId} already registered)`);
        skippedCount++;
        continue;
      }

      // Register student
      const result = database.students.register(
        student.cardId,
        student.name,
        student.class,
        student.rollNumber
      );

      console.log(`✓ Registered: ${student.name} (ID: ${result.lastInsertRowid})`);
      successCount++;

    } catch (error) {
      console.error(`✗ Error registering ${student.name}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=================================');
  console.log('📊 Registration Complete');
  console.log('=================================');
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log('=================================\n');

  // Close database
  database.db.close();
}

// ==========================================
// RUN
// ==========================================

try {
  registerStudents();
} catch (error) {
  console.error('Fatal error:', error);
  database.db.close();
  process.exit(1);
}