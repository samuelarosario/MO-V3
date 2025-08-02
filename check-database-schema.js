const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'security-mo.db');

console.log('🔍 Checking database schema...');
console.log(`📂 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Get schema for flights table
db.all("PRAGMA table_info(flights)", (err, rows) => {
    if (err) {
        console.error('❌ Error getting table info:', err.message);
        return;
    }
    
    console.log('\n📋 Flights table schema:');
    console.log('==================================================');
    rows.forEach(row => {
        console.log(`${row.name} (${row.type}) - ${row.pk ? 'PRIMARY KEY' : ''} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
    });
});

// Check if we have any flights
db.get("SELECT COUNT(*) as count FROM flights", (err, row) => {
    if (err) {
        console.error('❌ Error counting flights:', err.message);
        return;
    }
    console.log(`\n📊 Total flights in database: ${row.count}`);
});

// Check for PR216
db.get("SELECT * FROM flights WHERE flight_number = 'PR216'", (err, row) => {
    if (err) {
        console.error('❌ Error searching PR216:', err.message);
        return;
    }
    
    if (row) {
        console.log('\n✅ PR216 found in database:');
        console.log(row);
    } else {
        console.log('\n❌ PR216 not found in database');
    }
    
    db.close();
});
