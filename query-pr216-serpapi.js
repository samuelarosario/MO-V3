const sqlite3 = require('sqlite3').verbose();
const SerpAPIFlightSearcher = require('./serpapi-flight-searcher');

async function queryFlightPR216() {
    console.log('=== PR216 Flight Information (SerpAPI Enhanced) ===\n');
    
    const db = new sqlite3.Database('./security-mo.db');
    const serpApi = new SerpAPIFlightSearcher();
    
    try {
        // Query scheduled flights
        const scheduledFlights = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM flights WHERE flight_number = ?', ['PR216'], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('📋 Scheduled Flight Data:');
        if (scheduledFlights.length > 0) {
            scheduledFlights.forEach(row => {
                console.log(`✈️  Flight: ${row.flight_number}`);
                console.log(`🛫 From: ${row.origin_code} (${row.departure_time})`);
                console.log(`🛬 To: ${row.destination_code} (${row.arrival_time})`);
                console.log(`🏢 Airline: ${row.airline_name} (${row.airline_code})`);
                console.log(`✈️  Aircraft: ${row.aircraft_type || 'Not specified'}`);
                console.log(`📅 Days: ${row.days_of_week || 'Not specified'}`);
                console.log(`⏱️  Duration: ${row.duration_minutes} minutes`);
                console.log(`📅 Valid: ${row.effective_from} to ${row.effective_to || 'ongoing'}`);
                console.log(`📊 Status: ${row.status}`);
                console.log('─────────────────────────────────');
            });
        } else {
            console.log('❌ No scheduled flight data found for PR216');
        }
        
        // Query existing SerpAPI data
        const serpApiData = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM serpapi_flight_data WHERE flight_number = ? 
                   ORDER BY updated_at DESC LIMIT 1`, ['PR216'], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n🔍 SerpAPI Search Data:');
        if (serpApiData.length > 0) {
            const data = serpApiData[0];
            console.log(`🔎 Search Title: ${data.search_title || 'N/A'}`);
            console.log(`🔗 Search Link: ${data.search_link || 'N/A'}`);
            console.log(`📝 Snippet: ${data.search_snippet || 'N/A'}`);
            if (data.extracted_status) {
                console.log(`📊 Status: ${data.extracted_status}`);
            }
            if (data.extracted_airline) {
                console.log(`🏢 Airline: ${data.extracted_airline}`);
            }
            if (data.extracted_departure_code && data.extracted_arrival_code) {
                console.log(`🛫 Route: ${data.extracted_departure_code} → ${data.extracted_arrival_code}`);
            }
            if (data.extracted_departure_time) {
                console.log(`⏰ Departure: ${data.extracted_departure_time}`);
            }
            if (data.extracted_arrival_time) {
                console.log(`⏰ Arrival: ${data.extracted_arrival_time}`);
            }
            console.log(`📅 Search Date: ${data.search_date}`);
            console.log(`🔄 Updated: ${data.updated_at}`);
        } else {
            console.log('ℹ️  No SerpAPI search data found for PR216');
        }
        
        // Query SerpAPI live flights
        const serpApiLiveFlights = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM live_flights_serpapi WHERE flight_number = ? 
                   ORDER BY updated_at DESC LIMIT 3`, ['PR216'], (err, rows) => {
                if (err) {
                    // Table might not exist yet
                    resolve([]);
                } else {
                    resolve(rows);
                }
            });
        });
        
        console.log('\n🔴 Live Flight Data (SerpAPI):');
        if (serpApiLiveFlights.length > 0) {
            serpApiLiveFlights.forEach((row, index) => {
                console.log(`\n--- Flight ${index + 1} ---`);
                console.log(`✈️  Flight: ${row.flight_number} (${row.airline_name})`);
                console.log(`📊 Status: ${row.flight_status || 'N/A'}`);
                console.log(`🛫 Departure: ${row.departure_airport} (${row.departure_code}) - ${row.departure_time || 'N/A'}`);
                console.log(`🛬 Arrival: ${row.arrival_airport} (${row.arrival_code}) - ${row.arrival_time || 'N/A'}`);
                if (row.duration) {
                    console.log(`⏱️  Duration: ${row.duration}`);
                }
                if (row.price_info) {
                    console.log(`💰 Price: ${row.price_info}`);
                }
                console.log(`🔍 Source: ${row.search_source}`);
                console.log(`🔄 Updated: ${row.updated_at}`);
            });
        } else {
            console.log('ℹ️  No SerpAPI live flight data found for PR216');
        }
        
        // Perform fresh SerpAPI search
        console.log('\n🔍 Performing Fresh SerpAPI Search...');
        try {
            const freshSearch = await serpApi.searchSpecificFlight('PR216');
            
            if (freshSearch) {
                console.log('\n🆕 Fresh SerpAPI Search Results:');
                console.log(`🔎 Title: ${freshSearch.title || 'N/A'}`);
                console.log(`🔗 Link: ${freshSearch.link || 'N/A'}`);
                console.log(`📝 Snippet: ${freshSearch.snippet || 'N/A'}`);
                
                if (freshSearch.status && freshSearch.status !== 'unknown') {
                    console.log(`📊 Status: ${freshSearch.status}`);
                }
                if (freshSearch.airline) {
                    console.log(`🏢 Airline: ${freshSearch.airline}`);
                }
                if (freshSearch.departure_code && freshSearch.arrival_code) {
                    console.log(`🛫 Route: ${freshSearch.departure_code} → ${freshSearch.arrival_code}`);
                }
                if (freshSearch.departure_time) {
                    console.log(`⏰ Departure: ${freshSearch.departure_time}`);
                }
                if (freshSearch.arrival_time) {
                    console.log(`⏰ Arrival: ${freshSearch.arrival_time}`);
                }
                
                console.log('✅ Fresh search completed');
            } else {
                console.log('ℹ️  No results from fresh SerpAPI search');
            }
        } catch (searchError) {
            console.error('❌ Fresh search failed:', searchError.message);
        }
        
        // Search for airline information
        console.log('\n🏢 Searching Philippine Airlines Information...');
        try {
            const airlineInfo = await serpApi.searchAirlineInfo('Philippine Airlines');
            
            if (airlineInfo && airlineInfo.length > 0) {
                console.log('\n✈️  Philippine Airlines Information:');
                airlineInfo.forEach((info, index) => {
                    if (index < 3) { // Show top 3 results
                        console.log(`\n--- Result ${index + 1} ---`);
                        console.log(`🔎 Title: ${info.title || 'N/A'}`);
                        console.log(`🔗 Link: ${info.link || 'N/A'}`);
                        console.log(`📝 Snippet: ${info.snippet || 'N/A'}`);
                    }
                });
            } else {
                console.log('ℹ️  No airline information found');
            }
        } catch (airlineError) {
            console.error('❌ Airline search failed:', airlineError.message);
        }
        
    } catch (error) {
        console.error('❌ Query failed:', error);
    } finally {
        db.close();
        console.log('\n✅ Query completed');
    }
}

// Run the query if this file is executed directly
if (require.main === module) {
    queryFlightPR216()
        .then(() => {
            console.log('\n🎉 PR216 query completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Query failed with error:', error);
            process.exit(1);
        });
}

module.exports = queryFlightPR216;
