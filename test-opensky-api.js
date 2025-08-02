// Test OpenSky Network API with real credentials
const OnlineFlightDataFetcher = require('./online-flight-fetcher');

async function testOpenSkyAPI() {
    console.log('🚀 Testing OpenSky Network API with real flight data...\n');
    
    const fetcher = new OnlineFlightDataFetcher();
    
    try {
        console.log('🔍 Fetching live flight data from OpenSky Network...');
        const flights = await fetcher.fetchFromOpenSky();
        
        console.log(`\n📊 RESULTS:`);
        console.log(`✅ Found ${flights.length} Philippine Airlines flights currently in the air\n`);
        
        if (flights.length > 0) {
            console.log('🛩️  LIVE PHILIPPINE AIRLINES FLIGHTS:');
            console.log('=' .repeat(60));
            
            flights.forEach((flight, index) => {
                console.log(`\n${index + 1}. ${flight.flight_number}`);
                console.log(`   Position: ${flight.position.latitude?.toFixed(4)}, ${flight.position.longitude?.toFixed(4)}`);
                console.log(`   Altitude: ${flight.position.altitude ? flight.position.altitude + ' m' : 'N/A'}`);
                console.log(`   Speed: ${flight.velocity ? Math.round(flight.velocity * 1.94384) + ' knots' : 'N/A'}`);
                console.log(`   Heading: ${flight.heading ? Math.round(flight.heading) + '°' : 'N/A'}`);
                console.log(`   Country: ${flight.origin_country}`);
                console.log(`   Last Contact: ${new Date(flight.last_contact).toLocaleString()}`);
            });
        } else {
            console.log('ℹ️  No Philippine Airlines flights currently in the air');
            console.log('   (This could be normal depending on time of day)');
        }
        
        console.log('\n🎯 This is REAL live flight data from OpenSky Network!');
        console.log('   Unlike the previous simulated data, this shows actual flights in the air right now.');
        
    } catch (error) {
        console.error('❌ Error fetching OpenSky data:', error.message);
        
        if (error.message.includes('timeout')) {
            console.log('ℹ️  API timeout - this can happen with high network load');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('ℹ️  Network connection issue - check internet connectivity');
        } else {
            console.log('ℹ️  This might be a temporary API issue or rate limiting');
        }
    }
}

testOpenSkyAPI();
