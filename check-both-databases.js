const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Check both database files
const databases = [
    { name: 'security-mo.db', path: path.join(__dirname, 'database', 'security-mo.db') },
    { name: 'external-source.db', path: path.join(__dirname, 'database', 'external-source.db') }
];

async function checkDatabase(dbInfo) {
    return new Promise((resolve) => {
        console.log(`\n🔍 Checking database: ${dbInfo.name}`);
        console.log(`📂 Path: ${dbInfo.path}`);
        
        const db = new sqlite3.Database(dbInfo.path, (err) => {
            if (err) {
                console.error(`❌ Error opening ${dbInfo.name}:`, err.message);
                resolve();
                return;
            }
            console.log(`✅ Connected to ${dbInfo.name}`);
        });

        // Get all tables
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
            if (err) {
                console.error(`❌ Error getting tables from ${dbInfo.name}:`, err.message);
                db.close();
                resolve();
                return;
            }
            
            console.log(`📋 Tables in ${dbInfo.name}:`);
            console.log('==================================================');
            
            if (rows.length === 0) {
                console.log('❌ No tables found');
                db.close();
                resolve();
                return;
            }
            
            rows.forEach(row => {
                console.log(`📊 Table: ${row.name}`);
            });
            
            // Check for flights-related tables
            const flightTables = rows.filter(row => 
                row.name.toLowerCase().includes('flight') || 
                row.name.toLowerCase().includes('pr') ||
                row.name === 'flights'
            );
            
            if (flightTables.length > 0) {
                console.log(`\n🛩️ Flight-related tables found:`);
                flightTables.forEach(table => {
                    console.log(`  📊 ${table.name}`);
                });
                
                // Check the first flight table for PR216
                const firstTable = flightTables[0].name;
                db.get(`SELECT COUNT(*) as count FROM ${firstTable}`, (err, row) => {
                    if (err) {
                        console.error(`❌ Error counting records in ${firstTable}:`, err.message);
                    } else {
                        console.log(`📊 Records in ${firstTable}: ${row.count}`);
                    }
                    
                    // Look for PR216
                    db.get(`SELECT * FROM ${firstTable} WHERE flight_number = 'PR216' OR flight_number LIKE '%PR216%' LIMIT 1`, (err, flight) => {
                        if (err) {
                            console.error(`❌ Error searching for PR216:`, err.message);
                        } else if (flight) {
                            console.log(`✅ PR216 found in ${firstTable}:`);
                            console.log(flight);
                        } else {
                            console.log(`❌ PR216 not found in ${firstTable}`);
                        }
                        
                        db.close();
                        resolve();
                    });
                });
            } else {
                db.close();
                resolve();
            }
        });
    });
}

async function main() {
    for (const db of databases) {
        await checkDatabase(db);
    }
    console.log('\n🎉 Database check complete!');
}

main();
