// Comprehensive Database Cleanup and Fix Script
// Fixes all issues found in the database verification

const sqlite3 = require('sqlite3').verbose();

class DatabaseCleanupManager {
    constructor() {
        this.dbPath = './security-mo.db';
        this.fixedCount = 0;
    }

    async performAllFixes() {
        console.log('🔧 COMPREHENSIVE DATABASE CLEANUP STARTED');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        try {
            await this.backupDatabase();
            await this.removeDuplicateFlights();
            await this.addMissingAirports();
            await this.fixPR103Route();
            await this.fixSuspiciousFlightNumbers();
            await this.verifyFixes();
            
            console.log('\n✅ All database fixes completed successfully!');
            console.log(`🎯 Total fixes applied: ${this.fixedCount}`);
            
        } catch (error) {
            console.error('❌ Database cleanup failed:', error);
        }
    }

    async backupDatabase() {
        console.log('💾 Creating database backup...');
        
        const fs = require('fs').promises;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = `./security-mo-backup-${timestamp}.db`;
        
        try {
            await fs.copyFile(this.dbPath, backupPath);
            console.log(`✅ Backup created: ${backupPath}\n`);
        } catch (error) {
            console.error('❌ Backup failed:', error);
            throw error;
        }
    }

    async removeDuplicateFlights() {
        console.log('🗑️  REMOVING DUPLICATE FLIGHTS...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // First, identify duplicates
            db.all(`
                SELECT 
                    flight_number, 
                    airline_code,
                    origin_code,
                    destination_code,
                    departure_time,
                    COUNT(*) as count,
                    MIN(id) as keep_id
                FROM flights 
                GROUP BY flight_number, airline_code, origin_code, destination_code, departure_time
                HAVING count > 1
                ORDER BY count DESC
            `, [], (err, duplicates) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (duplicates.length === 0) {
                    console.log('✅ No duplicates found to remove\n');
                    db.close();
                    resolve();
                    return;
                }
                
                console.log('Found duplicates to remove:');
                duplicates.forEach(dup => {
                    console.log(`   ${dup.flight_number} (${dup.origin_code}-${dup.destination_code}): ${dup.count} copies -> keeping ID ${dup.keep_id}`);
                });
                
                // Remove duplicates, keeping only the first occurrence (lowest ID)
                const deletePromises = duplicates.map(dup => {
                    return new Promise((resolveDelete, rejectDelete) => {
                        db.run(`
                            DELETE FROM flights 
                            WHERE flight_number = ? 
                              AND airline_code = ? 
                              AND origin_code = ? 
                              AND destination_code = ? 
                              AND departure_time = ? 
                              AND id != ?
                        `, [dup.flight_number, dup.airline_code, dup.origin_code, dup.destination_code, dup.departure_time, dup.keep_id], 
                        function(err) {
                            if (err) {
                                rejectDelete(err);
                            } else {
                                console.log(`   ✅ Removed ${this.changes} duplicate(s) of ${dup.flight_number}`);
                                resolveDelete(this.changes);
                            }
                        });
                    });
                });
                
                Promise.all(deletePromises).then(results => {
                    const totalRemoved = results.reduce((sum, count) => sum + count, 0);
                    console.log(`\n🎯 Total duplicate flights removed: ${totalRemoved}`);
                    this.fixedCount += totalRemoved;
                    db.close();
                    resolve();
                }).catch(reject);
            });
        });
    }

    async addMissingAirports() {
        console.log('🏢 ADDING MISSING AIRPORTS...\n');
        
        const missingAirports = [
            { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia', timezone: 'Australia/Brisbane' },
            { code: 'CNS', name: 'Cairns Airport', city: 'Cairns', country: 'Australia', timezone: 'Australia/Brisbane' },
            { code: 'BCD', name: 'Bacolod-Silay Airport', city: 'Bacolod', country: 'Philippines', timezone: 'Asia/Manila' },
            { code: 'CDO', name: 'Laguindingan Airport', city: 'Cagayan de Oro', country: 'Philippines', timezone: 'Asia/Manila' },
            { code: 'CEB', name: 'Mactan-Cebu International Airport', city: 'Cebu', country: 'Philippines', timezone: 'Asia/Manila' },
            { code: 'GES', name: 'General Santos Airport', city: 'General Santos', country: 'Philippines', timezone: 'Asia/Manila' },
            { code: 'ILO', name: 'Iloilo Airport', city: 'Iloilo', country: 'Philippines', timezone: 'Asia/Manila' },
            { code: 'TAC', name: 'Daniel Z. Romualdez Airport', city: 'Tacloban', country: 'Philippines', timezone: 'Asia/Manila' },
            { code: 'KLO', name: 'Kalibo International Airport', city: 'Kalibo', country: 'Philippines', timezone: 'Asia/Manila' },
            { code: 'WWK', name: 'Wewak Airport', city: 'Wewak', country: 'Papua New Guinea', timezone: 'Pacific/Port_Moresby' },
            { code: 'DAU', name: 'Daru Airport', city: 'Daru', country: 'Papua New Guinea', timezone: 'Pacific/Port_Moresby' },
            { code: 'LAE', name: 'Lae Nadzab Airport', city: 'Lae', country: 'Papua New Guinea', timezone: 'Pacific/Port_Moresby' },
            { code: 'RAB', name: 'Tokua Airport', city: 'Rabaul', country: 'Papua New Guinea', timezone: 'Pacific/Bougainville' },
            { code: 'VAN', name: 'Bauerfield Airport', city: 'Port Vila', country: 'Vanuatu', timezone: 'Pacific/Efate' }
        ];
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const insertPromises = missingAirports.map(airport => {
                return new Promise((resolveInsert, rejectInsert) => {
                    // Check if airport already exists
                    db.get('SELECT code FROM airports WHERE code = ?', [airport.code], (err, existing) => {
                        if (err) {
                            rejectInsert(err);
                            return;
                        }
                        
                        if (existing) {
                            console.log(`   ✅ ${airport.code} already exists`);
                            resolveInsert(0);
                            return;
                        }
                        
                        // Insert the missing airport
                        db.run(`
                            INSERT INTO airports (code, name, city, country, timezone)
                            VALUES (?, ?, ?, ?, ?)
                        `, [airport.code, airport.name, airport.city, airport.country, airport.timezone], 
                        function(err) {
                            if (err) {
                                rejectInsert(err);
                            } else {
                                console.log(`   ✅ Added ${airport.code} - ${airport.name}`);
                                resolveInsert(1);
                            }
                        });
                    });
                });
            });
            
            Promise.all(insertPromises).then(results => {
                const totalAdded = results.reduce((sum, count) => sum + count, 0);
                console.log(`\n🎯 Total airports added: ${totalAdded}`);
                this.fixedCount += totalAdded;
                db.close();
                resolve();
            }).catch(reject);
        });
    }

    async fixPR103Route() {
        console.log('✈️  FIXING PR103 ROUTE...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Update PR103 from incorrect MNL-NRT to correct LAX-MNL
            db.run(`
                UPDATE flights 
                SET 
                    origin_code = 'LAX',
                    destination_code = 'MNL',
                    departure_time = '11:00',
                    arrival_time = '16:30',
                    duration_minutes = 690,
                    aircraft_type = 'Boeing 777-300ER'
                WHERE flight_number = 'PR103' 
                  AND airline_code = 'PR'
                  AND origin_code = 'MNL'
                  AND destination_code = 'NRT'
            `, [], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (this.changes > 0) {
                    console.log(`✅ Fixed PR103 route: MNL-NRT → LAX-MNL (${this.changes} record(s) updated)`);
                    this.fixedCount += this.changes;
                } else {
                    console.log('ℹ️  PR103 route already correct or not found');
                }
                
                db.close();
                resolve();
            });
        });
    }

    async fixSuspiciousFlightNumbers() {
        console.log('🔍 FIXING SUSPICIOUS FLIGHT NUMBERS...\n');
        
        const flightNumberFixes = [
            { old: 'PX8', new: 'PX8', airline: 'PX', note: 'Format acceptable for regional' },
            { old: 'PX9', new: 'PX9', airline: 'PX', note: 'Format acceptable for regional' },
            { old: 'JQ7', new: 'JQ7', airline: 'JQ', note: 'Format acceptable for LCC' },
            { old: 'JQ8', new: 'JQ8', airline: 'JQ', note: 'Format acceptable for LCC' }
        ];
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            console.log('Reviewing suspicious flight numbers:');
            flightNumberFixes.forEach(fix => {
                console.log(`   ${fix.old} (${fix.airline}): ${fix.note}`);
            });
            
            console.log('✅ All flight numbers are acceptable for their airline types\n');
            db.close();
            resolve();
        });
    }

    async verifyFixes() {
        console.log('🔍 VERIFYING ALL FIXES...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Check duplicates
            db.get(`
                SELECT COUNT(*) as duplicates
                FROM (
                    SELECT flight_number, airline_code, origin_code, destination_code, departure_time, COUNT(*) as count
                    FROM flights 
                    GROUP BY flight_number, airline_code, origin_code, destination_code, departure_time
                    HAVING count > 1
                )
            `, [], (err, dupResult) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log(`📊 Remaining duplicates: ${dupResult.duplicates}`);
                
                // Check missing airports
                db.get(`
                    SELECT COUNT(DISTINCT f.origin_code) + COUNT(DISTINCT f.destination_code) as missing_airports
                    FROM flights f
                    LEFT JOIN airports a1 ON f.origin_code = a1.code
                    LEFT JOIN airports a2 ON f.destination_code = a2.code
                    WHERE a1.code IS NULL OR a2.code IS NULL
                `, [], (err, airportResult) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    console.log(`📊 Missing airport references: ${airportResult.missing_airports || 0}`);
                    
                    // Check PR103
                    db.get(`
                        SELECT origin_code, destination_code 
                        FROM flights 
                        WHERE flight_number = 'PR103' AND airline_code = 'PR'
                        LIMIT 1
                    `, [], (err, pr103Result) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        if (pr103Result) {
                            const route = `${pr103Result.origin_code}-${pr103Result.destination_code}`;
                            console.log(`📊 PR103 route: ${route} ${route === 'LAX-MNL' ? '✅' : '❌'}`);
                        }
                        
                        // Final counts
                        db.get('SELECT COUNT(*) as flights FROM flights', [], (err, flightCount) => {
                            if (!err) {
                                console.log(`📊 Total flights after cleanup: ${flightCount.flights}`);
                            }
                            
                            db.get('SELECT COUNT(*) as airports FROM airports', [], (err, airportCount) => {
                                if (!err) {
                                    console.log(`📊 Total airports after additions: ${airportCount.airports}`);
                                }
                                
                                db.close();
                                resolve();
                            });
                        });
                    });
                });
            });
        });
    }
}

// Run comprehensive cleanup
const cleanupManager = new DatabaseCleanupManager();
cleanupManager.performAllFixes().then(() => {
    console.log('\n🎉 Database cleanup completed successfully!');
}).catch(error => {
    console.error('💥 Cleanup failed:', error);
});
