// Verify Local Database vs Online Update Procedure
// This script compares current database content with online flight fetcher data

const sqlite3 = require('sqlite3').verbose();
const OnlineFlightDataFetcher = require('./online-flight-fetcher');

class DatabaseVerifier {
    constructor() {
        this.fetcher = new OnlineFlightDataFetcher();
        this.dbPath = './security-mo.db';
    }

    async verifyDatabase() {
        console.log('🔍 Starting Database Verification...\n');
        
        try {
            // Get current database content
            const dbFlights = await this.getCurrentDatabaseFlights();
            console.log(`📊 Current Database: ${dbFlights.length} flights`);
            
            // Get online flight data
            const onlineFlights = await this.getOnlineFlightData();
            console.log(`🌐 Online Data: ${onlineFlights.length} flights\n`);
            
            // Compare the data
            this.compareFlightData(dbFlights, onlineFlights);
            
        } catch (error) {
            console.error('❌ Error during verification:', error);
        }
    }

    async getCurrentDatabaseFlights() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = `
                SELECT 
                    flight_number,
                    airline_code,
                    airline_name,
                    origin_code,
                    destination_code,
                    departure_time,
                    arrival_time,
                    duration_minutes,
                    aircraft_type,
                    days_of_week
                FROM flights
                WHERE airline_code = 'PR'
                ORDER BY flight_number
            `;
            
            db.all(query, [], (err, rows) => {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getOnlineFlightData() {
        try {
            // Get data from our online flight fetcher
            const oagData = await this.fetcher.fetchFromOAGScheduleData();
            return oagData;
        } catch (error) {
            console.error('Error fetching online data:', error);
            return [];
        }
    }

    compareFlightData(dbFlights, onlineFlights) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📋 DETAILED COMPARISON REPORT');
        console.log('═══════════════════════════════════════════════════════════\n');

        // Create maps for easier comparison
        const dbMap = new Map();
        const onlineMap = new Map();

        dbFlights.forEach(flight => {
            dbMap.set(flight.flight_number, flight);
        });

        onlineFlights.forEach(flight => {
            onlineMap.set(flight.flight_number, flight);
        });

        // Find flights in database but not in online data
        console.log('🗃️  FLIGHTS IN DATABASE BUT NOT IN ONLINE DATA:');
        let dbOnlyCount = 0;
        for (const [flightNum, flight] of dbMap) {
            if (!onlineMap.has(flightNum)) {
                console.log(`   ${flightNum}: ${flight.origin_code}-${flight.destination_code} (${flight.departure_time})`);
                dbOnlyCount++;
            }
        }
        if (dbOnlyCount === 0) console.log('   None\n');
        else console.log(`   Total: ${dbOnlyCount} flights\n`);

        // Find flights in online data but not in database
        console.log('🌐 FLIGHTS IN ONLINE DATA BUT NOT IN DATABASE:');
        let onlineOnlyCount = 0;
        for (const [flightNum, flight] of onlineMap) {
            if (!dbMap.has(flightNum)) {
                console.log(`   ${flightNum}: ${flight.origin_code}-${flight.destination_code} (${flight.departure_time})`);
                onlineOnlyCount++;
            }
        }
        if (onlineOnlyCount === 0) console.log('   None\n');
        else console.log(`   Total: ${onlineOnlyCount} flights\n`);

        // Find flights that exist in both but have differences
        console.log('⚠️  FLIGHTS WITH DIFFERENCES:');
        let diffCount = 0;
        for (const [flightNum, dbFlight] of dbMap) {
            const onlineFlight = onlineMap.get(flightNum);
            if (onlineFlight) {
                const differences = this.findFlightDifferences(dbFlight, onlineFlight);
                if (differences.length > 0) {
                    console.log(`   ${flightNum}:`);
                    differences.forEach(diff => {
                        console.log(`     - ${diff}`);
                    });
                    diffCount++;
                }
            }
        }
        if (diffCount === 0) console.log('   None\n');
        else console.log(`   Total: ${diffCount} flights with differences\n`);

        // Summary
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 SUMMARY:');
        console.log(`   Database flights: ${dbFlights.length}`);
        console.log(`   Online flights: ${onlineFlights.length}`);
        console.log(`   DB-only flights: ${dbOnlyCount}`);
        console.log(`   Online-only flights: ${onlineOnlyCount}`);
        console.log(`   Flights with differences: ${diffCount}`);
        console.log('═══════════════════════════════════════════════════════════');
    }

    findFlightDifferences(dbFlight, onlineFlight) {
        const differences = [];

        // Check route
        const dbRoute = `${dbFlight.origin_code}-${dbFlight.destination_code}`;
        const onlineRoute = `${onlineFlight.origin_code}-${onlineFlight.destination_code}`;
        if (dbRoute !== onlineRoute) {
            differences.push(`Route: DB=${dbRoute}, Online=${onlineRoute}`);
        }

        // Check departure time
        if (dbFlight.departure_time !== onlineFlight.departure_time) {
            differences.push(`Departure: DB=${dbFlight.departure_time}, Online=${onlineFlight.departure_time}`);
        }

        // Check arrival time
        if (dbFlight.arrival_time !== onlineFlight.arrival_time) {
            differences.push(`Arrival: DB=${dbFlight.arrival_time}, Online=${onlineFlight.arrival_time}`);
        }

        // Check aircraft type
        if (dbFlight.aircraft_type !== onlineFlight.aircraft_type) {
            differences.push(`Aircraft: DB=${dbFlight.aircraft_type}, Online=${onlineFlight.aircraft_type}`);
        }

        // Check duration
        if (dbFlight.duration_minutes !== onlineFlight.duration_minutes) {
            differences.push(`Duration: DB=${dbFlight.duration_minutes}min, Online=${onlineFlight.duration_minutes}min`);
        }

        return differences;
    }
}

// Run verification
const verifier = new DatabaseVerifier();
verifier.verifyDatabase().then(() => {
    console.log('\n✅ Verification complete!');
}).catch(error => {
    console.error('❌ Verification failed:', error);
});
