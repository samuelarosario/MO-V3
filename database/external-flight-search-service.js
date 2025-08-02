const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * External Flight Search Service
 * Handles flight searches specifically from the external-source.db database
 */
class ExternalFlightSearchService {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'external-source.db');
        this.db = null;
    }

    // Initialize database connection
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error connecting to external database:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Connected to external-source.db');
                    resolve();
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
        }
    }

    // Search for flights in external database
    async searchFlights(originCode, destinationCode, departureDate) {
        console.log(`🔍 Searching external flights: ${originCode} → ${destinationCode}`);
        
        // Get current date in YYYY-MM-DD format
        const currentDate = new Date().toISOString().split('T')[0];
        const searchDate = departureDate || currentDate;
        
        console.log(`📅 Current date: ${currentDate}, Search date: ${searchDate}`);
        
        // Skip search if trying to search for current day
        if (searchDate === currentDate) {
            console.log('⚠️ Skipping search for current day flights');
            return {
                success: true,
                route: `${originCode} → ${destinationCode}`,
                totalFlights: 0,
                flights: [],
                source: 'external-database',
                message: 'No flights available for current day departure',
                timestamp: new Date().toISOString()
            };
        }
        
        if (!this.db) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            // Search for direct flights (excluding current day departures)
            const directQuery = `
                SELECT 
                    flight_number,
                    airline_iata_code,
                    airline_name,
                    origin_iata,
                    origin_name,
                    destination_iata,
                    destination_name,
                    departure_time,
                    arrival_time,
                    duration_minutes,
                    aircraft_type,
                    operating_days,
                    frequency,
                    status,
                    source_name
                FROM external_flights 
                WHERE origin_iata = ? AND destination_iata = ?
                AND (status = 'Active' OR status IS NULL)
                ORDER BY departure_time
            `;

            this.db.all(directQuery, [originCode, destinationCode], (err, rows) => {
                if (err) {
                    console.error('❌ Error searching external flights:', err.message);
                    reject(err);
                    return;
                }

                console.log(`✅ Found ${rows.length} external flights`);
                
                // Filter flights by operating days based on departure date
                const searchDateObj = new Date(searchDate + 'T00:00:00');
                const dayOfWeek = searchDateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
                
                console.log(`📅 Search date: ${searchDate} is day ${dayOfWeek} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]})`);
                
                const filteredFlights = rows.filter(flight => {
                    // Handle different operating_days formats
                    if (!flight.operating_days) {
                        console.log(`⚠️ No operating_days for ${flight.flight_number}, including by default`);
                        return true;
                    }
                    
                    // Handle "Daily" string - but check frequency text for specific days
                    if (flight.operating_days === 'Daily') {
                        // Check if frequency text indicates specific days rather than truly daily
                        if (flight.frequency && flight.frequency.includes('(')) {
                            // Extract days from frequency text like "Same Day Service (Tue, Fri, Sun)"
                            const daysMatch = flight.frequency.match(/\(([^)]+)\)/);
                            if (daysMatch) {
                                const daysText = daysMatch[1].toLowerCase();
                                const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                                const currentDay = dayNames[dayOfWeek];
                                
                                // Check if current day is mentioned in the frequency text
                                const operatesOnDay = daysText.includes(currentDay);
                                console.log(`${flight.flight_number}: operating_days="Daily" but frequency="${flight.frequency}" → day ${dayOfWeek} (${currentDay}) operates: ${operatesOnDay}`);
                                return operatesOnDay;
                            }
                        }
                        
                        // If no specific days in frequency, assume truly daily
                        console.log(`${flight.flight_number}: operating_days="Daily", operates every day: true`);
                        return true;
                    }
                    
                    // Handle 7-character binary pattern (e.g., "1111111", "1010010")
                    if (flight.operating_days.length === 7 && /^[01]+$/.test(flight.operating_days)) {
                        const operatesOnDay = flight.operating_days[dayOfWeek] === '1';
                        console.log(`${flight.flight_number}: operating_days=${flight.operating_days}, day ${dayOfWeek} operates: ${operatesOnDay}`);
                        return operatesOnDay;
                    }
                    
                    // Unknown format - include with warning
                    console.log(`⚠️ Unknown operating_days format for ${flight.flight_number}: "${flight.operating_days}", including by default`);
                    return true;
                });
                
                console.log(`🎯 After operating day filter: ${filteredFlights.length} flights`);
                
                const searchResults = {
                    success: true,
                    route: `${originCode} → ${destinationCode}`,
                    totalFlights: filteredFlights.length,
                    flights: filteredFlights.map(flight => ({
                        type: 'direct',
                        flightNumber: flight.flight_number,
                        airline: flight.airline_name,
                        airlineCode: flight.airline_iata_code,
                        origin: {
                            code: flight.origin_iata,
                            name: flight.origin_name
                        },
                        destination: {
                            code: flight.destination_iata,
                            name: flight.destination_name
                        },
                        departure: flight.departure_time,
                        arrival: flight.arrival_time,
                        duration: flight.duration_minutes,
                        aircraft: flight.aircraft_type,
                        operatingDays: flight.operating_days,
                        frequency: flight.frequency,
                        source: flight.source_name || 'External Database'
                    })),
                    source: 'external-database',
                    timestamp: new Date().toISOString()
                };

                resolve(searchResults);
            });
        });
    }

    // Get airports from external database
    async getAirports(searchQuery = '') {
        if (!this.db) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            let query, params;
            
            if (searchQuery) {
                // Search in both external_airports and external_flights tables
                query = `
                    SELECT DISTINCT
                        iata_code,
                        airport_name,
                        city,
                        country
                    FROM (
                        SELECT 
                            iata_code,
                            airport_name,
                            city,
                            country
                        FROM external_airports 
                        WHERE iata_code LIKE ? OR airport_name LIKE ? OR city LIKE ? OR country LIKE ?
                        
                        UNION
                        
                        SELECT DISTINCT
                            origin_iata as iata_code,
                            origin_name as airport_name,
                            CASE 
                                WHEN origin_iata = 'NRT' THEN 'Tokyo'
                                WHEN origin_iata = 'HND' THEN 'Tokyo'
                                WHEN origin_iata = 'MNL' THEN 'Manila'
                                WHEN origin_iata = 'POM' THEN 'Port Moresby'
                                WHEN origin_iata = 'BKK' THEN 'Bangkok'
                                WHEN origin_iata = 'KUL' THEN 'Kuala Lumpur'
                                WHEN origin_iata = 'CGK' THEN 'Jakarta'
                                WHEN origin_iata = 'SIN' THEN 'Singapore'
                                ELSE 'Unknown City'
                            END as city,
                            CASE 
                                WHEN origin_iata = 'NRT' THEN 'Japan'
                                WHEN origin_iata = 'HND' THEN 'Japan'
                                WHEN origin_iata = 'MNL' THEN 'Philippines'
                                WHEN origin_iata = 'POM' THEN 'Papua New Guinea'
                                WHEN origin_iata = 'BKK' THEN 'Thailand'
                                WHEN origin_iata = 'KUL' THEN 'Malaysia'
                                WHEN origin_iata = 'CGK' THEN 'Indonesia'
                                WHEN origin_iata = 'SIN' THEN 'Singapore'
                                ELSE 'Unknown Country'
                            END as country
                        FROM external_flights 
                        WHERE (origin_iata LIKE ? OR origin_name LIKE ?)
                        AND origin_iata NOT IN (SELECT iata_code FROM external_airports WHERE iata_code IS NOT NULL)
                        
                        UNION
                        
                        SELECT DISTINCT
                            destination_iata as iata_code,
                            destination_name as airport_name,
                            CASE 
                                WHEN destination_iata = 'NRT' THEN 'Tokyo'
                                WHEN destination_iata = 'HND' THEN 'Tokyo'
                                WHEN destination_iata = 'MNL' THEN 'Manila'
                                WHEN destination_iata = 'POM' THEN 'Port Moresby'
                                WHEN destination_iata = 'BKK' THEN 'Bangkok'
                                WHEN destination_iata = 'KUL' THEN 'Kuala Lumpur'
                                WHEN destination_iata = 'CGK' THEN 'Jakarta'
                                WHEN destination_iata = 'SIN' THEN 'Singapore'
                                ELSE 'Unknown City'
                            END as city,
                            CASE 
                                WHEN destination_iata = 'NRT' THEN 'Japan'
                                WHEN destination_iata = 'HND' THEN 'Japan'
                                WHEN destination_iata = 'MNL' THEN 'Philippines'
                                WHEN destination_iata = 'POM' THEN 'Papua New Guinea'
                                WHEN destination_iata = 'BKK' THEN 'Thailand'
                                WHEN destination_iata = 'KUL' THEN 'Malaysia'
                                WHEN destination_iata = 'CGK' THEN 'Indonesia'
                                WHEN destination_iata = 'SIN' THEN 'Singapore'
                                ELSE 'Unknown Country'
                            END as country
                        FROM external_flights 
                        WHERE (destination_iata LIKE ? OR destination_name LIKE ?)
                        AND destination_iata NOT IN (SELECT iata_code FROM external_airports WHERE iata_code IS NOT NULL)
                    ) AS all_airports
                    ORDER BY 
                        CASE 
                            WHEN iata_code = ? THEN 1
                            WHEN city = ? THEN 2
                            WHEN iata_code LIKE ? THEN 3
                            WHEN city LIKE ? THEN 4
                            ELSE 5
                        END,
                        iata_code
                    LIMIT 20
                `;
                const searchTerm = `%${searchQuery}%`;
                const upperQuery = searchQuery.toUpperCase();
                params = [
                    searchTerm, searchTerm, searchTerm, searchTerm,  // external_airports LIKE searches
                    searchTerm, searchTerm,  // external_flights origin LIKE searches
                    searchTerm, searchTerm,  // external_flights destination LIKE searches
                    upperQuery, searchQuery, upperQuery + '%', searchQuery + '%'  // Exact and prefix matches for ordering
                ];
            } else {
                query = `
                    SELECT DISTINCT
                        iata_code,
                        airport_name,
                        city,
                        country
                    FROM (
                        SELECT 
                            iata_code,
                            airport_name,
                            city,
                            country
                        FROM external_airports 
                        
                        UNION
                        
                        SELECT DISTINCT
                            origin_iata as iata_code,
                            origin_name as airport_name,
                            CASE 
                                WHEN origin_iata = 'NRT' THEN 'Tokyo'
                                WHEN origin_iata = 'HND' THEN 'Tokyo'
                                WHEN origin_iata = 'MNL' THEN 'Manila'
                                WHEN origin_iata = 'POM' THEN 'Port Moresby'
                                WHEN origin_iata = 'BKK' THEN 'Bangkok'
                                WHEN origin_iata = 'KUL' THEN 'Kuala Lumpur'
                                WHEN origin_iata = 'CGK' THEN 'Jakarta'
                                WHEN origin_iata = 'SIN' THEN 'Singapore'
                                ELSE 'Unknown City'
                            END as city,
                            CASE 
                                WHEN origin_iata = 'NRT' THEN 'Japan'
                                WHEN origin_iata = 'HND' THEN 'Japan'
                                WHEN origin_iata = 'MNL' THEN 'Philippines'
                                WHEN origin_iata = 'POM' THEN 'Papua New Guinea'
                                WHEN origin_iata = 'BKK' THEN 'Thailand'
                                WHEN origin_iata = 'KUL' THEN 'Malaysia'
                                WHEN origin_iata = 'CGK' THEN 'Indonesia'
                                WHEN origin_iata = 'SIN' THEN 'Singapore'
                                ELSE 'Unknown Country'
                            END as country
                        FROM external_flights 
                        WHERE origin_iata NOT IN (SELECT iata_code FROM external_airports WHERE iata_code IS NOT NULL)
                        
                        UNION
                        
                        SELECT DISTINCT
                            destination_iata as iata_code,
                            destination_name as airport_name,
                            CASE 
                                WHEN destination_iata = 'NRT' THEN 'Tokyo'
                                WHEN destination_iata = 'HND' THEN 'Tokyo'
                                WHEN destination_iata = 'MNL' THEN 'Manila'
                                WHEN destination_iata = 'POM' THEN 'Port Moresby'
                                WHEN destination_iata = 'BKK' THEN 'Bangkok'
                                WHEN destination_iata = 'KUL' THEN 'Kuala Lumpur'
                                WHEN destination_iata = 'CGK' THEN 'Jakarta'
                                WHEN destination_iata = 'SIN' THEN 'Singapore'
                                ELSE 'Unknown City'
                            END as city,
                            CASE 
                                WHEN destination_iata = 'NRT' THEN 'Japan'
                                WHEN destination_iata = 'HND' THEN 'Japan'
                                WHEN destination_iata = 'MNL' THEN 'Philippines'
                                WHEN destination_iata = 'POM' THEN 'Papua New Guinea'
                                WHEN destination_iata = 'BKK' THEN 'Thailand'
                                WHEN destination_iata = 'KUL' THEN 'Malaysia'
                                WHEN destination_iata = 'CGK' THEN 'Indonesia'
                                WHEN destination_iata = 'SIN' THEN 'Singapore'
                                ELSE 'Unknown Country'
                            END as country
                        FROM external_flights 
                        WHERE destination_iata NOT IN (SELECT iata_code FROM external_airports WHERE iata_code IS NOT NULL)
                    ) AS all_airports
                    ORDER BY iata_code
                    LIMIT 50
                `;
                params = [];
            }

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('❌ Error getting external airports:', err.message);
                    reject(err);
                    return;
                }

                // Map to the expected format for the frontend
                const formattedAirports = rows.map(row => ({
                    iata_code: row.iata_code,
                    airport_name: row.airport_name,
                    city_name: row.city,
                    country_name: row.country
                }));

                resolve(formattedAirports);
            });
        });
    }

    // Get flight statistics
    async getFlightStats() {
        if (!this.db) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_flights,
                    COUNT(DISTINCT airline_iata_code) as total_airlines,
                    COUNT(DISTINCT origin_iata) as total_origins,
                    COUNT(DISTINCT destination_iata) as total_destinations,
                    COUNT(DISTINCT aircraft_type) as total_aircraft_types
                FROM external_flights
                WHERE status = 'Active'
            `;

            this.db.get(statsQuery, [], (err, row) => {
                if (err) {
                    console.error('❌ Error getting external flight stats:', err.message);
                    reject(err);
                    return;
                }

                resolve(row);
            });
        });
    }
}

module.exports = ExternalFlightSearchService;
