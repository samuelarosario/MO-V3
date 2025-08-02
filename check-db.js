const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./security-mo.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Connected to SQLite database');
});

console.log('=== DATABASE TABLES ===');
db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, tables) => {
    if (err) {
        console.error('Error getting tables:', err);
        return;
    }
    tables.forEach(table => console.log('- ' + table.name));
    
    console.log('\n=== AIRPORTS SAMPLE ===');
    db.all('SELECT * FROM airports LIMIT 5', [], (err, airports) => {
        if (err) {
            console.error('Error getting airports:', err);
            return;
        }
        console.log(airports);
        
        console.log('\n=== CURRENT FLIGHTS FROM MNL (Philippine Airlines) ===');
        db.all(`
            SELECT f.*, a1.name as origin_name, a2.name as dest_name 
            FROM flights f 
            JOIN airports a1 ON f.origin_code = a1.code 
            JOIN airports a2 ON f.destination_code = a2.code 
            WHERE f.origin_code = 'MNL' AND f.airline_code = 'PR'
            LIMIT 10
        `, [], (err, flights) => {
            if (err) {
                console.error('Error getting flights:', err);
                return;
            }
            console.log(flights);
            
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('\nDatabase connection closed');
                }
            });
        });
    });
});
