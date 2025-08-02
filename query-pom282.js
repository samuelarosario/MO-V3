const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./security-mo.db');

console.log('=== POM282 Flight Information ===\n');

// Query scheduled flights
db.all('SELECT * FROM flights WHERE flight_number = ?', ['POM282'], (err, rows) => {
    if (err) {
        console.error('Error querying flights:', err);
        return;
    }
    
    console.log('📋 Scheduled Flight Data:');
    if (rows.length > 0) {
        rows.forEach(row => {
            console.log(`✈️  Flight: ${row.flight_number}`);
            console.log(`🛫 From: ${row.origin_code} (${row.departure_time})`);
            console.log(`🛬 To: ${row.destination_code} (${row.arrival_time})`);
            console.log(`🏢 Airline: ${row.airline_name} (${row.airline_code})`);
            console.log(`✈️  Aircraft: ${row.aircraft_type || 'Not specified'}`);
            console.log(`📅 Days: ${row.days_of_week || 'Not specified'}`);
            console.log(`⏱️  Duration: ${row.duration_minutes} minutes`);
            console.log(`📅 Valid: ${row.effective_from} to ${row.effective_to || 'ongoing'}`);
            console.log(`📊 Status: ${row.status}`);
            console.log('─────────────────────────────────');
        });
    } else {
        console.log('❌ No scheduled flight data found for POM282');
    }
    
    // Query live flights (AviationStack data)
    db.all('SELECT * FROM live_flights WHERE flight_number = ? OR callsign = ?', ['POM282', 'POM282'], (err2, liveRows) => {
        if (err2) {
            console.error('Error querying live flights:', err2);
        } else {
            console.log('\n🔴 Live Flight Data (AviationStack):');
            if (liveRows.length > 0) {
                liveRows.forEach(row => {
                    console.log(`✈️  Flight: ${row.flight_number || row.callsign} (${row.airline_name})`);
                    console.log(`📋 Status: ${row.flight_status || 'N/A'}`);
                    if (row.live_latitude && row.live_longitude) {
                        console.log(`📍 Position: ${row.live_latitude}, ${row.live_longitude}`);
                        console.log(`📏 Altitude: ${row.live_altitude} meters`);
                        console.log(`💨 Speed: ${row.live_speed_horizontal} km/h`);
                        console.log(`🧭 Direction: ${row.live_direction}°`);
                    } else {
                        console.log(`📍 Live tracking: Not available`);
                    }
                    console.log(`🛫 Departure: ${row.departure_airport} (${row.departure_iata}) - ${row.departure_scheduled}`);
                    console.log(`🛬 Arrival: ${row.arrival_airport} (${row.arrival_iata}) - ${row.arrival_scheduled}`);
                    console.log(`🛩️  Aircraft: ${row.aircraft_registration || 'N/A'}`);
                    console.log(`🕒 Updated: ${row.updated_at}`);
                    console.log('─────────────────────────────────');
                });
            } else {
                console.log('🔴 No live flight data (check AviationStack API)');
            }
        }
        
        // Also search for similar flight numbers (POM* pattern)
        console.log('\n🔍 Searching for similar POM flights...');
        db.all('SELECT flight_number, origin_code, destination_code, airline_name FROM flights WHERE flight_number LIKE ? ORDER BY flight_number', ['POM%'], (err3, similarRows) => {
            if (err3) {
                console.error('Error querying similar flights:', err3);
            } else if (similarRows.length > 0) {
                console.log('🛩️  Similar POM flights found:');
                similarRows.forEach(flight => {
                    console.log(`   ${flight.flight_number}: ${flight.origin_code} → ${flight.destination_code} (${flight.airline_name})`);
                });
            } else {
                console.log('❌ No POM* flights found in database');
            }
            
            db.close();
        });
    });
});
