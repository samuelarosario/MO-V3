const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'security-mo.db');

console.log('🔍 Verifying Google Flights API results...');
console.log('==========================================');

const db = new sqlite3.Database(dbPath);

// Check PR216 specifically
db.all("SELECT * FROM flights WHERE flight_number = 'PR 216'", (err, rows) => {
    if (err) {
        console.error('❌ Error checking PR 216:', err.message);
    } else {
        console.log(`\n✈️  PR 216 Flight Details:`);
        if (rows.length > 0) {
            rows.forEach(flight => {
                console.log(`   Flight: ${flight.flight_number}`);
                console.log(`   Route: ${flight.origin_code} → ${flight.destination_code}`);
                console.log(`   Time: ${flight.departure_time} → ${flight.arrival_time}`);
                console.log(`   Aircraft: ${flight.aircraft_type}`);
                console.log(`   Duration: ${flight.duration_minutes} minutes`);
                console.log(`   Days: ${flight.days_of_week}`);
                console.log(`   Status: ${flight.status}`);
            });
        } else {
            console.log('   ❌ No PR 216 flights found');
        }
    }
    
    // Check all POM-MNL routes
    db.all("SELECT * FROM flights WHERE origin_code = 'POM' AND destination_code = 'MNL'", (err2, rows2) => {
        if (err2) {
            console.error('❌ Error checking POM-MNL routes:', err2.message);
        } else {
            console.log(`\n🛫 All POM → MNL Routes (${rows2.length} flights):`);
            rows2.forEach(flight => {
                console.log(`   ${flight.flight_number} (${flight.airline_code}): ${flight.departure_time} → ${flight.arrival_time}, ${flight.aircraft_type}`);
            });
        }
        
        // Check total PR flights
        db.get("SELECT COUNT(*) as count FROM flights WHERE airline_code = 'PR'", (err3, row3) => {
            if (err3) {
                console.error('❌ Error counting PR flights:', err3.message);
            } else {
                console.log(`\n📊 Total Philippine Airlines flights: ${row3.count}`);
            }
            
            // Check international routes
            db.all(`SELECT DISTINCT origin_code, destination_code, COUNT(*) as flight_count 
                    FROM flights 
                    WHERE airline_code = 'PR' 
                    GROUP BY origin_code, destination_code 
                    ORDER BY origin_code, destination_code`, (err4, rows4) => {
                if (err4) {
                    console.error('❌ Error checking routes:', err4.message);
                } else {
                    console.log(`\n🌏 Philippine Airlines Route Summary:`);
                    rows4.forEach(route => {
                        console.log(`   ${route.origin_code} → ${route.destination_code}: ${route.flight_count} flights`);
                    });
                }
                
                db.close();
                console.log('\n🎉 Verification complete!');
            });
        });
    });
});
