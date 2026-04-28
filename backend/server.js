const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { verifyAndFetchStudent } = require('./erpService');
const { sendEmail } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your_super_secret_key_change_in_production'; // Simple secret for this project

app.use(cors());
app.use(express.json());

// Middleware for auth
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
};

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
    const { name, email, student_id, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role === 'admin' ? 'admin' : 'student'; // basic role setting

        db.run(`INSERT INTO users (name, email, student_id, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            [name, email, student_id, hashedPassword, userRole],
            function(err) {
                if (err) return res.status(400).json({ error: err.message });
                res.status(201).json({ message: "User registered successfully!", id: this.lastID });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/erp-login', async (req, res) => {
    const { student_id, erp_password } = req.body;
    try {
        // 1. Verify with ERP Portal
        const studentDetails = await verifyAndFetchStudent(student_id, erp_password);

        // 2. Check if student exists in our local DB
        db.get(`SELECT * FROM users WHERE student_id = ? AND role = 'student'`, [student_id], async (err, existingUser) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (existingUser) {
                // User already exists, update their profile with the latest from ERP then log them in
                db.run(`UPDATE users SET profile_data = ? WHERE id = ?`, 
                    [studentDetails.profile_data, existingUser.id]);
                
                const token = jwt.sign({ id: existingUser.id, role: existingUser.role }, SECRET_KEY, { expiresIn: '2h' });
                return res.json({ token, user: { id: existingUser.id, name: existingUser.name, email: existingUser.email, student_id: existingUser.student_id, role: existingUser.role, profile_data: JSON.parse(studentDetails.profile_data) } });
            } else {
                // User doesn't exist. Create them in our system automatically with a dummy password hash (since they authenticate via ERP).
                const dummyHash = await bcrypt.hash(erp_password, 10);
                db.run(`INSERT INTO users (name, email, student_id, password_hash, role, profile_data) VALUES (?, ?, ?, ?, 'student', ?)`,
                    [studentDetails.name, studentDetails.email, studentDetails.student_id, dummyHash, studentDetails.profile_data],
                    function(insertErr) {
                        if (insertErr) return res.status(400).json({ error: insertErr.message });
                        
                        const newUserId = this.lastID;
                        const token = jwt.sign({ id: newUserId, role: 'student' }, SECRET_KEY, { expiresIn: '2h' });
                        return res.json({ token, user: { id: newUserId, name: studentDetails.name, email: studentDetails.email, student_id: studentDetails.student_id, role: 'student', profile_data: JSON.parse(studentDetails.profile_data) } });
                    }
                );
            }
        });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
        
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
});

app.get('/api/profile', authenticate, (req, res) => {
    db.get(`SELECT id, name, email, student_id, role, profile_data FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        if (user.profile_data) user.profile_data = JSON.parse(user.profile_data);
        res.json(user);
    });
});

// --- STUDENT ROUTES ---
app.post('/api/students/request-update', authenticate, (req, res) => {
    const { details } = req.body;
    if (!details) return res.status(400).json({ error: "Details are required." });

    db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: "Database error" });

        const emailBody = `
Student Profile Update Request:
--------------------------------
Name: ${user.name}
Email: ${user.email}
Student ID / Reg No: ${user.student_id}

Requested Updates:
${details}
        `;

        sendEmail('2004situ@gmail.com', `Profile Update Request - ${user.student_id}`, emailBody);
        res.json({ message: "Update request sent successfully." });
    });
});

// --- COURSE ROUTES ---
app.get('/api/courses', authenticate, (req, res) => {
    const adminQuery = req.user.role === 'admin' ? `SELECT * FROM courses WHERE teacher_id = ?` : `SELECT * FROM courses`;
    const params = req.user.role === 'admin' ? [req.user.id] : [];

    db.all(adminQuery, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (req.user.role === 'admin') {
            return res.json(rows);
        }

        // Student filtering
        db.get(`SELECT profile_data FROM users WHERE id = ?`, [req.user.id], (err, user) => {
            if (err || !user || !user.profile_data) return res.json(rows); 
            
            try {
                const profile = JSON.parse(user.profile_data);
                const studentSemester = profile.topDetails?.semester || '';
                const studentBranch = profile.topDetails?.branch || '';

                const filteredCourses = rows.filter(course => {
                    const semMatch = course.target_semester === 'All' || course.target_semester === studentSemester;
                    const branchMatch = course.target_branches === 'All' || 
                        course.target_branches.split(',').map(s=>s.trim()).includes(studentBranch);
                    return semMatch && branchMatch;
                });
                res.json(filteredCourses);
            } catch (e) {
                res.json(rows);
            }
        });
    });
});

app.post('/api/courses', authenticate, isAdmin, (req, res) => {
    const { title, description, capacity, prerequisites, target_semester, target_branches, total_classes } = req.body;
    db.run(`INSERT INTO courses (teacher_id, title, description, capacity, prerequisites, target_semester, target_branches, total_classes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, title, description, capacity, prerequisites, target_semester || 'All', target_branches || 'All', total_classes || 0],
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ message: 'Course created', id: this.lastID });
        }
    );
});

// --- ENROLLMENT ROUTES ---
app.post('/api/enroll', authenticate, (req, res) => {
    const { course_id } = req.body;
    const student_id = req.user.id;

    // Check capacity and existing enrollment
    db.get(`SELECT capacity, (SELECT COUNT(*) FROM enrollments WHERE course_id = ? AND status != 'rejected') as enrolled_count FROM courses WHERE id = ?`, 
        [course_id, course_id], (err, course) => {
        if (err || !course) return res.status(400).json({ error: 'Course not found' });
        if (course.enrolled_count >= course.capacity) return res.status(400).json({ error: 'Course is full' });

        db.get(`SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?`, [student_id, course_id], (err, existing) => {
            if (existing) return res.status(400).json({ error: 'Already enrolled or requested' });

            db.run(`INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'pending')`, [student_id, course_id], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                
                res.status(201).json({ message: 'Enrollment requested successfully' });
                
                // Send email notification to student
                db.get(`SELECT email FROM users WHERE id = ?`, [student_id], (err, user) => {
                    if (user && user.email) {
                        sendEmail(user.email, `Enrollment Request Received - ${course.title}`, 
                            `Your enrollment request for the course "${course.title}" has been received and is pending admin approval.`);
                    }
                });
            });
        });
    });
});

app.get('/api/enrollments/all', authenticate, isAdmin, (req, res) => {
    db.all(`SELECT e.id, u.id as student_id, u.name as student_name, c.id as course_id, c.title as course_title, c.total_classes, e.status, 
            (SELECT COUNT(*) FROM attendance_records ar WHERE ar.course_id = c.id AND ar.student_id = u.id AND ar.status = 'Present') as classes_attended,
            (SELECT COUNT(DISTINCT class_date) FROM attendance_records ar2 WHERE ar2.course_id = c.id) as classes_conducted
            FROM enrollments e 
            JOIN users u ON e.student_id = u.id 
            JOIN courses c ON e.course_id = c.id
            WHERE c.teacher_id = ?`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/enrollments', authenticate, (req, res) => {
    db.all(`SELECT e.id, c.title as course_title, c.total_classes, e.course_id, e.status, 
            (SELECT COUNT(*) FROM attendance_records ar WHERE ar.course_id = c.id AND ar.student_id = e.student_id AND ar.status = 'Present') as classes_attended,
            (SELECT COUNT(DISTINCT class_date) FROM attendance_records ar2 WHERE ar2.course_id = c.id) as classes_conducted
            FROM enrollments e 
            JOIN courses c ON e.course_id = c.id 
            WHERE e.student_id = ?`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.put('/api/enrollments/:id', authenticate, isAdmin, (req, res) => {
    const { status } = req.body; // 'approved' or 'rejected'
    db.run(`UPDATE enrollments SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: `Enrollment ${status}` });
        
        // Fetch student email and course title to send an email
        db.get(`SELECT u.email, c.title FROM enrollments e 
                JOIN users u ON e.student_id = u.id 
                JOIN courses c ON e.course_id = c.id 
                WHERE e.id = ?`, [req.params.id], (err, details) => {
            if (details && details.email) {
                sendEmail(details.email, `Enrollment Update - ${details.title}`, 
                    `Your enrollment request for the course "${details.title}" has been ${status.toUpperCase()}.`);
            }
        });
    });
});

app.put('/api/courses/:id/start', authenticate, isAdmin, (req, res) => {
    const courseId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    db.run(`UPDATE courses SET start_date = ? WHERE id = ? AND teacher_id = ?`, [today, courseId, req.user.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Course not found or unauthorized." });
        res.json({ message: "Course started successfully.", start_date: today });
    });
});

app.post('/api/courses/:id/attendance', authenticate, isAdmin, (req, res) => {
    const { date, present_student_ids } = req.body;
    const courseId = req.params.id;

    if (!date || !Array.isArray(present_student_ids)) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    db.get(`SELECT start_date FROM courses WHERE id = ? AND teacher_id = ?`, [courseId, req.user.id], (err, course) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!course) return res.status(404).json({ error: "Course not found." });
        if (!course.start_date) return res.status(400).json({ error: "Course hasn't started yet." });
        if (date < course.start_date) return res.status(400).json({ error: "Cannot mark attendance before the start date." });

        db.serialize(() => {
            db.all(`SELECT student_id FROM enrollments WHERE course_id = ? AND status = 'approved'`, [courseId], (err, students) => {
                if (err) return res.status(500).json({ error: err.message });
                
                const stmt = db.prepare(`INSERT OR REPLACE INTO attendance_records (course_id, student_id, class_date, status) VALUES (?, ?, ?, ?)`);
                students.forEach(s => {
                    const status = present_student_ids.includes(s.student_id) ? 'Present' : 'Absent';
                    stmt.run([courseId, s.student_id, date, status]);
                });
                stmt.finalize();
                res.json({ message: "Attendance saved successfully." });
            });
        });
    });
});

app.get('/api/courses/:id/attendance/:date', authenticate, isAdmin, (req, res) => {
    db.all(`SELECT student_id, status FROM attendance_records WHERE course_id = ? AND class_date = ?`, 
        [req.params.id, req.params.date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/courses/:id/analytics', authenticate, isAdmin, (req, res) => {
    const courseId = req.params.id;
    // Ensure the teacher owns the course before giving analytics
    db.get(`SELECT id FROM courses WHERE id = ? AND teacher_id = ?`, [courseId, req.user.id], (err, course) => {
        if (err || !course) return res.status(403).json({ error: "Unauthorized" });

        db.all(`
            SELECT class_date as date, 
                   SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
                   COUNT(student_id) as total_count
            FROM attendance_records
            WHERE course_id = ?
            GROUP BY class_date
            ORDER BY class_date ASC
        `, [courseId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });
});
// --- ADMIN ROUTES ---
app.get('/api/students', authenticate, isAdmin, (req, res) => {
    db.all(`SELECT id, name, email, student_id FROM users WHERE role = 'student'`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/stats', authenticate, isAdmin, (req, res) => {
    const stats = { students: 0, courses: 0, pendingEnrollments: 0 };
    db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`, [], (err, row) => {
        if (!err && row) stats.students = row.count;
        db.get(`SELECT COUNT(*) as count FROM courses WHERE teacher_id = ?`, [req.user.id], (err, row) => {
            if (!err && row) stats.courses = row.count;
            db.get(`SELECT COUNT(*) as count FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.status = 'pending' AND c.teacher_id = ?`, [req.user.id], (err, row) => {
                if (!err && row) stats.pendingEnrollments = row.count;
                res.json(stats);
            });
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
