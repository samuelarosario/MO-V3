const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Migration Script: AviationStack to SerpAPI
 * This script helps transition from AviationStack to SerpAPI integration
 */
class AviationStackToSerpAPIMigration {
    constructor() {
        this.dbPath = './security-mo.db';
        this.backupPath = './backup-before-serpapi-migration.db';
    }

    async runMigration() {
        console.log('🔄 Starting AviationStack → SerpAPI Migration');
        console.log('=============================================\n');

        try {
            // Step 1: Create backup
            await this.createBackup();

            // Step 2: Analyze current data
            await this.analyzeCurrentData();

            // Step 3: Create SerpAPI tables
            await this.createSerpAPITables();

            // Step 4: Migration summary
            await this.showMigrationSummary();

            console.log('✅ Migration completed successfully!');
            console.log('\n📋 Next Steps:');
            console.log('1. Test SerpAPI integration: node test-serpapi-comprehensive.js');
            console.log('2. Update database: node database-updater-serpapi.js');
            console.log('3. Start server with SerpAPI: node server.js');
            console.log('4. Test API endpoints: curl http://localhost:3000/api/serpapi/stats');

        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async createBackup() {
        console.log('💾 Step 1: Creating database backup...');
        
        try {
            if (fs.existsSync(this.dbPath)) {
                fs.copyFileSync(this.dbPath, this.backupPath);
                console.log(`✅ Backup created: ${this.backupPath}`);
            } else {
                console.log('⚠️  Original database not found, skipping backup');
            }
        } catch (error) {
            console.error('❌ Backup creation failed:', error);
            throw error;
        }
        console.log('');
    }

    async analyzeCurrentData() {
        console.log('📊 Step 2: Analyzing current database...');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Get table information
            db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, tables) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log('📋 Current tables:');
                tables.forEach(table => {
                    console.log(`   - ${table.name}`);
                });
                console.log('');

                // Get flight statistics
                db.get('SELECT COUNT(*) as count FROM flights', (err2, flightCount) => {
                    if (err2) {
                        console.log('   Flights table: Not accessible');
                    } else {
                        console.log(`📈 Flight statistics:`);
                        console.log(`   Scheduled flights: ${flightCount.count}`);
                    }

                    // Get live flights statistics (AviationStack)
                    db.get('SELECT COUNT(*) as count FROM live_flights', (err3, liveCount) => {
                        if (err3) {
                            console.log('   Live flights: 0 (table may not exist)');
                        } else {
                            console.log(`   AviationStack live flights: ${liveCount.count}`);
                        }

                        // Get airports count
                        db.get('SELECT COUNT(*) as count FROM airports', (err4, airportCount) => {
                            if (err4) {
                                console.log('   Airports: 0 (table may not exist)');
                            } else {
                                console.log(`   Airports: ${airportCount.count}`);
                            }
                            
                            db.close();
                            console.log('');
                            resolve();
                        });
                    });
                });
            });
        });
    }

    async createSerpAPITables() {
        console.log('🔧 Step 3: Creating SerpAPI tables...');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Create serpapi_flight_data table
            db.run(`
                CREATE TABLE IF NOT EXISTS serpapi_flight_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    flight_number TEXT,
                    search_title TEXT,
                    search_link TEXT,
                    search_snippet TEXT,
                    extracted_status TEXT,
                    extracted_airline TEXT,
                    extracted_departure_code TEXT,
                    extracted_arrival_code TEXT,
                    extracted_departure_time TEXT,
                    extracted_arrival_time TEXT,
                    search_date TEXT,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(flight_number, search_date)
                )
            `, (err1) => {
                if (err1) {
                    console.error('❌ Error creating serpapi_flight_data table:', err1);
                    reject(err1);
                    return;
                }
                console.log('✅ Created serpapi_flight_data table');

                // Create live_flights_serpapi table
                db.run(`
                    CREATE TABLE IF NOT EXISTS live_flights_serpapi (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        flight_number TEXT,
                        airline_name TEXT,
                        departure_airport TEXT,
                        departure_code TEXT,
                        departure_time TEXT,
                        arrival_airport TEXT,
                        arrival_code TEXT,
                        arrival_time TEXT,
                        flight_status TEXT,
                        search_source TEXT,
                        search_snippet TEXT,
                        search_link TEXT,
                        price_info TEXT,
                        currency TEXT,
                        duration TEXT,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err2) => {
                    if (err2) {
                        console.error('❌ Error creating live_flights_serpapi table:', err2);
                        reject(err2);
                        return;
                    }
                    console.log('✅ Created live_flights_serpapi table');

                    // Create serpapi_search_log table for tracking API usage
                    db.run(`
                        CREATE TABLE IF NOT EXISTS serpapi_search_log (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            search_type TEXT,
                            search_query TEXT,
                            results_count INTEGER,
                            api_response_time INTEGER,
                            success BOOLEAN,
                            error_message TEXT,
                            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (err3) => {
                        if (err3) {
                            console.error('❌ Error creating serpapi_search_log table:', err3);
                            reject(err3);
                            return;
                        }
                        console.log('✅ Created serpapi_search_log table');

                        db.close();
                        console.log('');
                        resolve();
                    });
                });
            });
        });
    }

    async showMigrationSummary() {
        console.log('📋 Step 4: Migration Summary');
        console.log('============================');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, [], (err, tables) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log('📊 Database tables after migration:');
                
                const originalTables = [];
                const serpApiTables = [];
                
                tables.forEach(table => {
                    if (table.name.includes('serpapi')) {
                        serpApiTables.push(table.name);
                    } else {
                        originalTables.push(table.name);
                    }
                });
                
                console.log('\n🔹 Original tables (preserved):');
                originalTables.forEach(table => {
                    console.log(`   ✅ ${table}`);
                });
                
                console.log('\n🔹 New SerpAPI tables:');
                serpApiTables.forEach(table => {
                    console.log(`   🆕 ${table}`);
                });
                
                console.log('\n🔧 Migration Status:');
                console.log('   ✅ Database backed up');
                console.log('   ✅ Original data preserved');
                console.log('   ✅ SerpAPI tables created');
                console.log('   ✅ Ready for SerpAPI integration');
                
                console.log('\n⚡ Performance Notes:');
                console.log('   - AviationStack data remains accessible');
                console.log('   - SerpAPI data will be stored separately');
                console.log('   - Both APIs can run in parallel during transition');
                console.log('   - Original flights and airports data unchanged');
                
                db.close();
                console.log('');
                resolve();
            });
        });
    }

    async rollback() {
        console.log('🔄 Rolling back migration...');
        
        try {
            if (fs.existsSync(this.backupPath)) {
                fs.copyFileSync(this.backupPath, this.dbPath);
                console.log('✅ Database restored from backup');
            } else {
                console.log('❌ No backup found, cannot rollback');
            }
        } catch (error) {
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const migration = new AviationStackToSerpAPIMigration();
    const command = process.argv[2];

    if (command === 'rollback') {
        migration.rollback()
            .then(() => {
                console.log('✅ Rollback completed');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Rollback failed:', error);
                process.exit(1);
            });
    } else {
        migration.runMigration()
            .then(() => {
                console.log('✅ Migration completed successfully!');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Migration failed:', error);
                console.log('\n🔄 To rollback: node migration-aviationstack-to-serpapi.js rollback');
                process.exit(1);
            });
    }
}

module.exports = AviationStackToSerpAPIMigration;
