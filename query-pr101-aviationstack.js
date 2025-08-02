const https = require('https');
const sqlite3 = require('sqlite3').verbose();

console.log('=== PR101 AviationStack API Query ===\n');

const API_TOKEN = '4e3ba96e9a333c446fca7929d905c13e';

// First create/update live_flights table for AviationStack data
const db = new sqlite3.Database('./security-mo.db');

const createLiveFlightsTable = `
CREATE TABLE IF NOT EXISTS live_flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_number TEXT,
    callsign TEXT,
    airline_name TEXT,
    airline_iata TEXT,
    airline_icao TEXT,
    flight_status TEXT,
    departure_airport TEXT,
    departure_iata TEXT,
    departure_icao TEXT,
    departure_scheduled TEXT,
    departure_estimated TEXT,
    departure_actual TEXT,
    arrival_airport TEXT,
    arrival_iata TEXT,
    arrival_icao TEXT,
    arrival_scheduled TEXT,
    arrival_estimated TEXT,
    arrival_actual TEXT,
    aircraft_registration TEXT,
    aircraft_icao TEXT,
    aircraft_iata TEXT,
    live_latitude REAL,
    live_longitude REAL,
    live_altitude REAL,
    live_direction REAL,
    live_speed_horizontal REAL,
    live_speed_vertical REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

db.run(createLiveFlightsTable, (err) => {
    if (err) {
        console.error('Error creating live_flights table:', err);
        return;
    }
    console.log('✅ Live flights table ready for AviationStack data');
    
    // Query AviationStack API for PR101
    console.log('🌐 Querying AviationStack API for PR101...');
    
    const options = {
        hostname: 'api.aviationstack.com',
        path: `/v1/flights?access_key=${API_TOKEN}&flight_iata=PR101&limit=10`,
        method: 'GET',
        headers: {
            'User-Agent': 'SecurityMO-FlightTracker/1.0'
        }
    };
    
    const req = https.request(options, (res) => {
        console.log(`📊 Status Code: ${res.statusCode}`);
        
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`📦 Data Length: ${data.length} bytes`);
            
            if (res.statusCode === 200 && data.length > 0) {
                try {
                    const response = JSON.parse(data);
                    console.log('✅ AviationStack API response received');
                    
                    if (response.data && response.data.length > 0) {
                        console.log(`✈️  Found ${response.data.length} PR101 flight(s)`);
                        
                        response.data.forEach((flight, index) => {
                            console.log(`\n🎯 PR101 Flight ${index + 1}:`);
                            console.log('─────────────────────────────────');
                            console.log(`✈️  Flight: ${flight.flight?.iata || flight.flight?.icao || 'N/A'}`);
                            console.log(`📋 Status: ${flight.flight_status || 'N/A'}`);
                            console.log(`🏢 Airline: ${flight.airline?.name || 'N/A'} (${flight.airline?.iata || 'N/A'})`);
                            
                            // Departure info
                            if (flight.departure) {
                                console.log(`🛫 Departure:`);
                                console.log(`   Airport: ${flight.departure.airport || 'N/A'} (${flight.departure.iata || 'N/A'})`);
                                console.log(`   Scheduled: ${flight.departure.scheduled || 'N/A'}`);
                                console.log(`   Estimated: ${flight.departure.estimated || 'N/A'}`);
                                console.log(`   Actual: ${flight.departure.actual || 'N/A'}`);
                            }
                            
                            // Arrival info
                            if (flight.arrival) {
                                console.log(`🛬 Arrival:`);
                                console.log(`   Airport: ${flight.arrival.airport || 'N/A'} (${flight.arrival.iata || 'N/A'})`);
                                console.log(`   Scheduled: ${flight.arrival.scheduled || 'N/A'}`);
                                console.log(`   Estimated: ${flight.arrival.estimated || 'N/A'}`);
                                console.log(`   Actual: ${flight.arrival.actual || 'N/A'}`);
                            }
                            
                            // Aircraft info
                            if (flight.aircraft) {
                                console.log(`🛩️  Aircraft: ${flight.aircraft.registration || 'N/A'} (${flight.aircraft.iata || flight.aircraft.icao || 'N/A'})`);
                            }
                            
                            // Live tracking info
                            if (flight.live) {
                                console.log(`📍 Live Position:`);
                                console.log(`   Latitude: ${flight.live.latitude || 'N/A'}`);
                                console.log(`   Longitude: ${flight.live.longitude || 'N/A'}`);
                                console.log(`   Altitude: ${flight.live.altitude || 'N/A'} meters`);
                                console.log(`   Direction: ${flight.live.direction || 'N/A'}°`);
                                console.log(`   Speed: ${flight.live.speed_horizontal || 'N/A'} km/h`);
                                console.log(`   Vertical Speed: ${flight.live.speed_vertical || 'N/A'} m/s`);
                            } else {
                                console.log(`📍 Live Position: Not available`);
                            }
                            
                            // Insert into database
                            const insertSql = `INSERT OR REPLACE INTO live_flights 
                                (flight_number, callsign, airline_name, airline_iata, airline_icao, flight_status,
                                 departure_airport, departure_iata, departure_icao, departure_scheduled, 
                                 departure_estimated, departure_actual, arrival_airport, arrival_iata, 
                                 arrival_icao, arrival_scheduled, arrival_estimated, arrival_actual,
                                 aircraft_registration, aircraft_icao, aircraft_iata, live_latitude, 
                                 live_longitude, live_altitude, live_direction, live_speed_horizontal, 
                                 live_speed_vertical) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                            
                            db.run(insertSql, [
                                flight.flight?.iata || flight.flight?.icao,
                                flight.flight?.number,
                                flight.airline?.name,
                                flight.airline?.iata,
                                flight.airline?.icao,
                                flight.flight_status,
                                flight.departure?.airport,
                                flight.departure?.iata,
                                flight.departure?.icao,
                                flight.departure?.scheduled,
                                flight.departure?.estimated,
                                flight.departure?.actual,
                                flight.arrival?.airport,
                                flight.arrival?.iata,
                                flight.arrival?.icao,
                                flight.arrival?.scheduled,
                                flight.arrival?.estimated,
                                flight.arrival?.actual,
                                flight.aircraft?.registration,
                                flight.aircraft?.icao,
                                flight.aircraft?.iata,
                                flight.live?.latitude,
                                flight.live?.longitude,
                                flight.live?.altitude,
                                flight.live?.direction,
                                flight.live?.speed_horizontal,
                                flight.live?.speed_vertical
                            ], (err) => {
                                if (err) {
                                    console.error('Error inserting flight data:', err);
                                } else {
                                    console.log('✅ PR101 data saved to database');
                                }
                                
                                if (index === response.data.length - 1) {
                                    db.close();
                                }
                            });
                        });
                        
                    } else {
                        console.log('❌ No PR101 flights found');
                        console.log('📊 API Response:', JSON.stringify(response, null, 2));
                        db.close();
                    }
                    
                } catch (error) {
                    console.error('❌ JSON parsing error:', error.message);
                    console.log('📄 Raw response:', data);
                    db.close();
                }
            } else {
                console.log(`❌ API request failed with status ${res.statusCode}`);
                if (data.length > 0) {
                    console.log('📄 Response:', data);
                }
                db.close();
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Request error:', error.message);
        db.close();
    });
    
    req.setTimeout(15000, () => {
        console.error('❌ Request timeout after 15 seconds');
        req.destroy();
        db.close();
    });
    
    req.end();
});
