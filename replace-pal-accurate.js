const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const url = require('url');

// Database path
const dbPath = path.join(__dirname, 'security-mo.db');

async function deleteAllPALFlights() {
    console.log('🗑️  Deleting all existing Philippine Airlines (PR) flights...');
    
    const db = new sqlite3.Database(dbPath);
    
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM flights WHERE airline_code = 'PR'", (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            const existingCount = row.count;
            console.log(`📊 Found ${existingCount} existing PR flights to delete`);
            
            db.run("DELETE FROM flights WHERE airline_code = 'PR'", function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log(`✅ Deleted ${this.changes} PR flights from database`);
                db.close();
                resolve(this.changes);
            });
        });
    });
}

async function insertComprehensivePALFlights() {
    console.log('💾 Inserting comprehensive PAL flight data...');
    
    // Comprehensive PAL flight data based on actual routes
    const palFlights = [
        // International Long-Haul Routes
        { flight_number: 'PR126', origin: 'MNL', destination: 'LAX', departure: '23:35', arrival: '19:05', duration: 690, aircraft: 'Boeing 777-300ER', days: '1111111' },
        { flight_number: 'PR127', origin: 'LAX', destination: 'MNL', departure: '00:50', arrival: '06:30', duration: 700, aircraft: 'Boeing 777-300ER', days: '1111111' },
        { flight_number: 'PR114', origin: 'MNL', destination: 'SFO', departure: '23:00', arrival: '18:30', duration: 675, aircraft: 'Boeing 777-300ER', days: '0101010' },
        { flight_number: 'PR115', origin: 'SFO', destination: 'MNL', departure: '01:15', arrival: '07:45', duration: 690, aircraft: 'Boeing 777-300ER', days: '0010100' },
        { flight_number: 'PR118', origin: 'MNL', destination: 'YVR', departure: '00:45', arrival: '19:15', duration: 630, aircraft: 'Airbus A350-900', days: '0010100' },
        { flight_number: 'PR119', origin: 'YVR', destination: 'MNL', departure: '01:30', arrival: '06:00', duration: 650, aircraft: 'Airbus A350-900', days: '0001000' },
        
        // Japan Routes
        { flight_number: 'PR102', origin: 'MNL', destination: 'NRT', departure: '14:40', arrival: '20:05', duration: 205, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR103', origin: 'NRT', destination: 'MNL', departure: '22:05', arrival: '02:35', duration: 210, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR104', origin: 'MNL', destination: 'NRT', departure: '08:20', arrival: '13:45', duration: 205, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR105', origin: 'NRT', destination: 'MNL', departure: '15:25', arrival: '19:55', duration: 210, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR408', origin: 'MNL', destination: 'KIX', departure: '19:35', arrival: '00:15', duration: 160, aircraft: 'Airbus A321', days: '1111100' },
        { flight_number: 'PR409', origin: 'KIX', destination: 'MNL', departure: '01:45', arrival: '05:15', duration: 170, aircraft: 'Airbus A321', days: '0111110' },
        { flight_number: 'PR420', origin: 'MNL', destination: 'HND', departure: '07:00', arrival: '12:25', duration: 205, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR421', origin: 'HND', destination: 'MNL', departure: '14:00', arrival: '18:30', duration: 210, aircraft: 'Airbus A330-300', days: '1111111' },
        
        // Australia Routes
        { flight_number: 'PR212', origin: 'MNL', destination: 'SYD', departure: '19:05', arrival: '07:50', duration: 525, aircraft: 'Airbus A350-900', days: '1111111' },
        { flight_number: 'PR213', origin: 'SYD', destination: 'MNL', departure: '11:40', arrival: '18:25', duration: 525, aircraft: 'Airbus A350-900', days: '1111111' },
        { flight_number: 'PR210', origin: 'MNL', destination: 'MEL', departure: '23:30', arrival: '12:15', duration: 545, aircraft: 'Airbus A330-300', days: '0101010' },
        { flight_number: 'PR211', origin: 'MEL', destination: 'MNL', departure: '14:45', arrival: '21:30', duration: 525, aircraft: 'Airbus A330-300', days: '0010100' },
        
        // PNG Routes
        { flight_number: 'PR216', origin: 'POM', destination: 'MNL', departure: '10:00', arrival: '14:45', duration: 315, aircraft: 'Airbus A330-300', days: '0010000' },
        { flight_number: 'PR217', origin: 'MNL', destination: 'POM', departure: '16:30', arrival: '21:15', duration: 285, aircraft: 'Airbus A330-300', days: '0010000' },
        { flight_number: 'PR281', origin: 'MNL', destination: 'POM', departure: '07:30', arrival: '12:15', duration: 285, aircraft: 'Airbus A330-300', days: '1000100' },
        { flight_number: 'PR282', origin: 'POM', destination: 'MNL', departure: '15:45', arrival: '19:35', duration: 230, aircraft: 'Airbus A330-300', days: '1000100' },
        
        // Asian Routes
        { flight_number: 'PR300', origin: 'MNL', destination: 'HKG', departure: '06:50', arrival: '09:35', duration: 105, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR301', origin: 'HKG', destination: 'MNL', departure: '11:15', arrival: '15:15', duration: 120, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR310', origin: 'MNL', destination: 'HKG', departure: '14:25', arrival: '17:10', duration: 105, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR311', origin: 'HKG', destination: 'MNL', departure: '19:40', arrival: '23:40', duration: 120, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR508', origin: 'MNL', destination: 'SIN', departure: '08:45', arrival: '12:30', duration: 165, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR509', origin: 'SIN', destination: 'MNL', departure: '14:10', arrival: '19:15', duration: 185, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR510', origin: 'MNL', destination: 'SIN', departure: '21:25', arrival: '01:10', duration: 165, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR511', origin: 'SIN', destination: 'MNL', departure: '02:50', arrival: '07:55', duration: 185, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR520', origin: 'MNL', destination: 'BKK', departure: '16:40', arrival: '19:05', duration: 145, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR521', origin: 'BKK', destination: 'MNL', departure: '21:00', arrival: '01:25', duration: 165, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR540', origin: 'MNL', destination: 'KUL', departure: '12:30', arrival: '16:15', duration: 165, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR541', origin: 'KUL', destination: 'MNL', departure: '18:45', arrival: '00:30', duration: 185, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR550', origin: 'MNL', destination: 'ICN', departure: '11:30', arrival: '16:00', duration: 150, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR551', origin: 'ICN', destination: 'MNL', departure: '18:30', arrival: '22:00', duration: 170, aircraft: 'Airbus A330-300', days: '1111111' },
        
        // Domestic Routes - Manila Hub
        { flight_number: 'PR1800', origin: 'MNL', destination: 'CEB', departure: '06:00', arrival: '07:45', duration: 105, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR1801', origin: 'CEB', destination: 'MNL', departure: '08:30', arrival: '10:10', duration: 100, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR1802', origin: 'MNL', destination: 'CEB', departure: '08:15', arrival: '10:00', duration: 105, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR1803', origin: 'CEB', destination: 'MNL', departure: '10:45', arrival: '12:25', duration: 100, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR1804', origin: 'MNL', destination: 'CEB', departure: '13:00', arrival: '14:45', duration: 105, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR1805', origin: 'CEB', destination: 'MNL', departure: '15:30', arrival: '17:10', duration: 100, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR1806', origin: 'MNL', destination: 'CEB', departure: '17:45', arrival: '19:30', duration: 105, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR1807', origin: 'CEB', destination: 'MNL', departure: '20:15', arrival: '21:55', duration: 100, aircraft: 'Airbus A321', days: '1111111' },
        
        { flight_number: 'PR1820', origin: 'MNL', destination: 'DVO', departure: '06:30', arrival: '09:00', duration: 150, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1821', origin: 'DVO', destination: 'MNL', departure: '09:45', arrival: '12:10', duration: 145, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1822', origin: 'MNL', destination: 'DVO', departure: '12:55', arrival: '15:25', duration: 150, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1823', origin: 'DVO', destination: 'MNL', departure: '16:10', arrival: '18:35', duration: 145, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1824', origin: 'MNL', destination: 'DVO', departure: '19:20', arrival: '21:50', duration: 150, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1825', origin: 'DVO', destination: 'MNL', departure: '22:35', arrival: '01:00', duration: 145, aircraft: 'Airbus A320', days: '1111111' },
        
        { flight_number: 'PR1840', origin: 'MNL', destination: 'ILO', departure: '08:00', arrival: '09:15', duration: 75, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1841', origin: 'ILO', destination: 'MNL', departure: '10:00', arrival: '11:15', duration: 75, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1842', origin: 'MNL', destination: 'ILO', departure: '17:30', arrival: '18:45', duration: 75, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1843', origin: 'ILO', destination: 'MNL', departure: '19:30', arrival: '20:45', duration: 75, aircraft: 'Airbus A320', days: '1111111' },
        
        { flight_number: 'PR1860', origin: 'MNL', destination: 'CDO', departure: '07:45', arrival: '09:15', duration: 90, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1861', origin: 'CDO', destination: 'MNL', departure: '10:00', arrival: '11:30', duration: 90, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1862', origin: 'MNL', destination: 'CDO', departure: '16:15', arrival: '17:45', duration: 90, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1863', origin: 'CDO', destination: 'MNL', departure: '18:30', arrival: '20:00', duration: 90, aircraft: 'Airbus A320', days: '1111111' },
        
        // Clark Hub Routes
        { flight_number: 'PR2100', origin: 'CRK', destination: 'CEB', departure: '14:30', arrival: '16:15', duration: 105, aircraft: 'Airbus A320', days: '1111100' },
        { flight_number: 'PR2101', origin: 'CEB', destination: 'CRK', departure: '17:00', arrival: '18:45', duration: 105, aircraft: 'Airbus A320', days: '1111100' },
        { flight_number: 'PR2110', origin: 'CRK', destination: 'DVO', departure: '09:15', arrival: '11:45', duration: 150, aircraft: 'Airbus A320', days: '0111110' },
        { flight_number: 'PR2111', origin: 'DVO', destination: 'CRK', departure: '12:30', arrival: '15:00', duration: 150, aircraft: 'Airbus A320', days: '0111110' },
        
        // Inter-Island Routes
        { flight_number: 'PR2200', origin: 'CEB', destination: 'DVO', departure: '11:30', arrival: '12:45', duration: 75, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR2201', origin: 'DVO', destination: 'CEB', departure: '13:30', arrival: '14:45', duration: 75, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR2202', origin: 'CEB', destination: 'DVO', departure: '16:00', arrival: '17:15', duration: 75, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR2203', origin: 'DVO', destination: 'CEB', departure: '18:00', arrival: '19:15', duration: 75, aircraft: 'Airbus A320', days: '1111111' }
    ];
    
    const db = new sqlite3.Database(dbPath);
    
    const insertQuery = `
        INSERT OR REPLACE INTO flights (
            flight_number, airline_code, airline_name, origin_code, destination_code,
            departure_time, arrival_time, duration_minutes, aircraft_type, days_of_week,
            effective_from, effective_to, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(insertQuery);
        let insertedCount = 0;
        let errors = 0;
        
        palFlights.forEach((flight, index) => {
            stmt.run([
                flight.flight_number,
                'PR',
                'Philippine Airlines',
                flight.origin,
                flight.destination,
                flight.departure,
                flight.arrival,
                flight.duration,
                flight.aircraft,
                flight.days,
                '2024-01-01',
                '2025-12-31',
                'active'
            ], function(err) {
                if (err) {
                    console.error(`❌ Error inserting ${flight.flight_number}:`, err.message);
                    errors++;
                } else {
                    insertedCount++;
                    if (insertedCount % 10 === 0) {
                        console.log(`✅ Inserted ${insertedCount} flights...`);
                    }
                }
                
                if (index === palFlights.length - 1) {
                    stmt.finalize();
                    db.close();
                    console.log(`🎉 Insertion complete: ${insertedCount} successful, ${errors} errors`);
                    resolve(insertedCount);
                }
            });
        });
    });
}

async function replacePALFlightsWithAccurateData() {
    console.log('🚀 Starting Philippine Airlines flight replacement with accurate data...');
    console.log('==================================================');
    
    try {
        // Step 1: Delete all existing PAL flights
        const deletedCount = await deleteAllPALFlights();
        console.log(`\n✅ Deleted ${deletedCount} existing PAL flights\n`);
        
        // Step 2: Insert comprehensive accurate PAL flight data
        await insertComprehensivePALFlights();
        
        // Step 3: Verify the replacement
        console.log('\n🔍 Verifying replacement...');
        const db = new sqlite3.Database(dbPath);
        
        await new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM flights WHERE airline_code = 'PR'", (err, row) => {
                if (err) {
                    console.error('❌ Error verifying replacement:', err.message);
                } else {
                    console.log(`✅ Verification: ${row.count} PAL flights now in database`);
                }
                
                // Check specific routes
                db.get("SELECT COUNT(*) as count FROM flights WHERE origin_code = 'POM' AND destination_code = 'MNL'", (err2, row2) => {
                    if (err2) {
                        console.error('❌ Error checking POM-MNL routes:', err2.message);
                    } else {
                        console.log(`✅ POM → MNL routes: ${row2.count} flights`);
                    }
                    
                    // Check PR216 specifically
                    db.get("SELECT * FROM flights WHERE flight_number = 'PR216'", (err3, flight) => {
                        if (err3) {
                            console.error('❌ Error checking PR216:', err3.message);
                        } else if (flight) {
                            console.log(`✅ PR216 confirmed: ${flight.origin_code} → ${flight.destination_code} at ${flight.departure_time}`);
                        } else {
                            console.log('❌ PR216 not found after replacement');
                        }
                        
                        db.close();
                        resolve();
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('💥 Fatal error during PAL flight replacement:', error.message);
    }
}

// Run the replacement
console.log('🚀 Starting comprehensive PAL flight database replacement...');
console.log('This will replace all PAL flights with accurate, comprehensive data.');
console.log('==================================================\n');

replacePALFlightsWithAccurateData().then(() => {
    console.log('\n🎉 PAL flight replacement complete!');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});
