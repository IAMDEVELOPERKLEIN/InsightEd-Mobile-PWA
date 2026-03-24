const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('e:/InsightEd-Mobile-PWA/insighted.db');

db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='ESF7_Database'", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    if (rows.length > 0) {
        console.log("Table ESF7_Database exists.");
        db.all("PRAGMA table_info(ESF7_Database)", (err, info) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log(`Table has ${info.length} columns.`);
            db.close();
        });
    } else {
        console.log("Table ESF7_Database does NOT exist.");
        db.close();
    }
});
