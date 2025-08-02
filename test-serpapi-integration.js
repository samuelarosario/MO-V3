const SerpAPIatabaseUpdater = require('./database-updater-serpapi');

async function testSerpAPIIntegration() {
    console.log('🧪 Testing SerpAPI Database Integration');
    console.log('=====================================\n');

    try {
        const updater = new SerpAPIatabaseUpdater();

        // Get current database stats
        console.log('📊 Current Database Statistics:');
        const beforeStats = await updater.getDatabaseStats();
        console.log('   Scheduled flights:', beforeStats.scheduled_flights);
        console.log('   SerpAPI searches:', beforeStats.serpapi_searches);
        console.log('   SerpAPI live flights:', beforeStats.serpapi_live_flights);
        console.log('');

        // Test 1: Update existing flights with SerpAPI search data
        console.log('🔍 Test 1: Updating existing flights with SerpAPI...');
        const updateResult = await updater.updateFlightDataFromSerpAPI();
        console.log('Update result:', updateResult);
        console.log('');

        // Test 2: Search for route-specific flights
        console.log('🛫 Test 2: Searching route flights MNL → CEB');
        const routeFlights = await updater.searchRouteFlights('MNL', 'CEB');
        console.log(`Found ${routeFlights.length} flights for route MNL → CEB`);
        console.log('');

        // Test 3: Search another popular route
        console.log('🛫 Test 3: Searching route flights MNL → DVO');
        const routeFlights2 = await updater.searchRouteFlights('MNL', 'DVO');
        console.log(`Found ${routeFlights2.length} flights for route MNL → DVO`);
        console.log('');

        // Get final database stats
        console.log('📊 Final Database Statistics:');
        const afterStats = await updater.getDatabaseStats();
        console.log('   Scheduled flights:', afterStats.scheduled_flights);
        console.log('   SerpAPI searches:', afterStats.serpapi_searches);
        console.log('   SerpAPI live flights:', afterStats.serpapi_live_flights);
        console.log('');

        console.log('✅ SerpAPI integration test completed successfully!');
        console.log('');
        console.log('📈 Summary:');
        console.log(`   New SerpAPI searches: ${afterStats.serpapi_searches - beforeStats.serpapi_searches}`);
        console.log(`   New live flights: ${afterStats.serpapi_live_flights - beforeStats.serpapi_live_flights}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testSerpAPIIntegration()
        .then(() => {
            console.log('\n🎉 Test completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed with error:', error);
            process.exit(1);
        });
}

module.exports = testSerpAPIIntegration;
