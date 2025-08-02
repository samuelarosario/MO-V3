const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./security-mo.db');

console.log('=== Flight Database Query ===\n');

// Check for PR216 specifically (with and without space)
db.all('SELECT * FROM flights WHERE flight_number IN (?, ?)', ['PR216', 'PR 216'], (err, rows) => {
    if (err) {
        console.error('Error querying PR216:', err);
    } else {
        console.log('🔍 PR216 in scheduled flights:');
        if (rows.length > 0) {
            rows.forEach(row => {
                console.log(`✈️  ${row.flight_number}: ${row.origin_code} → ${row.destination_code}`);
                console.log(`🏢 ${row.airline_name}`);
                console.log(`🕐 ${row.departure_time} → ${row.arrival_time}`);
                console.log(`✈️  Aircraft: ${row.aircraft_type}`);
                console.log(`⏱️  Duration: ${row.duration_minutes} minutes`);
                console.log(`📅 Status: ${row.status}`);
            });
        } else {
            console.log('❌ PR216 not found in scheduled flights');
        }
    }

    // Check for POM → MNL flights
    db.all('SELECT * FROM flights WHERE origin_code = ? AND destination_code = ?', ['POM', 'MNL'], (err2, rows2) => {
        if (err2) {
            console.error('Error querying POM → MNL:', err2);
        } else {
            console.log('\n🔍 POM → MNL flights:');
            if (rows2.length > 0) {
                rows2.forEach(row => {
                    console.log(`✈️  ${row.flight_number}: ${row.airline_name}`);
                    console.log(`🕐 ${row.departure_time} → ${row.arrival_time}`);
                });
            } else {
                console.log('❌ No POM → MNL flights found');
            }
        }

        // Check for all PR flights
        db.all('SELECT flight_number, origin_code, destination_code, airline_name FROM flights WHERE flight_number LIKE ? ORDER BY flight_number', ['PR%'], (err3, rows3) => {
            if (err3) {
                console.error('Error querying PR flights:', err3);
            } else {
                console.log('\n🔍 All Philippine Airlines (PR) flights:');
                if (rows3.length > 0) {
                    rows3.forEach(row => {
                        console.log(`✈️  ${row.flight_number}: ${row.origin_code} → ${row.destination_code} (${row.airline_name})`);
                    });
                } else {
                    console.log('❌ No PR flights found in database');
                }
            }

            db.close();
        });
    });
});
