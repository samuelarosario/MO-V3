const SerpAPIFlightSearcher = require('./serpapi-flight-searcher');
const sqlite3 = require('sqlite3').verbose();

/**
 * Search for PR216 specifically and add it to the database if found
 */
async function searchAndAddPR216() {
    console.log('🔍 Searching for PR216 specifically via SerpAPI...\n');
    
    try {
        const serpApi = new SerpAPIFlightSearcher();
        
        // Search for PR216 flight information
        console.log('📞 Querying SerpAPI for PR216 flight status...');
        const flightInfo = await serpApi.searchSpecificFlight('PR216');
        
        console.log('\n📊 PR216 Search Results:');
        console.log('=' .repeat(50));
        console.log(`Flight Number: ${flightInfo.flight_number}`);
        console.log(`Status: ${flightInfo.status}`);
        console.log(`Airline: ${flightInfo.airline || 'Not specified'}`);
        console.log(`Route: ${flightInfo.departure_code || '?'} → ${flightInfo.arrival_code || '?'}`);
        console.log(`Departure Time: ${flightInfo.departure_time || 'Not specified'}`);
        console.log(`Arrival Time: ${flightInfo.arrival_time || 'Not specified'}`);
        console.log(`Found Results: ${flightInfo.found_results}`);
        
        if (flightInfo.title) {
            console.log(`\n📝 Title: ${flightInfo.title}`);
        }
        
        if (flightInfo.snippet) {
            console.log(`\n📄 Description: ${flightInfo.snippet}`);
        }
        
        if (flightInfo.link) {
            console.log(`\n🔗 Source: ${flightInfo.link}`);
        }
        
        // Try to add it to the database if we have route information
        if (flightInfo.departure_code && flightInfo.arrival_code && 
            flightInfo.departure_code !== '?' && flightInfo.arrival_code !== '?') {
            
            console.log('\n💾 Adding PR216 to database...');
            
            const db = new sqlite3.Database('./security-mo.db');
            
            const insertQuery = `
                INSERT OR REPLACE INTO flights (
                    flight_number, airline_name, origin_code, destination_code,
                    departure_time, arrival_time, updated_at, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                'PR216',
                flightInfo.airline || 'Philippine Airlines',
                flightInfo.departure_code,
                flightInfo.arrival_code,
                flightInfo.departure_time || null,
                flightInfo.arrival_time || null,
                new Date().toISOString(),
                'SerpAPI Search'
            ];
            
            await new Promise((resolve, reject) => {
                db.run(insertQuery, values, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`✅ PR216 added to database successfully!`);
                        resolve();
                    }
                });
            });
            
            db.close();
        } else {
            console.log('\n⚠️  Insufficient route information to add to database');
        }
        
        // Also save the search results to a SerpAPI-specific table
        console.log('\n💾 Saving search results to serpapi_searches table...');
        
        const db2 = new sqlite3.Database('./security-mo.db');
        
        const serpApiInsert = `
            INSERT OR REPLACE INTO serpapi_searches (
                flight_number, search_results, found_results, status,
                title, snippet, link, search_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const serpApiValues = [
            'PR216',
            JSON.stringify(flightInfo),
            flightInfo.found_results,
            flightInfo.status,
            flightInfo.title || null,
            flightInfo.snippet || null,
            flightInfo.link || null,
            new Date().toISOString()
        ];
        
        await new Promise((resolve, reject) => {
            db2.run(serpApiInsert, serpApiValues, function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ PR216 search results saved to serpapi_searches table`);
                    resolve();
                }
            });
        });
        
        db2.close();
        
    } catch (error) {
        console.error('❌ Error searching for PR216:', error.message);
    }
}

// Run the search
searchAndAddPR216().then(() => {
    console.log('\n🎉 PR216 search and update complete!');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});
