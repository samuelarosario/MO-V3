const sqlite3 = require('sqlite3').verbose();
const SerpAPIFlightSearcher = require('./serpapi-flight-searcher');

/**
 * Database Updater with SerpAPI Integration
 * Replaces the AviationStack-based updater with SerpAPI Google Flights integration
 */
class SerpAPIatabaseUpdater {
    constructor() {
        this.dbPath = './security-mo.db';
        this.serpApi = new SerpAPIFlightSearcher();
    }

    async updateFlightDataFromSerpAPI() {
        console.log('🚀 Starting SerpAPI database update...');
        
        try {
            // Get existing flights from database
            const existingFlights = await this.getExistingFlights();
            console.log(`📋 Found ${existingFlights.length} existing flights in database`);

            let updatedCount = 0;
            let searchedCount = 0;

            // Process a sample of flights for demonstration
            const sampleFlights = existingFlights.slice(0, 10); // Limit to avoid API quota issues

            for (const flight of sampleFlights) {
                try {
                    console.log(`🔍 Searching for ${flight.flight_number}: ${flight.origin_code} → ${flight.destination_code}`);
                    
                    // Search for flight information via SerpAPI
                    const serpFlightInfo = await this.serpApi.searchSpecificFlight(flight.flight_number);
                    searchedCount++;

                    // Update database with search results
                    if (serpFlightInfo && (serpFlightInfo.status !== 'unknown' || serpFlightInfo.snippet)) {
                        await this.updateFlightWithSerpData(flight.flight_number, serpFlightInfo);
                        updatedCount++;
                        console.log(`   ✅ Updated ${flight.flight_number} with SerpAPI data`);
                    } else {
                        console.log(`   ℹ️  ${flight.flight_number}: No additional data found`);
                    }

                    // Add delay to respect API rate limits
                    await this.delay(1000);

                } catch (error) {
                    console.error(`   ❌ Error processing ${flight.flight_number}:`, error.message);
                }
            }

            // Update live flights table with search results
            await this.updateLiveFlightsTable();

            console.log('\n📊 SerpAPI Update Summary:');
            console.log(`   🔍 Flights searched: ${searchedCount}`);
            console.log(`   ✅ Flights updated: ${updatedCount}`);
            console.log(`   🎯 Success rate: ${Math.round((updatedCount/searchedCount) * 100)}%`);

            return {
                searched: searchedCount,
                updated: updatedCount,
                success: true
            };

        } catch (error) {
            console.error('❌ SerpAPI database update failed:', error);
            throw error;
        }
    }

    /**
     * Get existing flights from database
     */
    getExistingFlights() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            db.all(`
                SELECT flight_number, origin_code, destination_code, airline_name 
                FROM flights 
                WHERE status = 'active' 
                ORDER BY flight_number
            `, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
                db.close();
            });
        });
    }

    /**
     * Update flight with SerpAPI search data
     */
    updateFlightWithSerpData(flightNumber, serpData) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Create serpapi_data table if it doesn't exist
            db.run(`
                CREATE TABLE IF NOT EXISTS serpapi_flight_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    flight_number TEXT,
                    search_title TEXT,
                    search_link TEXT,
                    search_snippet TEXT,
                    extracted_status TEXT,
                    extracted_airline TEXT,
                    extracted_departure_code TEXT,
                    extracted_arrival_code TEXT,
                    extracted_departure_time TEXT,
                    extracted_arrival_time TEXT,
                    search_date TEXT,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(flight_number, search_date)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating serpapi_flight_data table:', err);
                }

                // Insert or update SerpAPI data
                const today = new Date().toISOString().split('T')[0];
                
                db.run(`
                    INSERT OR REPLACE INTO serpapi_flight_data 
                    (flight_number, search_title, search_link, search_snippet, 
                     extracted_status, extracted_airline, extracted_departure_code, 
                     extracted_arrival_code, extracted_departure_time, extracted_arrival_time, 
                     search_date, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `, [
                    flightNumber,
                    serpData.title || null,
                    serpData.link || null,
                    serpData.snippet || null,
                    serpData.status || null,
                    serpData.airline || null,
                    serpData.departure_code || null,
                    serpData.arrival_code || null,
                    serpData.departure_time || null,
                    serpData.arrival_time || null,
                    today
                ], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                    db.close();
                });
            });
        });
    }

    /**
     * Update live flights table with SerpAPI data
     */
    async updateLiveFlightsTable() {
        console.log('🔄 Updating live flights with SerpAPI search data...');
        
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Create updated live_flights table structure for SerpAPI
            db.run(`
                CREATE TABLE IF NOT EXISTS live_flights_serpapi (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    flight_number TEXT,
                    airline_name TEXT,
                    departure_airport TEXT,
                    departure_code TEXT,
                    departure_time TEXT,
                    arrival_airport TEXT,
                    arrival_code TEXT,
                    arrival_time TEXT,
                    flight_status TEXT,
                    search_source TEXT,
                    search_snippet TEXT,
                    search_link TEXT,
                    price_info TEXT,
                    currency TEXT,
                    duration TEXT,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating live_flights_serpapi table:', err);
                    reject(err);
                } else {
                    console.log('✅ Live flights SerpAPI table ready');
                    resolve();
                }
                db.close();
            });
        });
    }

    /**
     * Search for route-specific flights using SerpAPI
     */
    async searchRouteFlights(origin, destination, date = null) {
        console.log(`🛫 Searching route flights: ${origin} → ${destination}`);
        
        try {
            const flights = await this.serpApi.searchFlights(origin, destination, date);
            
            if (flights && flights.length > 0) {
                await this.saveSerpApiFlights(flights, origin, destination);
                console.log(`✅ Saved ${flights.length} flights from SerpAPI for ${origin} → ${destination}`);
            }
            
            return flights;
        } catch (error) {
            console.error(`❌ Error searching route ${origin} → ${destination}:`, error.message);
            return [];
        }
    }

    /**
     * Save SerpAPI flight results to database
     */
    saveSerpApiFlights(flights, origin, destination) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const insertPromises = flights.map(flight => {
                return new Promise((resolveInsert, rejectInsert) => {
                    db.run(`
                        INSERT OR REPLACE INTO live_flights_serpapi 
                        (flight_number, airline_name, departure_airport, departure_code, 
                         departure_time, arrival_airport, arrival_code, arrival_time, 
                         flight_status, search_source, price_info, currency, duration, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    `, [
                        flight.flight_number,
                        flight.airline_name,
                        flight.departure_airport,
                        flight.departure_code,
                        flight.departure_time,
                        flight.arrival_airport,
                        flight.arrival_code,
                        flight.arrival_time,
                        flight.status || 'scheduled',
                        'serpapi_google_flights',
                        flight.price ? `${flight.price} ${flight.currency}` : null,
                        flight.currency,
                        flight.duration
                    ], (err) => {
                        if (err) {
                            rejectInsert(err);
                        } else {
                            resolveInsert();
                        }
                    });
                });
            });

            Promise.all(insertPromises)
                .then(() => {
                    db.close();
                    resolve();
                })
                .catch((err) => {
                    db.close();
                    reject(err);
                });
        });
    }

    /**
     * Get database statistics
     */
    async getDatabaseStats() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const stats = {};
            
            // Get flight counts
            db.get('SELECT COUNT(*) as count FROM flights', (err, flightCount) => {
                if (err) {
                    reject(err);
                    return;
                }
                stats.scheduled_flights = flightCount.count;
                
                // Get SerpAPI search data count
                db.get('SELECT COUNT(*) as count FROM serpapi_flight_data', (err2, serpCount) => {
                    if (!err2 && serpCount) {
                        stats.serpapi_searches = serpCount.count;
                    } else {
                        stats.serpapi_searches = 0;
                    }
                    
                    // Get live flights count
                    db.get('SELECT COUNT(*) as count FROM live_flights_serpapi', (err3, liveCount) => {
                        if (!err3 && liveCount) {
                            stats.serpapi_live_flights = liveCount.count;
                        } else {
                            stats.serpapi_live_flights = 0;
                        }
                        
                        db.close();
                        resolve(stats);
                    });
                });
            });
        });
    }

    /**
     * Utility function to add delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = SerpAPIatabaseUpdater;
