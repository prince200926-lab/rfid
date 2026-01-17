/**
 * Authentication Middleware
 * Protects routes and checks user permissions
 */

const database = require('./database');

/**
 * Check if user is authenticated
 */
function isAuthenticated(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  // Clean expired sessions
  database.sessions.cleanExpired();
  
  const session = database.sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session'
    });
  }
  
  // Attach user info to request
  req.user = {
    id: session.teacher_id,
    username: session.username,
    name: session.name,
    email: session.email,
    role: session.role
  };
  
  next();
}

/**
 * Check if user is admin
 */
function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}

/**
 * Check if user is class teacher
 */
function isClassTeacher(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'class_teacher')) {
    return res.status(403).json({
      success: false,
      message: 'Class teacher access required'
    });
  }
  next();
}

/**
 * Check if user has access to a specific class
 */
function hasClassAccess(req, res, next) {
  const className = req.params.className || req.body.className || req.query.className;
  
  if (!className) {
    return res.status(400).json({
      success: false,
      message: 'Class name is required'
    });
  }
  
  // Admin has access to all classes
  if (req.user.role === 'admin') {
    req.className = className;
    return next();
  }
  
  // Check if teacher is assigned to this class
  const assignments = database.teacherClasses.getByTeacher(req.user.id);
  const hasAccess = assignments.some(a => a.class_name === className);
  
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this class'
    });
  }
  
  // Check if they are class teacher for this class
  const isClassTeacherForClass = assignments.some(
    a => a.class_name === className && a.is_class_teacher
  );
  
  req.className = className;
  req.isClassTeacherForClass = isClassTeacherForClass;
  
  next();
}

/**
 * Check if user can mark attendance (only class teachers)
 */
function canMarkAttendance(req, res, next) {
  const className = req.params.className || req.body.className || req.query.className;
  
  // Admin can mark attendance
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Must be class teacher role
  if (req.user.role !== 'class_teacher') {
    return res.status(403).json({
      success: false,
      message: 'Only class teachers can mark attendance'
    });
  }
  
  // If className is provided, check if they're the class teacher for that class
  if (className) {
    const assignments = database.teacherClasses.getByTeacher(req.user.id);
    const isClassTeacherForClass = assignments.some(
      a => a.class_name === className && a.is_class_teacher
    );
    
    if (!isClassTeacherForClass) {
      return res.status(403).json({
        success: false,
        message: 'You are not the class teacher for this class'
      });
    }
  }
  
  next();
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isClassTeacher,
  hasClassAccess,
  canMarkAttendance
};