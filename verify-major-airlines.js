const Database = require('better-sqlite3');

try {
    const db = new Database('./database/security-mo.db');
    
    console.log('=== Major Airlines Data Verification ===\n');
    
    // Check major airlines
    const majorAirlines = ['AA', 'DL', 'UA', 'WN', 'B6', 'BA', 'LH', 'AF', 'KL', 'EK', 'QR', 'TK', 'CX', 'SQ'];
    
    console.log('📊 Major Airlines Flight Counts:');
    for (const code of majorAirlines) {
        const count = db.prepare('SELECT COUNT(*) as count FROM flights WHERE airline_code = ?').get(code);
        if (count.count > 0) {
            console.log(`   ✈️  ${code}: ${count.count} flights`);
        }
    }
    
    console.log('\n🔍 Sample flights from major carriers:');
    
    // Show American Airlines samples
    console.log('\n🇺🇸 American Airlines (AA) sample flights:');
    const aa_flights = db.prepare('SELECT flight_number, departure_airport, arrival_airport, departure_time, arrival_time FROM flights WHERE airline_code = ? LIMIT 5').all('AA');
    aa_flights.forEach(f => {
        console.log(`   AA ${f.flight_number}: ${f.departure_airport} → ${f.arrival_airport} (${f.departure_time} → ${f.arrival_time})`);
    });
    
    // Show Emirates samples
    console.log('\n🇦🇪 Emirates (EK) sample flights:');
    const ek_flights = db.prepare('SELECT flight_number, departure_airport, arrival_airport, aircraft_type FROM flights WHERE airline_code = ? LIMIT 3').all('EK');
    ek_flights.forEach(f => {
        console.log(`   EK ${f.flight_number}: ${f.departure_airport} → ${f.arrival_airport} (${f.aircraft_type})`);
    });
    
    // Show British Airways samples
    console.log('\n🇬🇧 British Airways (BA) sample flights:');
    const ba_flights = db.prepare('SELECT flight_number, departure_airport, arrival_airport, aircraft_type FROM flights WHERE airline_code = ? LIMIT 3').all('BA');
    ba_flights.forEach(f => {
        console.log(`   BA ${f.flight_number}: ${f.departure_airport} → ${f.arrival_airport} (${f.aircraft_type})`);
    });
    
    // Total count
    const total = db.prepare('SELECT COUNT(*) as count FROM flights').get();
    console.log(`\n📊 Total flights in database: ${total.count}`);
    
    // Unique airlines count
    const uniqueAirlines = db.prepare('SELECT COUNT(DISTINCT airline_code) as count FROM flights').get();
    console.log(`🏢 Unique airlines: ${uniqueAirlines.count}`);
    
    db.close();
    console.log('\n✅ Major airlines data verification complete!');
    
} catch (error) {
    console.error('❌ Error verifying database:', error.message);
}
