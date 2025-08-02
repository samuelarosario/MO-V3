const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./security-mo.db');

console.log('=== Checking flights that showed "No updates needed" ===\n');

const flightsToCheck = ['PR102', 'PR126', 'PR421', 'PR1863', 'PR1819'];

db.all('SELECT flight_number, status, aircraft_type, origin_code, destination_code FROM flights WHERE flight_number IN (?, ?, ?, ?, ?) ORDER BY flight_number', 
    flightsToCheck, (err, rows) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }
    
    console.log('📋 Existing flights that had no updates needed:');
    rows.forEach(row => {
        console.log(`✈️  ${row.flight_number}: ${row.origin_code} → ${row.destination_code} | Status: ${row.status} | Aircraft: ${row.aircraft_type || 'N/A'}`);
    });
    
    console.log('\n=== Checking some newly created flights ===');
    
    db.all('SELECT flight_number, status, aircraft_type, origin_code, destination_code FROM flights WHERE flight_number IN (?, ?, ?, ?, ?) ORDER BY flight_number', 
        ['PR100', 'PR310', 'PR424', 'PR501', 'PR537'], (err2, newRows) => {
        if (err2) {
            console.error('Error:', err2);
        } else {
            console.log('🆕 Some newly created flights:');
            newRows.forEach(row => {
                console.log(`✈️  ${row.flight_number}: ${row.origin_code} → ${row.destination_code} | Status: ${row.status} | Aircraft: ${row.aircraft_type || 'N/A'}`);
            });
        }
        
        console.log('\n=== Database Statistics ===');
        db.get('SELECT COUNT(*) as total FROM flights', (err3, count) => {
            if (!err3) {
                console.log(`📊 Total flights in database: ${count.total}`);
            }
            db.close();
        });
    });
});
