const ConnectingFlightAnalyzer = require('./connecting-flight-analyzer');

/**
 * Quick Connection Checker
 * Simple interface to check specific connecting flight routes
 */
async function checkSpecificConnections() {
    const analyzer = new ConnectingFlightAnalyzer();
    
    console.log('✈️  QUICK CONNECTION ANALYSIS');
    console.log('════════════════════════════════\n');
    
    // Test some common connection scenarios from our database
    const commonRoutes = [
        { from: 'MNL', to: 'JFK', name: 'Manila to New York' },
        { from: 'LAX', to: 'MNL', name: 'Los Angeles to Manila' },
        { from: 'POM', to: 'LAX', name: 'Port Moresby to Los Angeles' },
        { from: 'SIN', to: 'SFO', name: 'Singapore to San Francisco' }
    ];
    
    for (const route of commonRoutes) {
        console.log(`🔍 Checking: ${route.name} (${route.from} → ${route.to})`);
        
        try {
            const connections = await analyzer.analyzeRoute(route.from, route.to);
            
            if (connections && connections.length > 0) {
                // Quick summary of best options
                const bestConnection = connections[0];
                const layoverTime = Math.floor(bestConnection.layover.minutes / 60) + 'h ' + (bestConnection.layover.minutes % 60) + 'm';
                
                console.log(`   🏆 Best connection: ${layoverTime} layover at ${bestConnection.layover.airport}`);
                console.log(`   ${bestConnection.layover.warning.color} - ${bestConnection.layover.warning.status}`);
            }
        } catch (error) {
            console.log(`   ❌ No connections available`);
        }
        
        console.log('   ' + '─'.repeat(50));
    }
}

// Run the quick checker
checkSpecificConnections()
    .then(() => {
        console.log('\n✅ Quick connection check complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Connection check failed:', error.message);
        process.exit(1);
    });
