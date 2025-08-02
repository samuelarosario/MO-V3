const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');

console.log('=== Database Update from AviationStack API ===\n');

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

async function updateFlightsTable(apiFlights) {
    console.log('🔄 Updating flights table with API data...');
    
    let updatedCount = 0;
    let insertedCount = 0;
    
    for (const flight of apiFlights) {
        const flightNumber = flight.flight?.iata || flight.flight?.icao;
        if (!flightNumber || !flightNumber.startsWith('PR')) continue;
        
        // Check if flight exists in database
        const existingFlight = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM flights WHERE flight_number = ?', [flightNumber], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        const flightData = {
            flight_number: flightNumber,
            airline_code: flight.airline?.iata || 'PR',
            airline_name: flight.airline?.name || 'Philippine Airlines',
            origin_code: flight.departure?.iata || 'UNK',
            destination_code: flight.arrival?.iata || 'UNK',
            departure_time: extractTime(flight.departure?.scheduled),
            arrival_time: extractTime(flight.arrival?.scheduled),
            duration_minutes: calculateDuration(flight.departure?.scheduled, flight.arrival?.scheduled),
            aircraft_type: flight.aircraft?.iata || null,
            days_of_week: '1111111', // Assume daily for now
            effective_from: '2025-01-01',
            effective_to: '2025-12-31',
            status: mapStatus(flight.flight_status)
        };
        
        if (existingFlight) {
            // Update existing flight with API data
            const updateSql = `UPDATE flights SET 
                airline_name = ?, origin_code = ?, destination_code = ?, 
                departure_time = ?, arrival_time = ?, duration_minutes = ?,
                aircraft_type = ?, status = ?
                WHERE flight_number = ?`;
            
            await new Promise((resolve, reject) => {
                db.run(updateSql, [
                    flightData.airline_name, flightData.origin_code, flightData.destination_code,
                    flightData.departure_time, flightData.arrival_time, flightData.duration_minutes,
                    flightData.aircraft_type, flightData.status, flightNumber
                ], function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`✅ Updated ${flightNumber}: ${flightData.origin_code} → ${flightData.destination_code}`);
                        updatedCount++;
                        resolve();
                    }
                });
            });
        } else {
            // Insert new flight
            const insertSql = `INSERT INTO flights 
                (flight_number, airline_code, airline_name, origin_code, destination_code, 
                 departure_time, arrival_time, duration_minutes, aircraft_type, days_of_week,
                 effective_from, effective_to, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
            
            await new Promise((resolve, reject) => {
                db.run(insertSql, [
                    flightData.flight_number, flightData.airline_code, flightData.airline_name,
                    flightData.origin_code, flightData.destination_code, flightData.departure_time,
                    flightData.arrival_time, flightData.duration_minutes, flightData.aircraft_type,
                    flightData.days_of_week, flightData.effective_from, flightData.effective_to,
                    flightData.status
                ], function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`🆕 Inserted ${flightNumber}: ${flightData.origin_code} → ${flightData.destination_code}`);
                        insertedCount++;
                        resolve();
                    }
                });
            });
        }
    }
    
    return { updated: updatedCount, inserted: insertedCount };
}

async function updateAirportsTable(apiFlights) {
    console.log('🔄 Updating airports table with API data...');
    
    const airportSet = new Set();
    let insertedCount = 0;
    
    // Collect all airport codes from API data
    apiFlights.forEach(flight => {
        if (flight.departure?.iata) airportSet.add(flight.departure.iata);
        if (flight.arrival?.iata) airportSet.add(flight.arrival.iata);
    });
    
    for (const iataCode of airportSet) {
        // Check if airport exists
        const existingAirport = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM airports WHERE iata_code = ?', [iataCode], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!existingAirport) {
            // Find airport name from API data
            let airportName = 'Unknown Airport';
            for (const flight of apiFlights) {
                if (flight.departure?.iata === iataCode && flight.departure?.airport) {
                    airportName = flight.departure.airport;
                    break;
                }
                if (flight.arrival?.iata === iataCode && flight.arrival?.airport) {
                    airportName = flight.arrival.airport;
                    break;
                }
            }
            
            // Insert new airport
            const insertSql = `INSERT INTO airports (iata_code, airport_name, city, country) 
                              VALUES (?, ?, ?, ?)`;
            
            await new Promise((resolve, reject) => {
                db.run(insertSql, [iataCode, airportName, 'Unknown', 'Unknown'], function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`🆕 Added airport: ${iataCode} - ${airportName}`);
                        insertedCount++;
                        resolve();
                    }
                });
            });
        }
    }
    
    return insertedCount;
}

function extractTime(dateTimeString) {
    if (!dateTimeString) return '00:00';
    try {
        const date = new Date(dateTimeString);
        return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
    } catch {
        return '00:00';
    }
}

function calculateDuration(departure, arrival) {
    if (!departure || !arrival) return 0;
    try {
        const dep = new Date(departure);
        const arr = new Date(arrival);
        return Math.round((arr - dep) / (1000 * 60)); // minutes
    } catch {
        return 0;
    }
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
        
        // Update flights table
        const flightResults = await updateFlightsTable(apiFlights);
        
        // Update airports table  
        const airportResults = await updateAirportsTable(apiFlights);
        
        // Update live_flights table (already exists from previous queries)
        console.log('🔄 Refreshing live_flights table...');
        db.run('DELETE FROM live_flights', (err) => {
            if (err) console.error('Error clearing live_flights:', err);
        });
        
        // Insert current API data into live_flights
        let liveInserted = 0;
        for (const flight of apiFlights) {
            const insertSql = `INSERT INTO live_flights 
                (flight_number, callsign, airline_name, airline_iata, flight_status,
                 departure_airport, departure_iata, departure_scheduled,
                 arrival_airport, arrival_iata, arrival_scheduled,
                 aircraft_registration, live_latitude, live_longitude, live_altitude,
                 live_direction, live_speed_horizontal, live_speed_vertical) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            await new Promise((resolve, reject) => {
                db.run(insertSql, [
                    flight.flight?.iata || flight.flight?.icao,
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
                        liveInserted++;
                        resolve();
                    }
                });
            });
        }
        
        // Final summary
        console.log('\n🎉 Database Update Complete!');
        console.log('═══════════════════════════════════');
        console.log(`✈️  Flights updated: ${flightResults.updated}`);
        console.log(`🆕 Flights inserted: ${flightResults.inserted}`);
        console.log(`🏢 Airports added: ${airportResults}`);
        console.log(`🔴 Live flights refreshed: ${liveInserted}`);
        console.log('═══════════════════════════════════');
        
        db.close();
        
    } catch (error) {
        console.error('❌ Database update failed:', error.message);
        db.close();
    }
}

main();
