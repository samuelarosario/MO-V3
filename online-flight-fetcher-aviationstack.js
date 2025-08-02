// Online Flight Data Fetcher - AviationStack API Integration
// Fetches real-time flight data from AviationStack API

const https = require('https');
const fs = require('fs');
const path = require('path');
const DatabaseUpdateManager = require('./database-update-manager');

class OnlineFlightDataFetcher {
    constructor() {
        this.manager = new DatabaseUpdateManager();
        this.loadCredentials();
    }

    // Load AviationStack API token
    loadCredentials() {
        try {
            const credentialsPath = path.join(__dirname, 'credentials.json');
            if (fs.existsSync(credentialsPath)) {
                const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
                this.apiToken = credentials.aviationstack_token;
                console.log('✓ AviationStack credentials loaded');
            } else {
                console.log('❌ No credentials.json found');
                this.apiToken = null;
            }
        } catch (error) {
            console.error('❌ Error loading credentials:', error.message);
            this.apiToken = null;
        }
    }

    // Fetch from AviationStack API (real flight data)
    async fetchFromAviationStack() {
        console.log('🌐 Fetching real flight data from AviationStack API...');
        
        if (!this.apiToken) {
            throw new Error('AviationStack API token not available');
        }
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.aviationstack.com',
                path: `/v1/flights?access_key=${this.apiToken}&airline_iata=PR&limit=100`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Security-MO-Flight-Search/1.0'
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
                            console.log(`✓ AviationStack API response: ${response.data?.length || 0} flights`);
                            resolve(response.data || []);
                        } catch (error) {
                            console.error('❌ Error parsing AviationStack response:', error);
                            reject(error);
                        }
                    } else {
                        console.error(`❌ AviationStack API error: ${res.statusCode} - ${data}`);
                        reject(new Error(`API returned ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ AviationStack request error:', error);
                reject(error);
            });

            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error('AviationStack API timeout'));
            });

            req.end();
        });
    }

    // Process AviationStack flight data
    processAviationStackData(flights) {
        console.log(`🔄 Processing ${flights.length} flights from AviationStack...`);
        
        const processedFlights = flights.map(flight => ({
            flight_number: flight.flight?.iata || flight.flight?.icao || 'N/A',
            callsign: flight.flight?.number || flight.flight?.iata,
            airline_name: flight.airline?.name || 'N/A',
            airline_iata: flight.airline?.iata || 'N/A',
            airline_icao: flight.airline?.icao || 'N/A',
            flight_status: flight.flight_status || 'N/A',
            departure_airport: flight.departure?.airport || 'N/A',
            departure_iata: flight.departure?.iata || 'N/A',
            departure_icao: flight.departure?.icao || 'N/A',
            departure_scheduled: flight.departure?.scheduled || 'N/A',
            departure_estimated: flight.departure?.estimated || 'N/A',
            departure_actual: flight.departure?.actual || 'N/A',
            arrival_airport: flight.arrival?.airport || 'N/A',
            arrival_iata: flight.arrival?.iata || 'N/A',
            arrival_icao: flight.arrival?.icao || 'N/A',
            arrival_scheduled: flight.arrival?.scheduled || 'N/A',
            arrival_estimated: flight.arrival?.estimated || 'N/A',
            arrival_actual: flight.arrival?.actual || 'N/A',
            aircraft_registration: flight.aircraft?.registration || 'N/A',
            aircraft_icao: flight.aircraft?.icao || 'N/A',
            aircraft_iata: flight.aircraft?.iata || 'N/A',
            live_latitude: flight.live?.latitude || null,
            live_longitude: flight.live?.longitude || null,
            live_altitude: flight.live?.altitude || null,
            live_direction: flight.live?.direction || null,
            live_speed_horizontal: flight.live?.speed_horizontal || null,
            live_speed_vertical: flight.live?.speed_vertical || null,
            updated_at: new Date().toISOString()
        }));

        const prFlights = processedFlights.filter(f => 
            f.airline_iata === 'PR' || f.airline_icao === 'PAL' || 
            f.flight_number.startsWith('PR') || f.callsign?.startsWith('PR')
        );

        console.log(`✓ Found ${prFlights.length} Philippine Airlines flights`);
        return prFlights;
    }

    // Main update method using AviationStack
    async updateFromAviationStack() {
        try {
            console.log('🚀 Starting AviationStack update process...');
            
            const flights = await this.fetchFromAviationStack();
            const processedFlights = this.processAviationStackData(flights);
            
            console.log(`📊 Update complete: ${processedFlights.length} PR flights processed`);
            return processedFlights;
            
        } catch (error) {
            console.error('❌ AviationStack update failed:', error.message);
            throw error;
        }
    }

    // Public method to fetch live flight data
    async fetchLiveFlights() {
        return await this.updateFromAviationStack();
    }
}

module.exports = OnlineFlightDataFetcher;
