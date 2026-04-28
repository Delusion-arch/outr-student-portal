const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error(err.message);
    
    db.run("ALTER TABLE courses ADD COLUMN start_date TEXT DEFAULT NULL", (err) => {
        if (err) console.log("Column start_date already exists.", err.message);
        else console.log("Added start_date to courses.");
    });
});
