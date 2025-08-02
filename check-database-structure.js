// Check database structure and tables
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'security-mo.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database structure...\n');

// First, check what tables exist
db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
    if (err) {
        console.error('❌ Error checking tables:', err);
        db.close();
        return;
    }
    
    console.log('📋 Tables in database:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    console.log('');
    
    // If flights table exists, check PR101
    if (tables.some(t => t.name === 'flights')) {
        console.log('✅ Flights table found, checking PR101...\n');
        
        db.all(`
            SELECT * FROM flights 
            WHERE flight_number = 'PR101'
        `, (err, rows) => {
            if (err) {
                console.error('❌ Error querying flights:', err);
            } else if (rows.length === 0) {
                console.log('❌ No PR101 flights found');
            } else {
                console.log(`✅ Found ${rows.length} PR101 record(s):`);
                rows.forEach((row, i) => {
                    console.log(`\nRecord ${i + 1}:`);
                    Object.keys(row).forEach(key => {
                        console.log(`  ${key}: ${row[key]}`);
                    });
                });
            }
            db.close();
        });
    } else {
        console.log('❌ No flights table found in database');
        db.close();
    }
});
