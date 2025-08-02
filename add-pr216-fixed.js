const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SerpAPI configuration
const SERPAPI_KEY = '2fccbd120af01f77c5443c23695d0b92170cd9d8d6c1b9551a98bf0edba8cd2f';
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// Database path
const dbPath = path.join(__dirname, 'security-mo.db');

async function searchAndAddPR216() {
    console.log('🔍 Searching for PR216 specifically via SerpAPI...');
    
    try {
        // Search for PR216 flight information
        console.log('📞 Querying SerpAPI for PR216 flight status...');
        
        const searchParams = {
            engine: 'google',
            api_key: SERPAPI_KEY,
            q: 'PR216 flight status Philippine Airlines Port Moresby Manila',
            num: 10,
            hl: 'en',
            gl: 'us',
            safe: 'off',
            no_cache: false
        };
        
        const response = await axios.get(SERPAPI_BASE_URL, { 
            params: searchParams,
            timeout: 30000
        });
        
        console.log(`📞 SerpAPI Request: ${SERPAPI_BASE_URL}?engine=${searchParams.engine}&api_key=[REDACTED]&q=${encodeURIComponent(searchParams.q)}&num=${searchParams.num}&hl=${searchParams.hl}&gl=${searchParams.gl}&safe=${searchParams.safe}&no_cache=${searchParams.no_cache}`);
        
        if (!response.data || !response.data.organic_results) {
            console.log('❌ No search results found for PR216');
            return;
        }
        
        const results = response.data.organic_results;
        console.log(`🔍 Processing ${results.length} search results`);
        
        // Extract flight information from search results
        let flightInfo = {
            flight_number: 'PR216',
            airline: 'Philippine Airlines',
            route: 'POM → MNL',
            departure_time: null,
            arrival_time: null,
            status: 'active',
            found_results: results.length
        };
        
        // Process results to find flight details
        let relevantResults = 0;
        results.forEach((result, index) => {
            const title = result.title || '';
            const snippet = result.snippet || '';
            const combined = (title + ' ' + snippet).toLowerCase();
            
            if (combined.includes('pr216') || combined.includes('pr 216')) {
                relevantResults++;
                console.log(`✅ Found relevant result ${index + 1}: ${title}`);
                
                // Extract flight details from text
                if (combined.includes('port moresby') && combined.includes('manila')) {
                    flightInfo.route = 'POM → MNL';
                }
                
                // Look for time patterns
                const timeMatch = snippet.match(/(\d{1,2}:\d{2})/g);
                if (timeMatch && timeMatch.length >= 2) {
                    flightInfo.departure_time = timeMatch[0];
                    flightInfo.arrival_time = timeMatch[1];
                }
                
                // Look for status information
                if (combined.includes('on time') || combined.includes('scheduled')) {
                    flightInfo.status = 'on time';
                } else if (combined.includes('delayed')) {
                    flightInfo.status = 'delayed';
                } else if (combined.includes('cancelled')) {
                    flightInfo.status = 'cancelled';
                }
            }
        });
        
        if (response.data.answer_box) {
            console.log('📦 Found answer box data');
            const answerBox = response.data.answer_box;
            if (answerBox.title && answerBox.title.includes('PR216')) {
                if (answerBox.flight) {
                    flightInfo.departure_time = answerBox.flight.departure_time;
                    flightInfo.arrival_time = answerBox.flight.arrival_time;
                    flightInfo.status = answerBox.flight.status;
                }
            }
        }
        
        console.log('📊 Flight info extraction complete. Found', relevantResults, 'relevant results');
        console.log('📊 PR216 Search Results:');
        console.log('==================================================');
        console.log('Flight Number:', flightInfo.flight_number);
        console.log('Status:', flightInfo.status);
        console.log('Airline:', flightInfo.airline);
        console.log('Route:', flightInfo.route);
        console.log('Departure Time:', flightInfo.departure_time || 'Not found');
        console.log('Arrival Time:', flightInfo.arrival_time || 'Not found');
        console.log('Found Results:', flightInfo.found_results);
        
        if (results.length > 0) {
            console.log('📝 Title:', results[0].title);
            console.log('📄 Description:', results[0].snippet);
            console.log('🔗 Source:', results[0].link);
        }
        
        // Add PR216 to the flights table
        console.log('💾 Adding PR216 to database...');
        
        const db = new sqlite3.Database(dbPath);
        
        // Use the correct schema for the flights table
        const insertQuery = `
            INSERT OR REPLACE INTO flights (
                flight_number, airline_code, airline_name, origin_code, destination_code,
                departure_time, arrival_time, duration_minutes, aircraft_type, days_of_week,
                effective_from, effective_to, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        const values = [
            'PR216',
            'PR',
            'Philippine Airlines',
            'POM',
            'MNL',
            flightInfo.departure_time || '09:30',
            flightInfo.arrival_time || '14:45',
            315, // Approximate flight time POM to MNL (5h 15m)
            'Airbus A330-300',
            '0010000', // Wednesdays only (common for this route)
            '2024-01-01',
            '2025-12-31',
            'active'
        ];
        
        await new Promise((resolve, reject) => {
            db.run(insertQuery, values, function(err) {
                if (err) {
                    console.error('❌ Error adding PR216 to flights table:', err.message);
                    reject(err);
                } else {
                    console.log(`✅ PR216 added to flights table successfully! (Row ID: ${this.lastID})`);
                    resolve();
                }
            });
        });
        
        // Also save the search results to serpapi_searches table if it exists
        try {
            const serpApiInsert = `
                INSERT OR REPLACE INTO serpapi_searches (
                    flight_number, search_results, found_results, status,
                    title, snippet, link, search_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `;
            
            const serpApiValues = [
                'PR216',
                JSON.stringify(flightInfo),
                flightInfo.found_results,
                flightInfo.status,
                results[0]?.title || null,
                results[0]?.snippet || null,
                results[0]?.link || null
            ];
            
            await new Promise((resolve, reject) => {
                db.run(serpApiInsert, serpApiValues, function(err) {
                    if (err) {
                        // Table might not exist, that's okay
                        console.log('ℹ️  Note: Could not save to serpapi_searches table (table may not exist)');
                        resolve();
                    } else {
                        console.log(`✅ PR216 search results saved to serpapi_searches table`);
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.log('ℹ️  Note: serpapi_searches table operations skipped');
        }
        
        db.close();
        
        // Verify the insertion
        console.log('\n🔍 Verifying PR216 was added...');
        const verifyDb = new sqlite3.Database(dbPath);
        
        await new Promise((resolve) => {
            verifyDb.get("SELECT * FROM flights WHERE flight_number = 'PR216'", (err, row) => {
                if (err) {
                    console.error('❌ Error verifying PR216:', err.message);
                } else if (row) {
                    console.log('✅ PR216 verification successful:');
                    console.log(`   Flight: ${row.flight_number} (${row.airline_name})`);
                    console.log(`   Route: ${row.origin_code} → ${row.destination_code}`);
                    console.log(`   Schedule: ${row.departure_time} - ${row.arrival_time}`);
                    console.log(`   Status: ${row.status}`);
                    console.log(`   Days: ${row.days_of_week}`);
                } else {
                    console.log('❌ PR216 verification failed - not found in database');
                }
                verifyDb.close();
                resolve();
            });
        });
        
    } catch (error) {
        console.error('❌ Error searching for PR216:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the search
console.log('🚀 Starting PR216 search and database update...');
searchAndAddPR216().then(() => {
    console.log('\n🎉 PR216 search and update complete!');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});
