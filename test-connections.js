const ConnectingFlightAnalyzer = require('./connecting-flight-analyzer');

/**
 * Test Connecting Flight Analysis
 * Tests various routes to demonstrate layover warnings
 */
async function testConnectingFlights() {
    const analyzer = new ConnectingFlightAnalyzer();
    
    console.log('🧪 Testing Connecting Flight Analysis System');
    console.log('═══════════════════════════════════════════\n');
    
    // Test routes with different connection scenarios
    const testRoutes = [
        { origin: 'MNL', destination: 'LAX', description: 'Manila to Los Angeles (Trans-Pacific)' },
        { origin: 'POM', destination: 'SFO', description: 'Port Moresby to San Francisco (via MNL)' },
        { origin: 'LAX', destination: 'LHR', description: 'Los Angeles to London (Trans-Atlantic)' },
        { origin: 'JFK', destination: 'NRT', description: 'New York to Tokyo (via connecting hub)' },
        { origin: 'DXB', destination: 'SYD', description: 'Dubai to Sydney (Middle East to Australia)' }
    ];
    
    for (const route of testRoutes) {
        console.log(`\n🌟 Testing: ${route.description}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        try {
            await analyzer.analyzeRoute(route.origin, route.destination);
        } catch (error) {
            console.log(`❌ No connections found for ${route.origin} → ${route.destination}`);
        }
        
        console.log('\n' + '─'.repeat(80) + '\n');
        
        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🎉 All connection analysis tests completed!');
}

// Run tests
if (require.main === module) {
    testConnectingFlights()
        .then(() => {
            console.log('\n✅ Testing complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Testing failed:', error.message);
            process.exit(1);
        });
}
