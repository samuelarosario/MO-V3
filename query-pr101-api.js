const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');

// Load OpenSky credentials
const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

console.log('=== PR101 API Query ===\n');

// First create live_flights table if it doesn't exist
const db = new sqlite3.Database('./security-mo.db');

const createLiveFlightsTable = `
CREATE TABLE IF NOT EXISTS live_flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_number TEXT,
    callsign TEXT,
    origin_country TEXT,
    time_position INTEGER,
    last_contact INTEGER,
    longitude REAL,
    latitude REAL,
    altitude REAL,
    on_ground INTEGER,
    velocity REAL,
    true_track REAL,
    vertical_rate REAL,
    sensors TEXT,
    barometric_altitude REAL,
    squawk TEXT,
    spi INTEGER,
    position_source INTEGER,
    category INTEGER,
    icao24 TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

db.run(createLiveFlightsTable, (err) => {
    if (err) {
        console.error('Error creating live_flights table:', err);
        return;
    }
    console.log('✅ Live flights table ready');
    
    // Query OpenSky API for PR flights
    console.log('🌐 Querying OpenSky Network API for PR101...');
    
    const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
    
    const options = {
        hostname: 'opensky-network.org',
        path: '/api/states/all',
        method: 'GET',
        headers: {
            'Authorization': `Basic ${auth}`,
            'User-Agent': 'SecurityMO-FlightTracker/1.0'
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                
                if (response.states) {
                    console.log(`📡 Received ${response.states.length} aircraft from OpenSky`);
                    
                    // Filter for Philippine Airlines flights
                    const prFlights = response.states.filter(state => {
                        const callsign = state[1] ? state[1].trim() : '';
                        return callsign.startsWith('PR') || callsign.startsWith('PAL');
                    });
                    
                    console.log(`✈️  Found ${prFlights.length} Philippine Airlines flights`);
                    
                    // Look specifically for PR101
                    const pr101 = prFlights.find(state => {
                        const callsign = state[1] ? state[1].trim() : '';
                        return callsign.includes('101') || callsign === 'PR101' || callsign === 'PAL101';
                    });
                    
                    if (pr101) {
                        console.log('\n🎯 PR101 FOUND IN LIVE DATA!');
                        console.log('─────────────────────────────────');
                        console.log(`✈️  Callsign: ${pr101[1] || 'N/A'}`);
                        console.log(`🌍 Origin Country: ${pr101[2] || 'N/A'}`);
                        console.log(`📍 Position: ${pr101[6]}, ${pr101[5]}`);
                        console.log(`📏 Altitude: ${pr101[7]} meters`);
                        console.log(`🛬 On Ground: ${pr101[8] ? 'Yes' : 'No'}`);
                        console.log(`💨 Velocity: ${pr101[9]} m/s`);
                        console.log(`🧭 True Track: ${pr101[10]}°`);
                        console.log(`📡 Last Contact: ${new Date(pr101[4] * 1000)}`);
                        console.log(`🏷️  ICAO24: ${pr101[0]}`);
                        
                        // Insert into database
                        const insertSql = `INSERT OR REPLACE INTO live_flights 
                            (icao24, callsign, origin_country, time_position, last_contact, 
                             longitude, latitude, altitude, on_ground, velocity, true_track, 
                             vertical_rate, barometric_altitude, squawk, spi, position_source, 
                             category, flight_number) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        
                        const flightNumber = pr101[1] ? pr101[1].trim().replace(/PAL/g, 'PR') : 'PR101';
                        
                        db.run(insertSql, [
                            pr101[0], pr101[1], pr101[2], pr101[3], pr101[4],
                            pr101[6], pr101[5], pr101[7], pr101[8], pr101[9],
                            pr101[10], pr101[11], pr101[13], pr101[14], pr101[15],
                            pr101[16], pr101[17], flightNumber
                        ], (err) => {
                            if (err) {
                                console.error('Error inserting live flight data:', err);
                            } else {
                                console.log('✅ PR101 live data saved to database');
                            }
                            db.close();
                        });
                        
                    } else {
                        console.log('\n❌ PR101 not currently airborne');
                        if (prFlights.length > 0) {
                            console.log('\n📋 Other PR flights currently airborne:');
                            prFlights.forEach(flight => {
                                console.log(`  - ${flight[1] || 'Unknown'} (${flight[0]})`);
                            });
                        }
                        db.close();
                    }
                    
                } else {
                    console.log('❌ No aircraft data received from API');
                    db.close();
                }
                
            } catch (error) {
                console.error('Error parsing API response:', error);
                db.close();
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('Error querying OpenSky API:', error);
        db.close();
    });
    
    req.end();
});
