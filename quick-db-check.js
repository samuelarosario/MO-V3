// Quick DB Check - List all PR flights
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./security-mo.db');

console.log('🔍 Current PR flights in database:\n');

const query = `
    SELECT 
        flight_number,
        origin_code,
        destination_code,
        departure_time,
        arrival_time,
        aircraft_type
    FROM flights
    WHERE airline_code = 'PR'
    ORDER BY flight_number
`;

db.all(query, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('┌─────────────┬───────────────┬─────────────┬─────────────┬─────────────────────────┐');
        console.log('│ Flight      │ Route         │ Departure   │ Arrival     │ Aircraft                │');
        console.log('├─────────────┼───────────────┼─────────────┼─────────────┼─────────────────────────┤');
        
        rows.forEach(flight => {
            const flightNum = flight.flight_number.padEnd(11);
            const route = `${flight.origin_code}-${flight.destination_code}`.padEnd(13);
            const dep = flight.departure_time.padEnd(11);
            const arr = flight.arrival_time.padEnd(11);
            const aircraft = flight.aircraft_type.padEnd(23);
            console.log(`│ ${flightNum} │ ${route} │ ${dep} │ ${arr} │ ${aircraft} │`);
        });
        
        console.log('└─────────────┴───────────────┴─────────────┴─────────────┴─────────────────────────┘');
        console.log(`\nTotal PR flights: ${rows.length}`);
    }
    db.close();
});
