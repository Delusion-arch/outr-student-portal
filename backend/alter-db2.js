const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error(err.message);
    
    db.run("ALTER TABLE courses ADD COLUMN teacher_id INTEGER DEFAULT 1", (err) => {
        if (err) console.log("Column teacher_id already exists.", err.message);
        else console.log("Added teacher_id to courses.");
    });
});
