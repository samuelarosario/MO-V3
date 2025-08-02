const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Check the expected database location from flights-setup.js
const dbPath = path.join(__dirname, 'security-mo.db');

console.log('🔍 Checking for database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to database');
});

// Check tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('❌ Error getting tables:', err.message);
        return;
    }
    
    console.log('📋 Available tables:');
    rows.forEach(row => {
        console.log(`  📊 ${row.name}`);
    });
    
    if (rows.find(r => r.name === 'flights')) {
        // Count flights
        db.get("SELECT COUNT(*) as count FROM flights", (err, row) => {
            if (err) {
                console.error('❌ Error counting flights:', err.message);
            } else {
                console.log(`📊 Total flights: ${row.count}`);
            }
            
            // Check for PR216
            db.get("SELECT * FROM flights WHERE flight_number = 'PR216'", (err, flight) => {
                if (err) {
                    console.error('❌ Error searching PR216:', err.message);
                } else if (flight) {
                    console.log('✅ PR216 found:', flight);
                } else {
                    console.log('❌ PR216 not found');
                }
                db.close();
            });
        });
    } else {
        console.log('❌ No flights table found');
        db.close();
    }
});
