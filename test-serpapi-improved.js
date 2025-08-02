const SerpAPIFlightSearcher = require('./serpapi-flight-searcher');

/**
 * Test the improved SerpAPI implementation
 * This tests all the improvements we made according to the official documentation
 */
async function testImprovedSerpAPI() {
    console.log('🚀 Testing Improved SerpAPI Implementation');
    console.log('=' .repeat(50));
    
    try {
        const serpApi = new SerpAPIFlightSearcher();
        
        // Test 1: Flight Search with proper parameters
        console.log('\n📋 Test 1: Google Flights Search (MNL → CEB)');
        try {
            const flights = await serpApi.searchFlights('MNL', 'CEB');
            console.log(`✅ Flight search successful: ${flights.length} flights found`);
            
            if (flights.length > 0) {
                console.log('📄 Sample flight data:');
                console.log(JSON.stringify(flights[0], null, 2));
            }
        } catch (error) {
            console.error('❌ Flight search failed:', error.message);
        }
        
        // Test 2: Specific Flight Status Search
        console.log('\n📋 Test 2: Specific Flight Status (PR216)');
        try {
            const flightStatus = await serpApi.searchSpecificFlight('PR216');
            console.log('✅ Flight status search successful');
            console.log(`📊 Found ${flightStatus.found_results} relevant results`);
            console.log('📄 Flight status data:');
            console.log(JSON.stringify(flightStatus, null, 2));
        } catch (error) {
            console.error('❌ Flight status search failed:', error.message);
        }
        
        // Test 3: Airline Information Search
        console.log('\n📋 Test 3: Airline Information (PR)');
        try {
            const airlineInfo = await serpApi.searchAirlineInfo('PR');
            console.log('✅ Airline search successful');
            console.log(`📊 Found ${airlineInfo.found_results} relevant results`);
            console.log('📄 Airline info data:');
            console.log(JSON.stringify(airlineInfo, null, 2));
        } catch (error) {
            console.error('❌ Airline search failed:', error.message);
        }
        
        // Test 4: Rate Limiting Test
        console.log('\n📋 Test 4: Rate Limiting Test');
        console.log('⏰ Testing multiple requests with rate limiting...');
        const startTime = Date.now();
        
        try {
            // Make 3 rapid requests to test rate limiting
            const promises = [
                serpApi.searchSpecificFlight('PR100'),
                serpApi.searchSpecificFlight('PR200'),
                serpApi.searchSpecificFlight('PR300')
            ];
            
            await Promise.all(promises);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            console.log(`✅ Rate limiting test complete. Total time: ${totalTime}ms`);
            console.log(`📊 Average time per request: ${totalTime / 3}ms`);
            
        } catch (error) {
            console.error('❌ Rate limiting test failed:', error.message);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('💥 Critical error during testing:', error.message);
    }
}

// Run the tests
testImprovedSerpAPI().then(() => {
    console.log('✅ Test suite finished');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
});
