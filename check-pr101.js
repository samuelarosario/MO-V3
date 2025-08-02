// Quick check for PR101 data in local database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'security-mo.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Searching for PR101 in local database...\n');

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
        console.error('❌ Error:', err);
        db.close();
        return;
    }
    
    if (rows.length === 0) {
        console.log('❌ No flights found for PR101');
    } else {
        console.log(`✅ Found ${rows.length} record(s) for PR101:\n`);
        
        rows.forEach((row, index) => {
            console.log(`Record ${index + 1}:`);
            console.log(`  Flight: ${row.flight_number}`);
            console.log(`  Airline: ${row.airline_name} (${row.airline_code})`);
            console.log(`  Route: ${row.origin_code} → ${row.destination_code}`);
            console.log(`  Departure: ${row.departure_time}`);
            console.log(`  Arrival: ${row.arrival_time}`);
            console.log(`  Duration: ${row.duration_minutes} minutes`);
            console.log(`  Aircraft: ${row.aircraft_type}`);
            console.log(`  Days: ${row.days_of_week}`);
            console.log(`  Effective: ${row.effective_from} to ${row.effective_to}`);
            console.log('');
        });
    }
    
    db.close();
});
