const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./security-mo.db');

console.log('=== Searching for POM282 and POM-related flights ===\n');

// Check if POM airport exists
db.all('SELECT * FROM airports WHERE code = ?', ['POM'], (err, airports) => {
    if (err) {
        console.error('Error querying airports:', err);
        return;
    }
    
    if (airports.length > 0) {
        const airport = airports[0];
        console.log('🏢 POM Airport Information:');
        console.log(`   ${airport.name} (${airport.code})`);
        console.log(`   📍 ${airport.city}, ${airport.country}`);
        console.log(`   🌐 ${airport.latitude}, ${airport.longitude}`);
        console.log('');
    } else {
        console.log('❌ POM airport not found in database\n');
    }
    
    // Search for flights to/from POM
    db.all('SELECT * FROM flights WHERE origin_code = ? OR destination_code = ? ORDER BY flight_number', ['POM', 'POM'], (err2, pomFlights) => {
        if (err2) {
            console.error('Error querying POM flights:', err2);
        } else if (pomFlights.length > 0) {
            console.log('✈️  Flights to/from POM (Port Moresby):');
            pomFlights.forEach(flight => {
                console.log(`   ${flight.flight_number}: ${flight.origin_code} → ${flight.destination_code}`);
                console.log(`      ${flight.airline_name} | ${flight.departure_time} → ${flight.arrival_time}`);
                console.log(`      Aircraft: ${flight.aircraft_type || 'N/A'} | Status: ${flight.status || 'scheduled'}`);
                console.log('');
            });
        } else {
            console.log('❌ No flights found to/from POM\n');
        }
        
        // Search for any flight containing "282"
        console.log('🔍 Searching for flights containing "282"...');
        db.all('SELECT * FROM flights WHERE flight_number LIKE ? ORDER BY flight_number', ['%282%'], (err3, similarFlights) => {
            if (err3) {
                console.error('Error querying similar flights:', err3);
            } else if (similarFlights.length > 0) {
                console.log('🛩️  Flights containing "282":');
                similarFlights.forEach(flight => {
                    console.log(`   ${flight.flight_number}: ${flight.origin_code} → ${flight.destination_code} (${flight.airline_name})`);
                });
            } else {
                console.log('❌ No flights found containing "282"');
            }
            
            // Check live_flights table as well
            console.log('\n🔴 Checking live flights for POM282...');
            db.all('SELECT * FROM live_flights WHERE flight_number LIKE ? OR callsign LIKE ? ORDER BY updated_at DESC', ['%POM282%', '%POM282%'], (err4, liveFlights) => {
                if (err4) {
                    console.error('Error querying live flights:', err4);
                } else if (liveFlights.length > 0) {
                    console.log('🛩️  Live flights matching POM282:');
                    liveFlights.forEach(flight => {
                        console.log(`   ${flight.flight_number || flight.callsign}: ${flight.departure_iata} → ${flight.arrival_iata}`);
                        console.log(`      ${flight.airline_name} | Status: ${flight.flight_status}`);
                        console.log(`      Updated: ${flight.updated_at}`);
                    });
                } else {
                    console.log('❌ No live flights found for POM282');
                }
                
                db.close();
            });
        });
    });
});
