const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./security-mo.db');

console.log('=== Searching for PR216 and similar flights ===\n');

// Search for PR216 specifically
db.all('SELECT * FROM flights WHERE flight_number = ?', ['PR216'], (err, rows) => {
    if (err) {
        console.error('Error querying flights:', err);
        return;
    }
    
    if (rows.length > 0) {
        console.log('✈️  PR216 Found:');
        rows.forEach(row => {
            console.log(`   ${row.flight_number}: ${row.origin_code} → ${row.destination_code}`);
            console.log(`   ${row.airline_name} | ${row.departure_time} → ${row.arrival_time}`);
            console.log(`   Aircraft: ${row.aircraft_type || 'N/A'} | Status: ${row.status || 'scheduled'}`);
        });
    } else {
        console.log('❌ PR216 not found in scheduled flights');
    }
    
    // Search for similar flight numbers (PR21x)
    console.log('\n🔍 Searching for similar PR21x flights...');
    db.all('SELECT * FROM flights WHERE flight_number LIKE ? ORDER BY flight_number', ['PR21%'], (err2, similarFlights) => {
        if (err2) {
            console.error('Error querying similar flights:', err2);
        } else if (similarFlights.length > 0) {
            console.log('🛩️  Similar PR21x flights found:');
            similarFlights.forEach(flight => {
                console.log(`   ${flight.flight_number}: ${flight.origin_code} → ${flight.destination_code}`);
                console.log(`      ${flight.airline_name} | ${flight.departure_time} → ${flight.arrival_time}`);
                console.log(`      Aircraft: ${flight.aircraft_type || 'N/A'} | Days: ${flight.days_of_week}`);
                console.log('');
            });
        } else {
            console.log('❌ No PR21x flights found');
        }
        
        // Search for flights containing "216"
        console.log('🔍 Searching for any flights containing "216"...');
        db.all('SELECT * FROM flights WHERE flight_number LIKE ? ORDER BY flight_number', ['%216%'], (err3, containingFlights) => {
            if (err3) {
                console.error('Error querying flights containing 216:', err3);
            } else if (containingFlights.length > 0) {
                console.log('🛩️  Flights containing "216":');
                containingFlights.forEach(flight => {
                    console.log(`   ${flight.flight_number}: ${flight.origin_code} → ${flight.destination_code} (${flight.airline_name})`);
                });
            } else {
                console.log('❌ No flights found containing "216"');
            }
            
            // Check live flights
            console.log('\n🔴 Checking live flights for PR216...');
            db.all('SELECT * FROM live_flights WHERE flight_number LIKE ? OR callsign LIKE ?', ['%PR216%', '%PR216%'], (err4, liveFlights) => {
                if (err4) {
                    console.error('Error querying live flights:', err4);
                } else if (liveFlights.length > 0) {
                    console.log('🛩️  Live flights matching PR216:');
                    liveFlights.forEach(flight => {
                        console.log(`   ${flight.flight_number || flight.callsign}: ${flight.departure_iata} → ${flight.arrival_iata}`);
                        console.log(`      Status: ${flight.flight_status} | Updated: ${flight.updated_at}`);
                    });
                } else {
                    console.log('❌ No live flights found for PR216');
                }
                
                db.close();
            });
        });
    });
});
