const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');

console.log('=== Update Local DB from AviationStack (No Schema Changes) ===\n');

// Load credentials
const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
const API_TOKEN = credentials.aviationstack_token;

const db = new sqlite3.Database('./security-mo.db');

async function fetchAllPRFlights() {
    console.log('🌐 Fetching all Philippine Airlines flights from AviationStack...');
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.aviationstack.com',
            path: `/v1/flights?access_key=${API_TOKEN}&airline_iata=PR&limit=100`,
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
                        console.log(`✅ Found ${response.data?.length || 0} PR flights from API`);
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
            reject(new Error('API timeout'));
        });
        
        req.end();
    });
}

async function updateExistingFlights(apiFlights) {
    console.log('🔄 Updating existing flights with API data (keeping current schema)...');
    
    let updatedCount = 0;
    
    for (const flight of apiFlights) {
        const flightNumber = flight.flight?.iata || flight.flight?.icao;
        if (!flightNumber || !flightNumber.startsWith('PR')) continue;
        
        // Check if flight exists in current database
        const existingFlight = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM flights WHERE flight_number = ?', [flightNumber], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingFlight) {
            // Only update fields that we can map to existing schema
            const updates = [];
            const params = [];
            
            // Update aircraft type if available and different
            if (flight.aircraft?.iata && flight.aircraft.iata !== existingFlight.aircraft_type) {
                updates.push('aircraft_type = ?');
                params.push(flight.aircraft.iata);
            }
            
            // Update status based on flight status
            const newStatus = mapStatus(flight.flight_status);
            if (newStatus !== existingFlight.status) {
                updates.push('status = ?');
                params.push(newStatus);
            }
            
            if (updates.length > 0) {
                params.push(flightNumber);
                const updateSql = `UPDATE flights SET ${updates.join(', ')} WHERE flight_number = ?`;
                
                await new Promise((resolve, reject) => {
                    db.run(updateSql, params, function(err) {
                        if (err) reject(err);
                        else {
                            console.log(`✅ Updated ${flightNumber}: ${updates.join(', ')}`);
                            updatedCount++;
                            resolve();
                        }
                    });
                });
            } else {
                console.log(`ℹ️  ${flightNumber}: No updates needed`);
            }
        } else {
            console.log(`ℹ️  ${flightNumber}: Not in local database (skipping)`);
        }
    }
    
    return updatedCount;
}

async function updateLiveFlightsOnly(apiFlights) {
    console.log('🔄 Updating live_flights table with current API data...');
    
    // Clear existing live flights
    await new Promise((resolve, reject) => {
        db.run('DELETE FROM live_flights', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    let insertedCount = 0;
    
    for (const flight of apiFlights) {
        const flightNumber = flight.flight?.iata || flight.flight?.icao;
        if (!flightNumber) continue;
        
        // Insert into live_flights table (which already has the correct schema)
        const insertSql = `INSERT INTO live_flights 
            (flight_number, callsign, airline_name, airline_iata, flight_status,
             departure_airport, departure_iata, departure_scheduled,
             arrival_airport, arrival_iata, arrival_scheduled,
             aircraft_registration, live_latitude, live_longitude, live_altitude,
             live_direction, live_speed_horizontal, live_speed_vertical) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await new Promise((resolve, reject) => {
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
            ], function(err) {
                if (err) reject(err);
                else {
                    insertedCount++;
                    resolve();
                }
            });
        });
    }
    
    return insertedCount;
}

function mapStatus(apiStatus) {
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

async function main() {
    try {
        // Fetch data from API
        const apiFlights = await fetchAllPRFlights();
        
        if (apiFlights.length === 0) {
            console.log('❌ No flights received from API');
            return;
        }
        
        console.log(`\n📊 Processing ${apiFlights.length} flights from AviationStack...`);
        
        // Update existing flights in the main flights table (minimal changes only)
        const updatedFlights = await updateExistingFlights(apiFlights);
        
        // Update live_flights table with current API data
        const liveFlightsInserted = await updateLiveFlightsOnly(apiFlights);
        
        // Show summary of API flights found
        console.log('\n📋 API Flights Summary:');
        apiFlights.forEach(flight => {
            const fn = flight.flight?.iata || flight.flight?.icao || 'Unknown';
            const route = `${flight.departure?.iata || '???'} → ${flight.arrival?.iata || '???'}`;
            const status = flight.flight_status || 'unknown';
            console.log(`   ${fn}: ${route} (${status})`);
        });
        
        // Final summary
        console.log('\n🎉 Database Update Complete!');
        console.log('═══════════════════════════════════');
        console.log(`🔄 Existing flights updated: ${updatedFlights}`);
        console.log(`🔴 Live flights refreshed: ${liveFlightsInserted}`);
        console.log(`📊 Total API flights processed: ${apiFlights.length}`);
        console.log('═══════════════════════════════════');
        console.log('✅ No schema changes made - existing structure preserved');
        
        db.close();
        
    } catch (error) {
        console.error('❌ Database update failed:', error.message);
        db.close();
    }
}

main();
