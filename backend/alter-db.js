const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error(err.message);
    
    db.run("ALTER TABLE courses ADD COLUMN target_semester TEXT DEFAULT 'All'", (err) => {
        if (err) console.log("Column target_semester already exists.");
        db.run("ALTER TABLE courses ADD COLUMN target_branches TEXT DEFAULT 'All'", (err) => {
            if (err) console.log("Column target_branches already exists.");
            db.run("ALTER TABLE courses ADD COLUMN total_classes INTEGER DEFAULT 0", (err) => {
                if (err) console.log("Column total_classes already exists.");
                console.log("Database altered successfully.");
            });
        });
    });
});
