// Check main security-mo.db for PR101 data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'security-mo.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking main security-mo.db for PR101...\n');

// First, check what tables exist
db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
    if (err) {
        console.error('❌ Error checking tables:', err);
        db.close();
        return;
    }
    
    console.log('📋 Tables in main security-mo.db:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    console.log('');
    
    // Check for flights table and PR101 data
    if (tables.some(t => t.name === 'flights')) {
        console.log('✅ Flights table found, checking PR101...\n');
        
        db.all(`
            SELECT 
                flight_number,
                airline_code,
                airline_name,
                origin_code,
                destination_code,
                departure_time,
                arrival_time,
                duration_minutes,
                aircraft_type,
                days_of_week,
                effective_from,
                effective_to
            FROM flights 
            WHERE flight_number = 'PR101'
            ORDER BY departure_time
        `, (err, rows) => {
            if (err) {
                console.error('❌ Error querying flights:', err);
            } else if (rows.length === 0) {
                console.log('❌ No PR101 flights found');
                
                // Check if there are any PR flights at all
                db.all(`SELECT flight_number FROM flights WHERE flight_number LIKE 'PR%' ORDER BY flight_number LIMIT 10`, (err, prFlights) => {
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
                    console.log(`  Flight: ${row.flight_number}`);
                    console.log(`  Airline: ${row.airline_name} (${row.airline_code})`);
                    console.log(`  Route: ${row.origin_code} → ${row.destination_code}`);
                    console.log(`  Departure: ${row.departure_time}`);
                    console.log(`  Arrival: ${row.arrival_time}`);
                    console.log(`  Duration: ${row.duration_minutes} minutes`);
                    console.log(`  Aircraft: ${row.aircraft_type}`);
                    console.log(`  Days: ${row.days_of_week} (1=operates, 0=doesn't operate)`);
                    console.log(`  Effective: ${row.effective_from} to ${row.effective_to}`);
                });
                db.close();
            }
        });
    } else {
        console.log('❌ No flights table found in main security-mo.db');
        db.close();
    }
});
