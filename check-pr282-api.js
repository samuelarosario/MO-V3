const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const url = require('url');

// SerpAPI configuration
const SERPAPI_KEY = '2fccbd120af01f77c5443c23695d0b92170cd9d8d6c1b9551a98bf0edba8cd2f';
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// Database path
const dbPath = path.join(__dirname, 'security-mo.db');

// Helper function to make HTTPS requests
function makeRequest(requestUrl) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(requestUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'GET',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (error) {
                    reject(new Error('Failed to parse JSON response: ' + error.message));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

async function searchCurrentPR282() {
    console.log('🔍 Searching for current PR282 data via SerpAPI...');
    
    try {
        const searchParams = new URLSearchParams({
            engine: 'google',
            api_key: SERPAPI_KEY,
            q: 'PR282 flight status Philippine Airlines Port Moresby Manila live',
            num: '10',
            hl: 'en',
            gl: 'us',
            safe: 'off',
            no_cache: 'true'  // Force fresh data
        });
        
        const requestUrl = `${SERPAPI_BASE_URL}?${searchParams.toString()}`;
        console.log('📞 Querying SerpAPI for current PR282 data...');
        
        const response = await makeRequest(requestUrl);
        
        if (!response || !response.organic_results) {
            console.log('❌ No search results found for PR282');
            return null;
        }
        
        console.log(`📊 Processing ${response.organic_results.length} search results`);
        
        let currentSchedule = {
            flight_number: 'PR282',
            departure_time: null,
            arrival_time: null,
            status: 'active',
            found_results: response.organic_results.length
        };
        
        // Process results to find current schedule
        response.organic_results.forEach((result, index) => {
            const title = result.title || '';
            const snippet = result.snippet || '';
            const combined = (title + ' ' + snippet).toLowerCase();
            
            if (combined.includes('pr282') || combined.includes('pr 282')) {
                console.log(`✅ Found PR282 reference ${index + 1}: ${title}`);
                console.log(`   📄 ${snippet}`);
                
                // Look for time patterns
                const timePattern = /(\d{1,2}:\d{2})/g;
                const times = snippet.match(timePattern);
                if (times && times.length >= 2) {
                    currentSchedule.departure_time = times[0];
                    currentSchedule.arrival_time = times[1];
                    console.log(`   ⏰ Times found: ${times[0]} → ${times[1]}`);
                }
                
                // Look for status
                if (combined.includes('on time')) {
                    currentSchedule.status = 'on time';
                } else if (combined.includes('delayed')) {
                    currentSchedule.status = 'delayed';
                } else if (combined.includes('cancelled')) {
                    currentSchedule.status = 'cancelled';
                }
            }
        });
        
        return currentSchedule;
        
    } catch (error) {
        console.error('❌ Error searching for PR282:', error.message);
        return null;
    }
}

async function comparePR282Data() {
    console.log('🚀 Comparing current database PR282 with live API data...');
    console.log('==================================================');
    
    try {
        // Get current database data
        const db = new sqlite3.Database(dbPath);
        
        const dbData = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM flights WHERE flight_number = 'PR282'", (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
        
        if (!dbData) {
            console.log('❌ PR282 not found in database');
            return;
        }
        
        console.log('📊 Current Database Data:');
        console.log(`   Flight: ${dbData.flight_number}`);
        console.log(`   Route: ${dbData.origin_code} → ${dbData.destination_code}`);
        console.log(`   Schedule: ${dbData.departure_time} → ${dbData.arrival_time}`);
        console.log(`   Duration: ${dbData.duration_minutes} minutes`);
        console.log(`   Aircraft: ${dbData.aircraft_type}`);
        console.log(`   Created: ${dbData.created_at}`);
        
        // Get current API data
        const apiData = await searchCurrentPR282();
        
        if (!apiData) {
            console.log('\n❌ Could not retrieve current API data for comparison');
            db.close();
            return;
        }
        
        console.log('\n📊 Current API Data:');
        console.log(`   Flight: ${apiData.flight_number}`);
        console.log(`   Departure: ${apiData.departure_time || 'Not found'}`);
        console.log(`   Arrival: ${apiData.arrival_time || 'Not found'}`);
        console.log(`   Status: ${apiData.status}`);
        console.log(`   Search Results: ${apiData.found_results}`);
        
        // Compare and show differences
        console.log('\n🔍 Comparison:');
        console.log('==================================================');
        
        if (apiData.departure_time && apiData.departure_time !== dbData.departure_time) {
            console.log(`⚠️  DIFFERENCE - Departure time:`);
            console.log(`   Database: ${dbData.departure_time}`);
            console.log(`   API: ${apiData.departure_time}`);
        } else if (apiData.departure_time) {
            console.log(`✅ Departure time matches: ${dbData.departure_time}`);
        } else {
            console.log(`ℹ️  No departure time found in API results`);
        }
        
        if (apiData.arrival_time && apiData.arrival_time !== dbData.arrival_time) {
            console.log(`⚠️  DIFFERENCE - Arrival time:`);
            console.log(`   Database: ${dbData.arrival_time}`);
            console.log(`   API: ${apiData.arrival_time}`);
        } else if (apiData.arrival_time) {
            console.log(`✅ Arrival time matches: ${dbData.arrival_time}`);
        } else {
            console.log(`ℹ️  No arrival time found in API results`);
        }
        
        // Update if needed
        if ((apiData.departure_time && apiData.departure_time !== dbData.departure_time) ||
            (apiData.arrival_time && apiData.arrival_time !== dbData.arrival_time)) {
            
            console.log('\n🔄 Would you like to update the database with API data? (This would need manual confirmation)');
            console.log('   Current process is comparison only.');
        } else {
            console.log('\n✅ Database data appears to be current or API data is incomplete');
        }
        
        db.close();
        
    } catch (error) {
        console.error('💥 Error during comparison:', error.message);
    }
}

// Run the comparison
comparePR282Data().then(() => {
    console.log('\n🎉 PR282 comparison complete!');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});
