const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./security-mo.db');

console.log('=== Database Schema Analysis ===\n');

db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
    if (err) {
        console.error('Error getting tables:', err);
        return;
    }
    
    console.log('📋 Database Tables:');
    tables.forEach(table => console.log(`  - ${table.name}`));
    
    db.all('PRAGMA table_info(flights)', (err2, schema) => {
        if (err2) {
            console.error('Error getting flights schema:', err2);
        } else {
            console.log('\n🗃️  Flights table schema:');
            schema.forEach(col => {
                console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''}`);
            });
        }
        
        // Get a sample PR101 record with all fields
        db.all('SELECT * FROM flights WHERE flight_number = "PR101"', (err3, rows) => {
            if (err3) {
                console.error('Error getting PR101 data:', err3);
            } else {
                console.log('\n✈️  PR101 Full Record:');
                console.log(JSON.stringify(rows[0], null, 2));
            }
            
            db.close();
        });
    });
});
