const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./security-mo.db');

console.log('=== All PR Flights from API Data ===\n');

// Query all live flights from AviationStack
db.all('SELECT * FROM live_flights ORDER BY flight_number', (err, rows) => {
    if (err) {
        console.error('Error querying live flights:', err);
        return;
    }
    
    console.log(`📋 Found ${rows.length} PR flights from AviationStack API:`);
    console.log('═══════════════════════════════════════════════════════════');
    
    rows.forEach((row, index) => {
        console.log(`${index + 1}. ✈️  ${row.flight_number || 'N/A'}`);
        console.log(`   📋 Status: ${row.flight_status || 'N/A'}`);
        console.log(`   🛫 ${row.departure_iata || '???'} → 🛬 ${row.arrival_iata || '???'}`);
        console.log(`   🏢 ${row.airline_name || 'N/A'}`);
        console.log(`   📅 Scheduled: ${row.departure_scheduled || 'N/A'}`);
        if (row.live_latitude && row.live_longitude) {
            console.log(`   📍 Live: ${row.live_latitude}, ${row.live_longitude} (${row.live_altitude}m)`);
        } else {
            console.log(`   📍 Live: Not tracking`);
        }
        console.log('   ─────────────────────────────────');
    });
    
    // Look specifically for PR101-related flights
    console.log('\n🔍 Searching for PR101 variants...');
    const pr101Variants = rows.filter(row => 
        row.flight_number?.includes('101') || 
        row.callsign?.includes('101') ||
        row.flight_number === 'PR101'
    );
    
    if (pr101Variants.length > 0) {
        console.log(`✅ Found ${pr101Variants.length} PR101-related flights:`);
        pr101Variants.forEach(flight => {
            console.log(`   ${flight.flight_number} (${flight.callsign}) - ${flight.flight_status}`);
        });
    } else {
        console.log('❌ No PR101 variants found in live data');
    }
    
    // Show PR100 which was in the API
    console.log('\n🔍 Checking PR100...');
    const pr100 = rows.find(row => row.flight_number === 'PR100');
    if (pr100) {
        console.log('✅ PR100 found:');
        console.log(`   Route: ${pr100.departure_iata} → ${pr100.arrival_iata}`);
        console.log(`   Status: ${pr100.flight_status}`);
        console.log(`   Scheduled: ${pr100.departure_scheduled}`);
    } else {
        console.log('❌ PR100 not found in live data');
    }
    
    db.close();
});
