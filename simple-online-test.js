// Simple online resource test
const OnlineFlightDataFetcher = require('./online-flight-fetcher');

console.log('🌐 Testing online flight data fetcher...\n');

const fetcher = new OnlineFlightDataFetcher();

// Test just the AviationStack simulation
fetcher.fetchFromAviationStack()
    .then(data => {
        console.log('✅ AviationStack test completed');
        console.log(`Flights retrieved: ${data.length}`);
        
        if (data.length > 0) {
            console.log('\n📋 First flight data:');
            const flight = data[0];
            console.log(`Flight: ${flight.flight_number}`);
            console.log(`Route: ${flight.origin_code} → ${flight.destination_code}`);
            console.log(`Departure: ${flight.departure_time}`);
            console.log(`Arrival: ${flight.arrival_time}`);
            console.log(`Aircraft: ${flight.aircraft_type}`);
            console.log(`Duration: ${flight.duration_minutes} minutes`);
        }
    })
    .catch(err => {
        console.error('❌ Error:', err);
    });
