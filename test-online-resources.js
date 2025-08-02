// Test the online flight fetcher
const OnlineFlightDataFetcher = require('./online-flight-fetcher');

async function testOnlineResources() {
    console.log('🌐 Testing Online Flight Data Resources...\n');
    
    const fetcher = new OnlineFlightDataFetcher();
    
    try {
        // Test AviationStack API
        console.log('1️⃣ Testing AviationStack API...');
        const aviationStackData = await fetcher.fetchFromAviationStack();
        console.log(`✅ AviationStack returned ${aviationStackData.length} flights`);
        if (aviationStackData.length > 0) {
            console.log('Sample flight:', aviationStackData[0]);
        }
        console.log('');
        
        // Test FlightAware API
        console.log('2️⃣ Testing FlightAware API...');
        const flightAwareData = await fetcher.fetchFromFlightAware();
        console.log(`✅ FlightAware returned ${flightAwareData.length} flights`);
        if (flightAwareData.length > 0) {
            console.log('Sample flight:', flightAwareData[0]);
        }
        console.log('');
        
        // Test OAG Schedule Data
        console.log('3️⃣ Testing OAG Schedule Data...');
        const oagData = await fetcher.fetchFromOAGScheduleData();
        console.log(`✅ OAG Data processed successfully`);
        console.log('');
        
        console.log('🎯 Summary:');
        console.log(`- AviationStack: ${aviationStackData.length} flights`);
        console.log(`- FlightAware: ${flightAwareData.length} flights`);
        console.log(`- OAG Data: Processing completed`);
        
    } catch (error) {
        console.error('❌ Error testing online resources:', error);
    }
}

testOnlineResources();
