// Database testing and verification script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'security-mo.db');

async function testDatabase() {
    console.log('🧪 Testing Security-MO Database System...\n');
    
    const db = new sqlite3.Database(dbPath);
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            console.log('📊 Testing Airports Database:');
            
            // Test airports count
            db.get("SELECT COUNT(*) as count FROM airports", (err, row) => {
                if (err) {
                    console.error('❌ Error counting airports:', err);
                    reject(err);
                    return;
                }
                console.log(`   ✅ Total airports: ${row.count}`);
            });
            
            // Test airport search by code
            db.all("SELECT * FROM airports WHERE code IN ('MNL', 'LAX', 'LHR', 'NRT', 'SYD') ORDER BY code", (err, airports) => {
                if (err) {
                    console.error('❌ Error searching airports:', err);
                    reject(err);
                    return;
                }
                console.log(`   ✅ Sample airports found: ${airports.length}`);
                airports.forEach(airport => {
                    console.log(`      ${airport.code} - ${airport.name}, ${airport.city}`);
                });
            });
            
            // Test airports by region
            db.all("SELECT country, COUNT(*) as count FROM airports GROUP BY country ORDER BY count DESC LIMIT 10", (err, countries) => {
                if (err) {
                    console.error('❌ Error grouping airports by country:', err);
                    reject(err);
                    return;
                }
                console.log('   ✅ Top countries by airport count:');
                countries.forEach(country => {
                    console.log(`      ${country.country}: ${country.count} airports`);
                });
            });
            
            console.log('\n📊 Testing Flights Database:');
            
            // Test flights count
            db.get("SELECT COUNT(*) as count FROM flights", (err, row) => {
                if (err) {
                    console.error('❌ Error counting flights:', err);
                    reject(err);
                    return;
                }
                console.log(`   ✅ Total flight routes: ${row.count}`);
            });
            
            // Test flights by airline
            db.all("SELECT airline_name, COUNT(*) as routes FROM flights GROUP BY airline_name ORDER BY routes DESC", (err, airlines) => {
                if (err) {
                    console.error('❌ Error grouping flights by airline:', err);
                    reject(err);
                    return;
                }
                console.log('   ✅ Airlines and route counts:');
                airlines.forEach(airline => {
                    console.log(`      ${airline.airline_name}: ${airline.routes} routes`);
                });
            });
            
            // Test route search
            db.all(`
                SELECT f.flight_number, f.airline_name, 
                       orig.name as origin_airport, dest.name as dest_airport,
                       f.departure_time, f.arrival_time, f.duration_minutes
                FROM flights f
                JOIN airports orig ON f.origin_code = orig.code
                JOIN airports dest ON f.destination_code = dest.code
                WHERE f.origin_code = 'MNL'
                ORDER BY f.departure_time
                LIMIT 5
            `, (err, routes) => {
                if (err) {
                    console.error('❌ Error testing route search:', err);
                    reject(err);
                    return;
                }
                console.log(`   ✅ Sample routes from Manila (MNL): ${routes.length}`);
                routes.forEach(route => {
                    console.log(`      ${route.flight_number} - ${route.origin_airport} → ${route.dest_airport}`);
                    console.log(`        Departure: ${route.departure_time}, Duration: ${route.duration_minutes} mins`);
                });
            });
            
            console.log('\n📊 Testing Flight Schedules:');
            
            // Test flight schedules
            db.get("SELECT COUNT(*) as count FROM flight_schedules", (err, row) => {
                if (err) {
                    console.error('❌ Error counting flight schedules:', err);
                    reject(err);
                    return;
                }
                console.log(`   ✅ Total flight schedules: ${row.count}`);
                
                console.log('\n🎉 Database System Test Complete!');
                console.log('✅ All database components are working correctly');
                console.log('✅ Ready for flight search operations');
                
                db.close();
                resolve();
            });
        });
    });
}

// Run the test
testDatabase()
    .then(() => {
        console.log('\n🚀 Database system is ready for use!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Database test failed:', error);
        process.exit(1);
    });
