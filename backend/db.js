const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.serialize(() => {
            // Create Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                student_id TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT CHECK(role IN ('student', 'admin')) NOT NULL DEFAULT 'student',
                profile_data TEXT
            )`);

            // Create Courses Table
            db.run(`CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL DEFAULT 1,
                title TEXT NOT NULL,
                description TEXT,
                capacity INTEGER NOT NULL,
                prerequisites TEXT,
                target_semester TEXT DEFAULT 'All',
                target_branches TEXT DEFAULT 'All',
                total_classes INTEGER DEFAULT 0,
                start_date TEXT DEFAULT NULL,
                FOREIGN KEY(teacher_id) REFERENCES users(id)
            )`);

            // Create Enrollments Table
            db.run(`CREATE TABLE IF NOT EXISTS enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
                attendance INTEGER DEFAULT 0,
                FOREIGN KEY(student_id) REFERENCES users(id),
                FOREIGN KEY(course_id) REFERENCES courses(id)
            )`);

            // Create Attendance Records Table
            db.run(`CREATE TABLE IF NOT EXISTS attendance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                class_date TEXT NOT NULL,
                status TEXT CHECK(status IN ('Present', 'Absent')) NOT NULL DEFAULT 'Present',
                FOREIGN KEY(course_id) REFERENCES courses(id),
                FOREIGN KEY(student_id) REFERENCES users(id),
                UNIQUE(course_id, student_id, class_date)
            )`);
            
            console.log('Database tables verified/created.');
        });
    }
});

module.exports = db;
