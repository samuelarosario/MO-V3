// Check database schema and PR flights
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./security-mo.db');

console.log('🔍 Checking database schema...\n');

// First, check the schema
db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('Schema error:', err);
        db.close();
        return;
    }
    
    console.log('📋 Database Tables:');
    tables.forEach(table => {
        console.log(`\n${table.name}:`);
        console.log(table.sql);
    });
    
    // Now check flights table structure specifically
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Checking flights table data...\n');
    
    db.all("SELECT * FROM flights WHERE airline_code = 'PR' LIMIT 5", [], (err, rows) => {
        if (err) {
            console.error('Flights query error:', err);
        } else {
            if (rows.length > 0) {
                console.log('Sample PR flights:');
                console.log(JSON.stringify(rows[0], null, 2));
                console.log(`\nTotal columns in first row: ${Object.keys(rows[0]).length}`);
                console.log('Column names:', Object.keys(rows[0]));
            } else {
                console.log('No PR flights found in database');
            }
        }
        
        // Check total count
        db.get("SELECT COUNT(*) as count FROM flights WHERE airline_code = 'PR'", [], (err, result) => {
            if (!err) {
                console.log(`\nTotal PR flights in database: ${result.count}`);
            }
            db.close();
        });
    });
});
