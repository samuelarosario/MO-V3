const https = require('https');
const fs = require('fs');

// Load OpenSky credentials
const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

console.log('=== OpenSky API Debug Query ===\n');
console.log('🔐 Using credentials:', credentials.clientId);

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

console.log('📡 Making API request...');

const req = https.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`📦 Data Length: ${data.length} bytes`);
        
        if (data.length > 0) {
            try {
                const response = JSON.parse(data);
                console.log('✅ JSON parsed successfully');
                console.log('📊 Response keys:', Object.keys(response));
                
                if (response.states) {
                    console.log(`✈️  Total aircraft: ${response.states.length}`);
                    
                    // Look for any PR/PAL flights
                    const prFlights = response.states.filter(state => {
                        const callsign = state[1] ? state[1].trim() : '';
                        return callsign.startsWith('PR') || callsign.startsWith('PAL');
                    });
                    
                    console.log(`🇵🇭 Philippine Airlines flights: ${prFlights.length}`);
                    
                    if (prFlights.length > 0) {
                        console.log('\n📋 PR flights found:');
                        prFlights.forEach((flight, index) => {
                            console.log(`${index + 1}. ${flight[1] || 'No callsign'} (${flight[0]})`);
                        });
                    }
                    
                    // Check specifically for 101
                    const pr101Variants = response.states.filter(state => {
                        const callsign = state[1] ? state[1].trim() : '';
                        return callsign.includes('101');
                    });
                    
                    if (pr101Variants.length > 0) {
                        console.log('\n🎯 Flights containing "101":');
                        pr101Variants.forEach(flight => {
                            console.log(`  - ${flight[1]} (${flight[0]})`);
                        });
                    }
                    
                } else {
                    console.log('❌ No "states" property in response');
                    console.log('📄 Response sample:', JSON.stringify(response).substring(0, 500));
                }
                
            } catch (error) {
                console.error('❌ JSON parsing error:', error.message);
                console.log('📄 Raw response (first 500 chars):', data.substring(0, 500));
            }
        } else {
            console.log('❌ Empty response from API');
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.setTimeout(10000, () => {
    console.error('❌ Request timeout after 10 seconds');
    req.destroy();
});

req.end();
