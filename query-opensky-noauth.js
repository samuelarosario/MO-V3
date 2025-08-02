const https = require('https');

console.log('=== OpenSky API (No Auth) Query ===\n');

const options = {
    hostname: 'opensky-network.org',
    path: '/api/states/all',
    method: 'GET',
    headers: {
        'User-Agent': 'SecurityMO-FlightTracker/1.0'
    }
};

console.log('📡 Making unauthenticated API request...');

const req = https.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`📦 Data Length: ${data.length} bytes`);
        
        if (res.statusCode === 200 && data.length > 0) {
            try {
                const response = JSON.parse(data);
                console.log('✅ API response received successfully');
                
                if (response.states) {
                    console.log(`✈️  Total aircraft visible: ${response.states.length}`);
                    
                    // Look for any PR/PAL flights
                    const prFlights = response.states.filter(state => {
                        const callsign = state[1] ? state[1].trim() : '';
                        return callsign.startsWith('PR') || callsign.startsWith('PAL');
                    });
                    
                    console.log(`🇵🇭 Philippine Airlines flights currently airborne: ${prFlights.length}`);
                    
                    if (prFlights.length > 0) {
                        console.log('\n📋 PR flights found:');
                        prFlights.forEach((flight, index) => {
                            const callsign = flight[1] ? flight[1].trim() : 'No callsign';
                            const lat = flight[6];
                            const lon = flight[5];
                            const alt = flight[7];
                            const velocity = flight[9];
                            const onGround = flight[8];
                            
                            console.log(`${index + 1}. ✈️  ${callsign}`);
                            console.log(`   📍 Position: ${lat}, ${lon}`);
                            console.log(`   📏 Altitude: ${alt} meters`);
                            console.log(`   💨 Velocity: ${velocity} m/s`);
                            console.log(`   🛬 On Ground: ${onGround ? 'Yes' : 'No'}`);
                            console.log(`   🏷️  ICAO24: ${flight[0]}`);
                            
                            // Check if this could be PR101
                            if (callsign.includes('101')) {
                                console.log('   🎯 ** POTENTIAL PR101 MATCH! **');
                            }
                            console.log('   ─────────────────────────');
                        });
                    } else {
                        console.log('\n❌ No Philippine Airlines flights currently airborne');
                        console.log('   (PR101 is likely not flying at this moment)');
                    }
                    
                    // Sample a few other flights to show the system is working
                    console.log(`\n📊 Sample of other flights (showing first 5 of ${response.states.length}):`);
                    response.states.slice(0, 5).forEach((flight, index) => {
                        const callsign = flight[1] ? flight[1].trim() : 'No callsign';
                        console.log(`   ${index + 1}. ${callsign} (${flight[0]})`);
                    });
                    
                } else {
                    console.log('❌ No flight states in API response');
                }
                
            } catch (error) {
                console.error('❌ JSON parsing error:', error.message);
            }
        } else {
            console.log(`❌ API request failed with status ${res.statusCode}`);
            if (data.length > 0) {
                console.log('📄 Response:', data);
            }
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.setTimeout(15000, () => {
    console.error('❌ Request timeout after 15 seconds');
    req.destroy();
});

req.end();
