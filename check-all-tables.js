const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database', 'security-mo.db');

console.log('🔍 Checking all database tables...');
console.log(`📂 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('❌ Error getting tables:', err.message);
        return;
    }
    
    console.log('\n📋 Available tables:');
    console.log('==================================================');
    rows.forEach(row => {
        console.log(`📊 Table: ${row.name}`);
    });
    
    if (rows.length === 0) {
        console.log('❌ No tables found in database');
        db.close();
        return;
    }
    
    // Check schema for each table
    let tablesChecked = 0;
    rows.forEach(table => {
        db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
            if (err) {
                console.error(`❌ Error getting schema for ${table.name}:`, err.message);
            } else {
                console.log(`\n🔍 Schema for table '${table.name}':`);
                columns.forEach(col => {
                    console.log(`  ${col.name} (${col.type}) - ${col.pk ? 'PRIMARY KEY' : ''} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
                });
                
                // Count records
                db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
                    if (err) {
                        console.error(`❌ Error counting records in ${table.name}:`, err.message);
                    } else {
                        console.log(`  📊 Records: ${row.count}`);
                    }
                    
                    tablesChecked++;
                    if (tablesChecked === rows.length) {
                        db.close();
                    }
                });
            }
        });
    });
});
