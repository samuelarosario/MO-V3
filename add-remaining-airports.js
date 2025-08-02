// Add remaining missing airports
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./security-mo.db');

const remainingAirports = [
    { code: 'MAG', name: 'Madang Airport', city: 'Madang', country: 'Papua New Guinea', timezone: 'Pacific/Port_Moresby' },
    { code: 'DVO', name: 'Francisco Bangoy International Airport', city: 'Davao', country: 'Philippines', timezone: 'Asia/Manila' },
    { code: 'ZAM', name: 'Zamboanga Airport', city: 'Zamboanga', country: 'Philippines', timezone: 'Asia/Manila' }
];

console.log('🏢 Adding remaining missing airports...\n');

const insertPromises = remainingAirports.map(airport => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT OR IGNORE INTO airports (code, name, city, country, timezone)
            VALUES (?, ?, ?, ?, ?)
        `, [airport.code, airport.name, airport.city, airport.country, airport.timezone], 
        function(err) {
            if (err) {
                reject(err);
            } else {
                console.log(`✅ Added ${airport.code} - ${airport.name}`);
                resolve();
            }
        });
    });
});

Promise.all(insertPromises).then(() => {
    console.log('\n🎯 All remaining airports added successfully!');
    
    // Verify PR103 fix
    db.get(`
        SELECT flight_number, origin_code, destination_code, departure_time, arrival_time, aircraft_type
        FROM flights 
        WHERE flight_number = 'PR103' AND airline_code = 'PR'
    `, [], (err, pr103) => {
        if (err) {
            console.error('Error checking PR103:', err);
        } else if (pr103) {
            console.log('\n✈️  PR103 Verification:');
            console.log(`   Flight: ${pr103.flight_number}`);
            console.log(`   Route: ${pr103.origin_code} → ${pr103.destination_code}`);
            console.log(`   Time: ${pr103.departure_time} → ${pr103.arrival_time}`);
            console.log(`   Aircraft: ${pr103.aircraft_type}`);
            console.log(`   Status: ${pr103.origin_code === 'LAX' && pr103.destination_code === 'MNL' ? '✅ CORRECT' : '❌ STILL WRONG'}`);
        } else {
            console.log('\n❌ PR103 not found in database');
        }
        
        db.close();
    });
}).catch(error => {
    console.error('❌ Error adding airports:', error);
    db.close();
});
