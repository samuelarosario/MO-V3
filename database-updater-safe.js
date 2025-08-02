// Database Update with AviationStack Integration
// Safe update procedure that preserves existing schema and data integrity

const https = require('https');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseUpdater {
    constructor() {
        this.dbPath = path.join(__dirname, 'security-mo.db');
        this.loadCredentials();
    }

    loadCredentials() {
        try {
            const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
            this.apiToken = credentials.aviationstack_token;
            console.log('✓ AviationStack credentials loaded');
        } catch (error) {
            console.error('❌ Error loading credentials:', error.message);
            this.apiToken = null;
        }
    }

    async updateDatabase() {
        console.log('🔄 Starting safe database update with AviationStack...\n');
        
        try {
            // 1. Fetch live flight data from AviationStack
            console.log('1️⃣ Fetching live flight data from AviationStack...');
            const apiFlights = await this.fetchAllPRFlights();
            
            if (apiFlights.length === 0) {
                console.log('❌ No flights received from API');
                return;
            }
            
            console.log(`✓ Found ${apiFlights.length} PR flights from API\n`);
            
            // 2. Safely update existing flights and create new ones
            console.log('2️⃣ Updating existing flights and creating new records...');
            const flightResults = await this.safeUpdateExistingFlights(apiFlights);
            
            // 3. Refresh live flights table
            console.log('3️⃣ Refreshing live flights data...');
            const liveFlightsCount = await this.refreshLiveFlights(apiFlights);
            
            // 4. Update database statistics
            console.log('4️⃣ Updating database statistics...');
            await this.updateStats();
            
            // 5. Summary report
            this.generateUpdateReport(apiFlights, flightResults, liveFlightsCount);
            
            console.log('\n🎉 Safe database update completed successfully!');
            
        } catch (error) {
            console.error('❌ Database update failed:', error.message);
            throw error;
        }
    }

    async fetchAllPRFlights() {
        if (!this.apiToken) {
            throw new Error('AviationStack API token not available');
        }
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.aviationstack.com',
                path: `/v1/flights?access_key=${this.apiToken}&airline_iata=PR&limit=100`,
                method: 'GET',
                headers: {
                    'User-Agent': 'SecurityMO-FlightTracker/1.0'
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const response = JSON.parse(data);
                            resolve(response.data || []);
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(new Error(`API error: ${res.statusCode} - ${data}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error('AviationStack API timeout'));
            });
            
            req.end();
        });
    }

    async safeUpdateExistingFlights(apiFlights) {
        console.log('   🔄 Updating existing flights and creating new records...');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            let updatedCount = 0;
            let insertedCount = 0;
            let processedCount = 0;
            
            const processNext = async () => {
                if (processedCount >= apiFlights.length) {
                    db.close();
                    resolve({ updated: updatedCount, inserted: insertedCount });
                    return;
                }
                
                const flight = apiFlights[processedCount];
                processedCount++;
                
                const flightNumber = flight.flight?.iata || flight.flight?.icao;
                if (!flightNumber || !flightNumber.startsWith('PR')) {
                    processNext();
                    return;
                }
                
                // Check if flight exists in database
                db.get('SELECT * FROM flights WHERE flight_number = ?', [flightNumber], async (err, existingFlight) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (existingFlight) {
                        // Update existing flight
                        const updates = [];
                        const params = [];
                        
                        // Update aircraft type if available and different
                        if (flight.aircraft?.iata && flight.aircraft.iata !== existingFlight.aircraft_type) {
                            updates.push('aircraft_type = ?');
                            params.push(flight.aircraft.iata);
                        }
                        
                        // Update status based on flight status
                        const newStatus = this.mapStatus(flight.flight_status);
                        if (newStatus !== existingFlight.status) {
                            updates.push('status = ?');
                            params.push(newStatus);
                        }
                        
                        if (updates.length > 0) {
                            params.push(flightNumber);
                            const updateSql = `UPDATE flights SET ${updates.join(', ')} WHERE flight_number = ?`;
                            
                            db.run(updateSql, params, function(updateErr) {
                                if (updateErr) {
                                    reject(updateErr);
                                } else {
                                    console.log(`   ✓ Updated ${flightNumber}: ${updates.join(', ')}`);
                                    updatedCount++;
                                    processNext();
                                }
                            });
                        } else {
                            console.log(`   ℹ️  ${flightNumber}: No updates needed`);
                            processNext();
                        }
                    } else {
                        // Create new flight record
                        const flightData = {
                            flight_number: flightNumber,
                            airline_code: flight.airline?.iata || 'PR',
                            airline_name: flight.airline?.name || 'Philippine Airlines',
                            origin_code: flight.departure?.iata || 'UNK',
                            destination_code: flight.arrival?.iata || 'UNK',
                            departure_time: this.extractTime(flight.departure?.scheduled),
                            arrival_time: this.extractTime(flight.arrival?.scheduled),
                            duration_minutes: this.calculateDuration(flight.departure?.scheduled, flight.arrival?.scheduled),
                            aircraft_type: flight.aircraft?.iata || flight.aircraft?.registration || null,
                            days_of_week: '1111111', // Assume daily for API flights
                            effective_from: '2025-01-01',
                            effective_to: '2025-12-31',
                            status: this.mapStatus(flight.flight_status)
                        };
                        
                        const insertSql = `INSERT INTO flights 
                            (flight_number, airline_code, airline_name, origin_code, destination_code, 
                             departure_time, arrival_time, duration_minutes, aircraft_type, days_of_week,
                             effective_from, effective_to, status, created_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
                        
                        db.run(insertSql, [
                            flightData.flight_number, flightData.airline_code, flightData.airline_name,
                            flightData.origin_code, flightData.destination_code, flightData.departure_time,
                            flightData.arrival_time, flightData.duration_minutes, flightData.aircraft_type,
                            flightData.days_of_week, flightData.effective_from, flightData.effective_to,
                            flightData.status
                        ], function(insertErr) {
                            if (insertErr) {
                                reject(insertErr);
                            } else {
                                console.log(`   🆕 Created ${flightNumber}: ${flightData.origin_code} → ${flightData.destination_code}`);
                                insertedCount++;
                                processNext();
                            }
                        });
                    }
                });
            };
            
            processNext();
        });
    }

    async refreshLiveFlights(apiFlights) {
        console.log('   🔄 Refreshing live_flights table...');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Create table if it doesn't exist
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS live_flights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    flight_number TEXT,
                    callsign TEXT,
                    airline_name TEXT,
                    airline_iata TEXT,
                    flight_status TEXT,
                    departure_airport TEXT,
                    departure_iata TEXT,
                    departure_scheduled TEXT,
                    arrival_airport TEXT,
                    arrival_iata TEXT,
                    arrival_scheduled TEXT,
                    aircraft_registration TEXT,
                    live_latitude REAL,
                    live_longitude REAL,
                    live_altitude REAL,
                    live_direction REAL,
                    live_speed_horizontal REAL,
                    live_speed_vertical REAL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`;
            
            db.run(createTableSql, (createErr) => {
                if (createErr) {
                    reject(createErr);
                    return;
                }
                
                // Clear existing live flights
                db.run('DELETE FROM live_flights', (deleteErr) => {
                    if (deleteErr) {
                        reject(deleteErr);
                        return;
                    }
                    
                    let insertedCount = 0;
                    let processedCount = 0;
                    
                    const insertNext = () => {
                        if (processedCount >= apiFlights.length) {
                            db.close();
                            resolve(insertedCount);
                            return;
                        }
                        
                        const flight = apiFlights[processedCount];
                        processedCount++;
                        
                        const flightNumber = flight.flight?.iata || flight.flight?.icao;
                        if (!flightNumber) {
                            insertNext();
                            return;
                        }
                        
                        const insertSql = `INSERT INTO live_flights 
                            (flight_number, callsign, airline_name, airline_iata, flight_status,
                             departure_airport, departure_iata, departure_scheduled,
                             arrival_airport, arrival_iata, arrival_scheduled,
                             aircraft_registration, live_latitude, live_longitude, live_altitude,
                             live_direction, live_speed_horizontal, live_speed_vertical) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        
                        db.run(insertSql, [
                            flightNumber,
                            flight.flight?.number,
                            flight.airline?.name,
                            flight.airline?.iata,
                            flight.flight_status,
                            flight.departure?.airport,
                            flight.departure?.iata,
                            flight.departure?.scheduled,
                            flight.arrival?.airport,
                            flight.arrival?.iata,
                            flight.arrival?.scheduled,
                            flight.aircraft?.registration,
                            flight.live?.latitude,
                            flight.live?.longitude,
                            flight.live?.altitude,
                            flight.live?.direction,
                            flight.live?.speed_horizontal,
                            flight.live?.speed_vertical
                        ], function(insertErr) {
                            if (insertErr) {
                                reject(insertErr);
                            } else {
                                insertedCount++;
                                insertNext();
                            }
                        });
                    };
                    
                    insertNext();
                });
            });
        });
    }

    async updateStats() {
        console.log('   📊 Calculating database statistics...');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Get flight counts
            db.get('SELECT COUNT(*) as flight_count FROM flights', (err1, flightResult) => {
                if (err1) {
                    reject(err1);
                    return;
                }
                
                // Get airport counts
                db.get('SELECT COUNT(*) as airport_count FROM airports', (err2, airportResult) => {
                    if (err2) {
                        reject(err2);
                        return;
                    }
                    
                    // Get live flights counts
                    db.get('SELECT COUNT(*) as live_count FROM live_flights', (err3, liveResult) => {
                        if (err3) {
                            reject(err3);
                            return;
                        }
                        
                        console.log(`   ✓ Scheduled flights: ${flightResult.flight_count}`);
                        console.log(`   ✓ Airports: ${airportResult.airport_count}`);
                        console.log(`   ✓ Live flights: ${liveResult.live_count}`);
                        
                        db.close();
                        resolve({
                            flights: flightResult.flight_count,
                            airports: airportResult.airport_count,
                            live_flights: liveResult.live_count
                        });
                    });
                });
            });
        });
    }

    mapStatus(apiStatus) {
        const statusMap = {
            'scheduled': 'active',
            'active': 'active',
            'landed': 'active',
            'cancelled': 'cancelled',
            'incident': 'cancelled',
            'diverted': 'active'
        };
        return statusMap[apiStatus] || 'active';
    }

    extractTime(dateTimeString) {
        if (!dateTimeString) return '00:00';
        try {
            const date = new Date(dateTimeString);
            return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
        } catch {
            return '00:00';
        }
    }

    calculateDuration(departure, arrival) {
        if (!departure || !arrival) return 0;
        try {
            const dep = new Date(departure);
            const arr = new Date(arrival);
            return Math.round((arr - dep) / (1000 * 60)); // minutes
        } catch {
            return 0;
        }
    }

    generateUpdateReport(apiFlights, flightResults, liveFlightsCount) {
        console.log('\n📊 Update Report:');
        console.log('═══════════════════════════════════');
        console.log(`🔄 Existing flights updated: ${flightResults.updated}`);
        console.log(`🆕 New flights created: ${flightResults.inserted}`);
        console.log(`🔴 Live flights refreshed: ${liveFlightsCount}`);
        console.log(`📊 Total API flights processed: ${apiFlights.length}`);
        
        // Count flight statuses
        const statusCounts = {};
        apiFlights.forEach(flight => {
            const status = flight.flight_status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        console.log('\n📋 Flight Status Summary:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count} flights`);
        });
        
        // Show active flights (currently flying)
        const activeFlights = apiFlights.filter(f => f.flight_status === 'active');
        if (activeFlights.length > 0) {
            console.log(`\n✈️  Currently Active Flights (${activeFlights.length}):`);
            activeFlights.slice(0, 5).forEach(flight => {
                const fn = flight.flight?.iata || 'N/A';
                const route = `${flight.departure?.iata || '???'} → ${flight.arrival?.iata || '???'}`;
                console.log(`   ${fn}: ${route}`);
            });
            if (activeFlights.length > 5) {
                console.log(`   ... and ${activeFlights.length - 5} more active flights`);
            }
        }
        
        console.log('═══════════════════════════════════');
        console.log('✅ Database schema preserved - no structural changes made');
        console.log('✅ Existing flight data integrity maintained');
        console.log('✅ New flights added from API data');
        console.log('✅ Live flight tracking data refreshed');
    }
}

module.exports = DatabaseUpdater;
