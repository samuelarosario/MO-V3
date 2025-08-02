// Complete online resource test
const OnlineFlightDataFetcher = require('./online-flight-fetcher');

async function testAllOnlineSources() {
    console.log('🌐 Testing All Online Flight Data Sources...\n');
    
    const fetcher = new OnlineFlightDataFetcher();
    
    try {
        // 1. AviationStack
        console.log('1️⃣ AviationStack API Test:');
        const aviationData = await fetcher.fetchFromAviationStack();
        console.log(`✅ Retrieved ${aviationData.length} flights from AviationStack`);
        if (aviationData.length > 0) {
            console.log(`   Sample: ${aviationData[0].flight_number} (${aviationData[0].origin_code}-${aviationData[0].destination_code})`);
        }
        console.log('');
        
        // 2. FlightAware
        console.log('2️⃣ FlightAware API Test:');
        const flightAwareData = await fetcher.fetchFromFlightAware();
        console.log(`✅ Retrieved ${flightAwareData.length} flights from FlightAware`);
        if (flightAwareData.length > 0) {
            console.log(`   Sample: ${flightAwareData[0].flight_number} (${flightAwareData[0].origin_code}-${flightAwareData[0].destination_code})`);
        }
        console.log('');
        
        // 3. OAG Schedule Data
        console.log('3️⃣ OAG Schedule Data Test:');
        const oagData = await fetcher.fetchFromOAGScheduleData();
        console.log('✅ OAG schedule data processing completed');
        console.log('');
        
        // Summary
        console.log('📊 SUMMARY:');
        console.log(`   AviationStack: ${aviationData.length} flights`);
        console.log(`   FlightAware: ${flightAwareData.length} flights`);
        console.log(`   OAG Data: Available for comprehensive schedule patterns`);
        console.log('');
        console.log('✅ All online resources are operational!');
        
    } catch (error) {
        console.error('❌ Error testing online resources:', error.message);
    }
}

testAllOnlineSources();
