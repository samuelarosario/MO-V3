// Comprehensive Local Database Verification
// This script verifies all records in the local database for accuracy and completeness

const sqlite3 = require('sqlite3').verbose();

class ComprehensiveDatabaseVerifier {
    constructor() {
        this.dbPath = './security-mo.db';
        this.issues = [];
        this.stats = {
            totalFlights: 0,
            totalAirports: 0,
            totalAirlines: 0,
            duplicates: 0,
            invalidRoutes: 0,
            invalidTimes: 0,
            missingData: 0
        };
    }

    async verifyAllRecords() {
        console.log('🔍 COMPREHENSIVE DATABASE VERIFICATION');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        try {
            await this.verifyDatabaseStructure();
            await this.verifyAirports();
            await this.verifyFlights();
            await this.checkForDuplicates();
            await this.validateRoutes();
            await this.validateTimes();
            await this.checkDataIntegrity();
            
            this.printSummaryReport();
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
        }
    }

    async verifyDatabaseStructure() {
        console.log('🏗️  VERIFYING DATABASE STRUCTURE...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            db.all("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log('📋 Database Tables:');
                tables.forEach(table => {
                    console.log(`   ✓ ${table.name}`);
                });
                console.log(`   Total tables: ${tables.length}\n`);
                
                db.close();
                resolve();
            });
        });
    }

    async verifyAirports() {
        console.log('✈️  VERIFYING AIRPORTS...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Get airport statistics
            db.all(`
                SELECT 
                    COUNT(*) as total_airports,
                    COUNT(DISTINCT code) as unique_codes,
                    COUNT(DISTINCT country) as countries,
                    SUM(CASE WHEN code IS NULL OR code = '' THEN 1 ELSE 0 END) as missing_codes,
                    SUM(CASE WHEN name IS NULL OR name = '' THEN 1 ELSE 0 END) as missing_names,
                    SUM(CASE WHEN city IS NULL OR city = '' THEN 1 ELSE 0 END) as missing_cities,
                    SUM(CASE WHEN country IS NULL OR country = '' THEN 1 ELSE 0 END) as missing_countries
                FROM airports
            `, [], (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const stat = stats[0];
                this.stats.totalAirports = stat.total_airports;
                
                console.log(`📊 Airport Statistics:`);
                console.log(`   Total airports: ${stat.total_airports}`);
                console.log(`   Unique codes: ${stat.unique_codes}`);
                console.log(`   Countries: ${stat.countries}`);
                console.log(`   Missing codes: ${stat.missing_codes}`);
                console.log(`   Missing names: ${stat.missing_names}`);
                console.log(`   Missing cities: ${stat.missing_cities}`);
                console.log(`   Missing countries: ${stat.missing_countries}`);
                
                if (stat.total_airports !== stat.unique_codes) {
                    this.issues.push(`⚠️  Duplicate airport codes found: ${stat.total_airports - stat.unique_codes} duplicates`);
                }
                
                if (stat.missing_codes > 0) {
                    this.issues.push(`⚠️  Missing airport codes: ${stat.missing_codes} records`);
                }
                
                console.log();
                
                // Check for specific airport code patterns
                db.all(`
                    SELECT code, name, city, country 
                    FROM airports 
                    WHERE LENGTH(code) != 3 OR code GLOB '*[^A-Z]*'
                    LIMIT 10
                `, [], (err, invalidCodes) => {
                    if (!err && invalidCodes.length > 0) {
                        console.log('⚠️  Invalid Airport Codes:');
                        invalidCodes.forEach(airport => {
                            console.log(`   ${airport.code} - ${airport.name} (${airport.city})`);
                            this.issues.push(`Invalid airport code: ${airport.code}`);
                        });
                        console.log();
                    }
                    
                    db.close();
                    resolve();
                });
            });
        });
    }

    async verifyFlights() {
        console.log('🛫 VERIFYING FLIGHTS...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Get flight statistics
            db.all(`
                SELECT 
                    COUNT(*) as total_flights,
                    COUNT(DISTINCT airline_code) as airlines,
                    COUNT(DISTINCT flight_number) as unique_flights,
                    COUNT(DISTINCT origin_code || '-' || destination_code) as unique_routes,
                    SUM(CASE WHEN flight_number IS NULL OR flight_number = '' THEN 1 ELSE 0 END) as missing_flight_numbers,
                    SUM(CASE WHEN airline_code IS NULL OR airline_code = '' THEN 1 ELSE 0 END) as missing_airline_codes,
                    SUM(CASE WHEN origin_code IS NULL OR origin_code = '' THEN 1 ELSE 0 END) as missing_origins,
                    SUM(CASE WHEN destination_code IS NULL OR destination_code = '' THEN 1 ELSE 0 END) as missing_destinations,
                    SUM(CASE WHEN departure_time IS NULL OR departure_time = '' THEN 1 ELSE 0 END) as missing_departure_times,
                    SUM(CASE WHEN arrival_time IS NULL OR arrival_time = '' THEN 1 ELSE 0 END) as missing_arrival_times,
                    SUM(CASE WHEN aircraft_type IS NULL OR aircraft_type = '' THEN 1 ELSE 0 END) as missing_aircraft
                FROM flights
            `, [], (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const stat = stats[0];
                this.stats.totalFlights = stat.total_flights;
                this.stats.totalAirlines = stat.airlines;
                
                console.log(`📊 Flight Statistics:`);
                console.log(`   Total flights: ${stat.total_flights}`);
                console.log(`   Airlines: ${stat.airlines}`);
                console.log(`   Unique flight numbers: ${stat.unique_flights}`);
                console.log(`   Unique routes: ${stat.unique_routes}`);
                console.log(`   Missing flight numbers: ${stat.missing_flight_numbers}`);
                console.log(`   Missing airline codes: ${stat.missing_airline_codes}`);
                console.log(`   Missing origins: ${stat.missing_origins}`);
                console.log(`   Missing destinations: ${stat.missing_destinations}`);
                console.log(`   Missing departure times: ${stat.missing_departure_times}`);
                console.log(`   Missing arrival times: ${stat.missing_arrival_times}`);
                console.log(`   Missing aircraft types: ${stat.missing_aircraft}`);
                
                this.stats.missingData = stat.missing_flight_numbers + stat.missing_airline_codes + 
                                       stat.missing_origins + stat.missing_destinations + 
                                       stat.missing_departure_times + stat.missing_arrival_times;
                
                console.log();
                
                // Get airline breakdown
                db.all(`
                    SELECT 
                        airline_code, 
                        airline_name,
                        COUNT(*) as flight_count
                    FROM flights 
                    GROUP BY airline_code, airline_name 
                    ORDER BY flight_count DESC
                `, [], (err, airlines) => {
                    if (!err) {
                        console.log('📈 Airlines in Database:');
                        airlines.forEach(airline => {
                            console.log(`   ${airline.airline_code}: ${airline.airline_name} (${airline.flight_count} flights)`);
                        });
                        console.log();
                    }
                    
                    db.close();
                    resolve();
                });
            });
        });
    }

    async checkForDuplicates() {
        console.log('🔍 CHECKING FOR DUPLICATES...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Check for duplicate flights
            db.all(`
                SELECT 
                    flight_number, 
                    airline_code,
                    origin_code,
                    destination_code,
                    departure_time,
                    COUNT(*) as count
                FROM flights 
                GROUP BY flight_number, airline_code, origin_code, destination_code, departure_time
                HAVING count > 1
                ORDER BY count DESC
            `, [], (err, duplicates) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (duplicates.length > 0) {
                    console.log('⚠️  DUPLICATE FLIGHTS FOUND:');
                    duplicates.forEach(dup => {
                        console.log(`   ${dup.flight_number} (${dup.origin_code}-${dup.destination_code} ${dup.departure_time}): ${dup.count} copies`);
                        this.issues.push(`Duplicate flight: ${dup.flight_number} (${dup.count} copies)`);
                    });
                    this.stats.duplicates = duplicates.length;
                } else {
                    console.log('✅ No duplicate flights found');
                }
                console.log();
                
                db.close();
                resolve();
            });
        });
    }

    async validateRoutes() {
        console.log('🗺️  VALIDATING ROUTES...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Check for flights with same origin and destination
            db.all(`
                SELECT flight_number, airline_code, origin_code, destination_code
                FROM flights 
                WHERE origin_code = destination_code
            `, [], (err, invalidRoutes) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (invalidRoutes.length > 0) {
                    console.log('⚠️  INVALID ROUTES (Same Origin/Destination):');
                    invalidRoutes.forEach(route => {
                        console.log(`   ${route.flight_number}: ${route.origin_code}-${route.destination_code}`);
                        this.issues.push(`Invalid route: ${route.flight_number} (${route.origin_code}-${route.destination_code})`);
                    });
                    this.stats.invalidRoutes = invalidRoutes.length;
                } else {
                    console.log('✅ All routes have different origin/destination');
                }
                
                // Check for flights referencing non-existent airports
                db.all(`
                    SELECT DISTINCT f.flight_number, f.origin_code
                    FROM flights f
                    LEFT JOIN airports a ON f.origin_code = a.code
                    WHERE a.code IS NULL
                    LIMIT 10
                `, [], (err, missingOrigins) => {
                    if (!err && missingOrigins.length > 0) {
                        console.log('⚠️  FLIGHTS WITH MISSING ORIGIN AIRPORTS:');
                        missingOrigins.forEach(flight => {
                            console.log(`   ${flight.flight_number}: Origin ${flight.origin_code} not in airports table`);
                            this.issues.push(`Missing origin airport: ${flight.origin_code} for ${flight.flight_number}`);
                        });
                    }
                    
                    db.all(`
                        SELECT DISTINCT f.flight_number, f.destination_code
                        FROM flights f
                        LEFT JOIN airports a ON f.destination_code = a.code
                        WHERE a.code IS NULL
                        LIMIT 10
                    `, [], (err, missingDestinations) => {
                        if (!err && missingDestinations.length > 0) {
                            console.log('⚠️  FLIGHTS WITH MISSING DESTINATION AIRPORTS:');
                            missingDestinations.forEach(flight => {
                                console.log(`   ${flight.flight_number}: Destination ${flight.destination_code} not in airports table`);
                                this.issues.push(`Missing destination airport: ${flight.destination_code} for ${flight.flight_number}`);
                            });
                        }
                        
                        console.log();
                        db.close();
                        resolve();
                    });
                });
            });
        });
    }

    async validateTimes() {
        console.log('⏰ VALIDATING TIMES...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Check for invalid time formats
            db.all(`
                SELECT flight_number, departure_time, arrival_time, duration_minutes
                FROM flights 
                WHERE departure_time NOT LIKE '__:__' 
                   OR arrival_time NOT LIKE '__:__'
                   OR duration_minutes <= 0
                   OR duration_minutes > 1440
                LIMIT 10
            `, [], (err, invalidTimes) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (invalidTimes.length > 0) {
                    console.log('⚠️  INVALID TIMES:');
                    invalidTimes.forEach(flight => {
                        console.log(`   ${flight.flight_number}: ${flight.departure_time} → ${flight.arrival_time} (${flight.duration_minutes}min)`);
                        this.issues.push(`Invalid time: ${flight.flight_number}`);
                    });
                    this.stats.invalidTimes = invalidTimes.length;
                } else {
                    console.log('✅ All flight times appear valid');
                }
                
                console.log();
                db.close();
                resolve();
            });
        });
    }

    async checkDataIntegrity() {
        console.log('🔐 CHECKING DATA INTEGRITY...\n');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Check for flights with unusual patterns
            db.all(`
                SELECT 
                    flight_number,
                    airline_code,
                    origin_code,
                    destination_code,
                    departure_time,
                    arrival_time,
                    duration_minutes,
                    aircraft_type
                FROM flights 
                WHERE 
                    LENGTH(flight_number) < 4 OR LENGTH(flight_number) > 8
                    OR LENGTH(airline_code) != 2 AND LENGTH(airline_code) != 3
                    OR LENGTH(origin_code) != 3
                    OR LENGTH(destination_code) != 3
                LIMIT 10
            `, [], (err, suspiciousFlights) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (suspiciousFlights.length > 0) {
                    console.log('⚠️  SUSPICIOUS FLIGHT DATA:');
                    suspiciousFlights.forEach(flight => {
                        console.log(`   ${flight.flight_number} (${flight.airline_code}): ${flight.origin_code}-${flight.destination_code}`);
                        this.issues.push(`Suspicious data: ${flight.flight_number}`);
                    });
                } else {
                    console.log('✅ Flight data patterns look normal');
                }
                
                console.log();
                db.close();
                resolve();
            });
        });
    }

    printSummaryReport() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 VERIFICATION SUMMARY REPORT');
        console.log('═══════════════════════════════════════════════════════════');
        
        console.log(`\n🔢 Database Statistics:`);
        console.log(`   Total Flights: ${this.stats.totalFlights}`);
        console.log(`   Total Airports: ${this.stats.totalAirports}`);
        console.log(`   Total Airlines: ${this.stats.totalAirlines}`);
        
        console.log(`\n❌ Issues Found:`);
        console.log(`   Duplicate flights: ${this.stats.duplicates}`);
        console.log(`   Invalid routes: ${this.stats.invalidRoutes}`);
        console.log(`   Invalid times: ${this.stats.invalidTimes}`);
        console.log(`   Missing data fields: ${this.stats.missingData}`);
        console.log(`   Total issues: ${this.issues.length}`);
        
        if (this.issues.length > 0) {
            console.log(`\n⚠️  Detailed Issues:`);
            this.issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }
        
        console.log(`\n🎯 Overall Status: ${this.issues.length === 0 ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'}`);
        console.log('═══════════════════════════════════════════════════════════');
    }
}

// Run comprehensive verification
const verifier = new ComprehensiveDatabaseVerifier();
verifier.verifyAllRecords().then(() => {
    console.log('\n✅ Comprehensive verification complete!');
}).catch(error => {
    console.error('❌ Verification failed:', error);
});
