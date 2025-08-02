const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'security-mo.db');

console.log('🔍 Investigating PR282 data source...');

const db = new sqlite3.Database(dbPath);

// Check PR282 details
db.get("SELECT * FROM flights WHERE flight_number = 'PR282'", (err, row) => {
    if (err) {
        console.error('❌ Error querying PR282:', err.message);
    } else if (row) {
        console.log('📊 PR282 Details:');
        console.log('==================================================');
        console.log('Flight Number:', row.flight_number);
        console.log('Route:', row.origin_code, '→', row.destination_code);
        console.log('Schedule:', row.departure_time, '→', row.arrival_time);
        console.log('Duration:', row.duration_minutes, 'minutes');
        console.log('Aircraft:', row.aircraft_type);
        console.log('Days of Week:', row.days_of_week);
        console.log('Created At:', row.created_at);
        console.log('Status:', row.status);
        console.log('');
        
        // Check if this is old or new data
        const createdDate = new Date(row.created_at);
        const today = new Date();
        const timeDiff = today - createdDate;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < 1) {
            console.log('✅ This appears to be NEW data (created within last hour)');
        } else {
            console.log('⚠️  This appears to be OLD data (created more than 1 hour ago)');
        }
        
    } else {
        console.log('❌ PR282 not found');
    }
    
    // Check all POM → MNL flights with creation times
    db.all("SELECT flight_number, origin_code, destination_code, departure_time, arrival_time, duration_minutes, created_at FROM flights WHERE origin_code = 'POM' AND destination_code = 'MNL' ORDER BY flight_number", (err2, rows) => {
        if (err2) {
            console.error('❌ Error querying POM → MNL flights:', err2.message);
        } else {
            console.log('📊 All POM → MNL flights with timestamps:');
            console.log('==================================================');
            rows.forEach(row => {
                const createdDate = new Date(row.created_at);
                const today = new Date();
                const hoursDiff = (today - createdDate) / (1000 * 60 * 60);
                const isNew = hoursDiff < 1 ? '🆕 NEW' : '📰 OLD';
                
                console.log(`${row.flight_number}: ${row.departure_time} → ${row.arrival_time} (${row.duration_minutes}min) ${isNew}`);
                console.log(`   Created: ${row.created_at}`);
            });
        }
        
        db.close();
    });
});
