const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'security-mo.db');

console.log('=== Major Airlines Verification ===\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        return;
    }
    
    console.log('✅ Connected to security-mo.db');
    
    // Get total flight count
    db.get('SELECT COUNT(*) as count FROM flights', (err, row) => {
        if (err) {
            console.error('Error getting total count:', err.message);
        } else {
            console.log(`📊 Total flights in database: ${row.count}`);
        }
        
        // Get airline breakdown
        db.all(`SELECT airline_code, airline_name, COUNT(*) as count 
                FROM flights 
                WHERE airline_code IN ('AA', 'DL', 'UA', 'B6', 'WN', 'BA', 'LH', 'AF', 'KL', 'EK', 'QR', 'TK', 'CX', 'SQ', 'F9', 'NK', 'AS')
                GROUP BY airline_code, airline_name 
                ORDER BY count DESC`, (err, rows) => {
            if (err) {
                console.error('Error getting airline breakdown:', err.message);
            } else {
                console.log('\n🏢 Major Airlines in Database:');
                rows.forEach(row => {
                    console.log(`   ✈️  ${row.airline_code} (${row.airline_name}): ${row.count} flights`);
                });
                
                if (rows.length === 0) {
                    console.log('   ❌ No major airlines found');
                }
            }
            
            // Show some sample flights from American Airlines
            db.all(`SELECT flight_number, origin_code, destination_code, departure_time, arrival_time, aircraft_type
                    FROM flights 
                    WHERE airline_code = 'AA' 
                    LIMIT 5`, (err, rows) => {
                if (err) {
                    console.error('Error getting AA flights:', err.message);
                } else if (rows.length > 0) {
                    console.log('\n🇺🇸 American Airlines (AA) Sample Flights:');
                    rows.forEach(f => {
                        console.log(`   ${f.flight_number}: ${f.origin_code} → ${f.destination_code} (${f.departure_time} → ${f.arrival_time}) [${f.aircraft_type || 'N/A'}]`);
                    });
                }
                
                // Show some Emirates flights if available
                db.all(`SELECT flight_number, origin_code, destination_code, departure_time, arrival_time, aircraft_type
                        FROM flights 
                        WHERE airline_code = 'EK' 
                        LIMIT 3`, (err, rows) => {
                    if (err) {
                        console.error('Error getting EK flights:', err.message);
                    } else if (rows.length > 0) {
                        console.log('\n🇦🇪 Emirates (EK) Sample Flights:');
                        rows.forEach(f => {
                            console.log(`   ${f.flight_number}: ${f.origin_code} → ${f.destination_code} (${f.departure_time} → ${f.arrival_time}) [${f.aircraft_type || 'N/A'}]`);
                        });
                    }
                    
                    console.log('\n✅ Verification complete!');
                    db.close();
                });
            });
        });
    });
});
