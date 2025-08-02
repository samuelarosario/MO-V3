// Online Flight Data Fetcher - OpenSky Network Integration
// Fetches real-time flight data from OpenSky Network API

const https = require('https');
const fs = require('fs');
const path = require('path');
const DatabaseUpdateManager = require('./database-update-manager');

class OnlineFlightDataFetcher {
    constructor() {
        this.manager = new DatabaseUpdateManager();
        this.loadCredentials();
    }

    // Load OpenSky API credentials
    loadCredentials() {
        try {
            const credentialsPath = path.join(__dirname, 'credentials.json');
            if (fs.existsSync(credentialsPath)) {
                const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
                this.openSkyClientId = credentials.clientId;
                this.openSkyClientSecret = credentials.clientSecret;
                console.log('✓ OpenSky credentials loaded');
            } else {
                console.log('⚠️  No credentials.json found - using anonymous access');
                this.openSkyClientId = null;
                this.openSkyClientSecret = null;
            }
        } catch (error) {
            console.error('❌ Error loading credentials:', error.message);
            this.openSkyClientId = null;
            this.openSkyClientSecret = null;
        }
    }

    // Fetch from OpenSky Network API (real flight data)
    async fetchFromOpenSky() {
        console.log('🌐 Fetching real flight data from OpenSky Network API...');
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'opensky-network.org',
                path: '/api/states/all',
                method: 'GET',
                headers: {
                    'User-Agent': 'Security-MO-Flight-Search/1.0'
                }
            };

            // Add authentication if credentials available
            if (this.openSkyClientId && this.openSkyClientSecret) {
                const auth = Buffer.from(`${this.openSkyClientId}:${this.openSkyClientSecret}`).toString('base64');
                options.headers['Authorization'] = `Basic ${auth}`;
                console.log('🔐 Using authenticated OpenSky API access');
            } else {
                console.log('🔓 Using anonymous OpenSky API access');
            }

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        const flights = this.processOpenSkyData(response);
                        resolve(flights);
                    } catch (error) {
                        console.error('❌ Error parsing OpenSky response:', error.message);
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ OpenSky API request error:', error.message);
                reject(error);
            });

            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error('OpenSky API request timeout'));
            });

            req.end();
        });
    }

    // Process OpenSky Network data
    processOpenSkyData(response) {
        const flights = [];
        
        if (response && response.states) {
            console.log(`📊 Processing ${response.states.length} live flights from OpenSky...`);
            
            response.states.forEach(state => {
                // OpenSky state format: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
                const [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate] = state;
                
                if (callsign && callsign.trim().startsWith('PR') && !on_ground) {
                    // Found a Philippine Airlines flight in the air
                    flights.push({
                        flight_number: callsign.trim(),
                        airline_code: 'PR',
                        airline_name: 'Philippine Airlines',
                        icao24: icao24,
                        origin_country: origin_country,
                        position: {
                            longitude: longitude,
                            latitude: latitude,
                            altitude: baro_altitude
                        },
                        velocity: velocity,
                        heading: true_track,
                        vertical_rate: vertical_rate,
                        last_contact: new Date(last_contact * 1000).toISOString(),
                        in_flight: !on_ground
                    });
                }
            });
        }
        
        console.log(`✓ Found ${flights.length} Philippine Airlines flights currently in the air`);
        return flights;
    }

    // Get all flights (not just PR) for testing
    async fetchAllFlights() {
        console.log('🌐 Fetching all flights from OpenSky Network API...');
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'opensky-network.org',
                path: '/api/states/all',
                method: 'GET',
                headers: {
                    'User-Agent': 'Security-MO-Flight-Search/1.0'
                }
            };

            if (this.openSkyClientId && this.openSkyClientSecret) {
                const auth = Buffer.from(`${this.openSkyClientId}:${this.openSkyClientSecret}`).toString('base64');
                options.headers['Authorization'] = `Basic ${auth}`;
            }

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        const flights = this.processAllFlights(response);
                        resolve(flights);
                    } catch (error) {
                        console.error('❌ Error parsing OpenSky response:', error.message);
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ OpenSky API request error:', error.message);
                reject(error);
            });

            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error('OpenSky API request timeout'));
            });

            req.end();
        });
    }

    // Process all flights data
    processAllFlights(response) {
        const flights = [];
        
        if (response && response.states) {
            console.log(`📊 Processing ${response.states.length} total live flights from OpenSky...`);
            
            // Just take first 10 flights for testing
            response.states.slice(0, 10).forEach(state => {
                const [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate] = state;
                
                if (callsign && callsign.trim() && !on_ground) {
                    flights.push({
                        flight_number: callsign.trim(),
                        icao24: icao24,
                        origin_country: origin_country,
                        position: {
                            longitude: longitude,
                            latitude: latitude,
                            altitude: baro_altitude
                        },
                        velocity: velocity,
                        heading: true_track,
                        vertical_rate: vertical_rate,
                        last_contact: new Date(last_contact * 1000).toISOString(),
                        in_flight: !on_ground
                    });
                }
            });
        }
        
        console.log(`✓ Processed ${flights.length} sample flights`);
        return flights;
    }

    // Update database with live flight data from OpenSky
    async updateFromOpenSky() {
        console.log('🔄 Updating database with live OpenSky flight data...');
        
        try {
            const liveFlights = await this.fetchFromOpenSky();
            
            if (liveFlights.length > 0) {
                console.log(`📊 Found ${liveFlights.length} live Philippine Airlines flights`);
                // Here you could update the database with live flight positions
                // For now, just return the data
                return liveFlights;
            } else {
                console.log('ℹ️  No Philippine Airlines flights currently airborne');
                return [];
            }
        } catch (error) {
            console.error('❌ Error updating from OpenSky:', error.message);
            throw error;
        }
    }
}

// Main execution
async function main() {
    const fetcher = new OnlineFlightDataFetcher();
    
    try {
        await fetcher.updateFromOpenSky();
        console.log('\\n🎉 OpenSky update completed successfully!');
    } catch (error) {
        console.error('\\n💥 OpenSky update failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = OnlineFlightDataFetcher;
