// Check external-source.db for PR101 data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'external-source.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking external-source.db for PR101...\n');

// First, check what tables exist
db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
    if (err) {
        console.error('❌ Error checking tables:', err);
        db.close();
        return;
    }
    
    console.log('📋 Tables in external-source.db:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    console.log('');
    
    // Check for flights table and PR101 data
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
                
                // Check if there are any PR flights at all
                db.all(`SELECT flight_number FROM flights WHERE flight_number LIKE 'PR%' LIMIT 5`, (err, prFlights) => {
                    if (err) {
                        console.error('❌ Error checking PR flights:', err);
                    } else {
                        console.log(`\n📊 Sample PR flights in database: ${prFlights.map(f => f.flight_number).join(', ')}`);
                    }
                    db.close();
                });
            } else {
                console.log(`✅ Found ${rows.length} PR101 record(s):`);
                rows.forEach((row, i) => {
                    console.log(`\n📋 Record ${i + 1}:`);
                    Object.keys(row).forEach(key => {
                        console.log(`  ${key}: ${row[key]}`);
                    });
                });
                db.close();
            }
        });
    } else {
        console.log('❌ No flights table found in external-source.db');
        db.close();
    }
});
