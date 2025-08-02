const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'security-mo.db');

console.log('=== Major Airlines Data Verification ===\n');
console.log('📍 Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        return;
    }
    
    console.log('✅ Connected to security-mo.db');
    
    // Check total flights
    db.get('SELECT COUNT(*) as count FROM flights', (err, row) => {
        if (err) {
            console.error('Error getting total count:', err.message);
        } else {
            console.log(`📊 Total flights in database: ${row.count}`);
        }
    });
    
    // Check major airlines
    const majorAirlines = ['AA', 'DL', 'UA', 'B6', 'BA', 'EK', 'QR', 'LH'];
    
    console.log('\n📊 Major Airlines Flight Counts:');
    
    let checked = 0;
    majorAirlines.forEach(code => {
        db.get('SELECT COUNT(*) as count FROM flights WHERE airline_code = ?', [code], (err, row) => {
            if (err) {
                console.error(`Error checking ${code}:`, err.message);
            } else if (row.count > 0) {
                console.log(`   ✈️  ${code}: ${row.count} flights`);
            }
            
            checked++;
            if (checked === majorAirlines.length) {
                // Show some sample American Airlines flights
                console.log('\n🇺🇸 American Airlines (AA) sample flights:');
                db.all('SELECT flight_number, departure_airport, arrival_airport, departure_time, arrival_time FROM flights WHERE airline_code = ? LIMIT 5', ['AA'], (err, rows) => {
                    if (err) {
                        console.error('Error getting AA flights:', err.message);
                    } else {
                        rows.forEach(f => {
                            console.log(`   AA ${f.flight_number}: ${f.departure_airport} → ${f.arrival_airport} (${f.departure_time} → ${f.arrival_time})`);
                        });
                    }
                    
                    // Show some Emirates flights
                    console.log('\n🇦🇪 Emirates (EK) sample flights:');
                    db.all('SELECT flight_number, departure_airport, arrival_airport, aircraft_type FROM flights WHERE airline_code = ? LIMIT 3', ['EK'], (err, rows) => {
                        if (err) {
                            console.error('Error getting EK flights:', err.message);
                        } else {
                            rows.forEach(f => {
                                console.log(`   EK ${f.flight_number}: ${f.departure_airport} → ${f.arrival_airport} (${f.aircraft_type || 'N/A'})`);
                            });
                        }
                        
                        // Count unique airlines
                        db.get('SELECT COUNT(DISTINCT airline_code) as count FROM flights', (err, row) => {
                            if (err) {
                                console.error('Error getting unique airlines:', err.message);
                            } else {
                                console.log(`\n🏢 Unique airlines: ${row.count}`);
                            }
                            
                            console.log('\n✅ Major airlines data verification complete!');
                            db.close();
                        });
                    });
                });
            }
        });
    });
});
