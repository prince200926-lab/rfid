// Run this once to set default passwords
const students = database.students.getAll();

students.forEach(student => {
  if (!student.password_hash) {
    // Set default password = last 4 digits of card ID
    const defaultPass = student.card_id.slice(-4);
    database.students.updatePassword(student.id, defaultPass);
    console.log(`Set password for ${student.name}: ${defaultPass}`);
  }
});