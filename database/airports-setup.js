const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'security-mo.db');

async function initializeAirportsDatabase() {
    console.log('✈️  Initializing airports database...');
    
    const db = new sqlite3.Database(dbPath);
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Read and execute airports schema and data
            const schemaPath = path.join(__dirname, 'airports-sqlite.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            db.exec(schema, (err) => {
                if (err) {
                    console.error('❌ Error creating airports schema:', err);
                    reject(err);
                    return;
                }
                
                console.log('✅ Airports schema and data inserted successfully');
                
                // Test the setup
                db.all("SELECT COUNT(*) as count FROM airports", (err, rows) => {
                    if (err) {
                        console.error('❌ Error testing airports database:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log(`✅ Airport database test successful! Found ${rows[0].count} airports`);
                    
                    // Test search functionality
                    db.all(`
                        SELECT code, name, city, country 
                        FROM airports 
                        WHERE code LIKE '%MNL%' OR city LIKE '%Manila%' 
                        LIMIT 5
                    `, (err, searchResults) => {
                        if (err) {
                            console.error('❌ Error testing airport search:', err);
                            reject(err);
                            return;
                        }
                        
                        console.log('✅ Airport search test successful!');
                        if (searchResults.length > 0) {
                            console.log('Sample result:', searchResults[0]);
                        }
                        
                        resolve(db);
                    });
                });
            });
        });
    });
}

module.exports = { initializeAirportsDatabase };
