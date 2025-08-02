const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const url = require('url');

// SerpAPI configuration
const SERPAPI_KEY = '2fccbd120af01f77c5443c23695d0b92170cd9d8d6c1b9551a98bf0edba8cd2f';
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// Database path
const dbPath = path.join(__dirname, 'security-mo.db');

// Helper function to make HTTPS requests
function makeRequest(requestUrl) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(requestUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'GET',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (error) {
                    reject(new Error('Failed to parse JSON response: ' + error.message));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Helper function to delay between requests
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchFlightsForAllAirlines(departureId, arrivalId, outboundDate, label) {
    console.log(`🔍 Searching ${label}: ${departureId} → ${arrivalId} on ${outboundDate}`);
    
    try {
        // Use proper Google Flights API parameters
        const searchParams = new URLSearchParams({
            engine: 'google_flights',
            api_key: SERPAPI_KEY,
            departure_id: departureId,
            arrival_id: arrivalId,
            outbound_date: outboundDate,
            type: '2', // One way
            currency: 'USD',
            hl: 'en',
            gl: 'us',
            adults: '1',
            children: '0',
            infants_in_seat: '0',
            infants_on_lap: '0',
            travel_class: '1', // Economy
            sort_by: '1', // Top flights
            stops: '0', // Any number of stops
            deep_search: 'true', // Get identical results to browser
            no_cache: 'true' // Force fresh data
        });
        
        const requestUrl = `${SERPAPI_BASE_URL}?${searchParams.toString()}`;
        console.log(`📞 API Request: Google Flights API for ${label}`);
        
        const response = await makeRequest(requestUrl);
        
        if (!response) {
            console.log(`❌ No response for ${label}`);
            return [];
        }
        
        console.log(`📊 API Response Status: ${response.search_metadata?.status || 'Unknown'}`);
        
        if (response.error) {
            console.log(`❌ API Error for ${label}: ${response.error}`);
            return [];
        }
        
        // Extract flights from both best_flights and other_flights
        const allFlights = [];
        
        if (response.best_flights) {
            console.log(`✅ Found ${response.best_flights.length} best flights for ${label}`);
            allFlights.push(...response.best_flights);
        }
        
        if (response.other_flights) {
            console.log(`✅ Found ${response.other_flights.length} other flights for ${label}`);
            allFlights.push(...response.other_flights);
        }
        
        if (allFlights.length === 0) {
            console.log(`❌ No flights found for ${label}`);
            return [];
        }
        
        console.log(`📊 Total flights found for ${label}: ${allFlights.length}`);
        
        // Process and extract flight information for ALL airlines
        const processedFlights = [];
        
        allFlights.forEach((flightGroup, index) => {
            console.log(`\n🔍 Processing flight group ${index + 1}:`);
            
            // Each flight group can have multiple segments (with layovers)
            const flights = flightGroup.flights || [];
            
            if (flights.length === 0) {
                console.log(`   ⚠️  No flight segments in group ${index + 1}`);
                return;
            }
            
            // Process each flight segment
            flights.forEach(flight => {
                if (!flight.airline || !flight.flight_number) {
                    return; // Skip if no airline or flight number
                }
                
                console.log(`   ✈️  Flight found:`);
                console.log(`      Flight: ${flight.flight_number}`);
                console.log(`      Airline: ${flight.airline}`);
                console.log(`      Route: ${flight.departure_airport?.id || 'N/A'} → ${flight.arrival_airport?.id || 'N/A'}`);
                console.log(`      Time: ${flight.departure_airport?.time || 'N/A'} → ${flight.arrival_airport?.time || 'N/A'}`);
                console.log(`      Aircraft: ${flight.airplane || 'N/A'}`);
                console.log(`      Duration: ${flight.duration || 'N/A'} minutes`);
                
                // Determine airline code from flight number
                let airlineCode = 'XX'; // Default
                const flightNum = flight.flight_number;
                
                if (flightNum.startsWith('PR')) airlineCode = 'PR';
                else if (flightNum.startsWith('5J') || flightNum.startsWith('Z2')) airlineCode = '5J';
                else if (flightNum.startsWith('PX')) airlineCode = 'PX';
                else if (flightNum.startsWith('CX')) airlineCode = 'CX';
                else if (flightNum.startsWith('NH')) airlineCode = 'NH';
                else if (flightNum.startsWith('JL')) airlineCode = 'JL';
                else if (flightNum.startsWith('QF')) airlineCode = 'QF';
                else if (flightNum.startsWith('SQ')) airlineCode = 'SQ';
                else if (flightNum.startsWith('UA')) airlineCode = 'UA';
                else if (flightNum.startsWith('DL')) airlineCode = 'DL';
                else if (flightNum.startsWith('AA')) airlineCode = 'AA';
                else if (flightNum.startsWith('KE')) airlineCode = 'KE';
                else if (flightNum.startsWith('OZ')) airlineCode = 'OZ';
                else if (flightNum.startsWith('CI')) airlineCode = 'CI';
                else if (flightNum.startsWith('BR')) airlineCode = 'BR';
                else if (flightNum.startsWith('TG')) airlineCode = 'TG';
                else if (flightNum.startsWith('VN')) airlineCode = 'VN';
                else if (flightNum.startsWith('MH')) airlineCode = 'MH';
                else if (flightNum.startsWith('TR')) airlineCode = 'TR';
                else if (flightNum.startsWith('3K')) airlineCode = '3K';
                else if (flightNum.startsWith('JQ')) airlineCode = 'JQ';
                else if (flightNum.startsWith('GK')) airlineCode = 'GK';
                else if (flightNum.startsWith('FD')) airlineCode = 'FD';
                else {
                    // Try to extract from first 2-3 characters
                    const match = flightNum.match(/^([A-Z]{2,3})/);
                    if (match) airlineCode = match[1];
                }
                
                // Extract time components
                const depTime = flight.departure_airport?.time ? 
                    flight.departure_airport.time.split(' ')[1] : null;
                const arrTime = flight.arrival_airport?.time ? 
                    flight.arrival_airport.time.split(' ')[1] : null;
                
                processedFlights.push({
                    flight_number: flight.flight_number,
                    airline_code: airlineCode,
                    airline_name: flight.airline,
                    origin_code: flight.departure_airport?.id || departureId,
                    destination_code: flight.arrival_airport?.id || arrivalId,
                    departure_time: depTime || '08:00',
                    arrival_time: arrTime || '12:00',
                    duration_minutes: flight.duration || 240,
                    aircraft_type: flight.airplane || 'Unknown Aircraft',
                    days_of_week: '1111111', // Assume daily
                    effective_from: '2024-01-01',
                    effective_to: '2025-12-31',
                    status: 'active',
                    source: `Google Flights API - ${label}`,
                    price: flightGroup.price || null,
                    total_duration: flightGroup.total_duration || flight.duration
                });
            });
        });
        
        console.log(`📊 Processed ${processedFlights.length} flights from ${label}`);
        return processedFlights;
        
    } catch (error) {
        console.error(`❌ Error searching ${label}:`, error.message);
        return [];
    }
}

async function updateAllAirlineData() {
    console.log('🚀 Starting comprehensive airline data update using Google Flights API...');
    console.log('This will update ALL airlines, not just Philippine Airlines');
    console.log('===========================================================');
    
    try {
        // Define comprehensive routes across Asia-Pacific region
        const routes = [
            // Papua New Guinea routes
            { departure: 'POM', arrival: 'MNL', date: '2025-08-10', label: 'Port Moresby to Manila' },
            { departure: 'MNL', arrival: 'POM', date: '2025-08-10', label: 'Manila to Port Moresby' },
            { departure: 'POM', arrival: 'SYD', date: '2025-08-10', label: 'Port Moresby to Sydney' },
            { departure: 'SYD', arrival: 'POM', date: '2025-08-10', label: 'Sydney to Port Moresby' },
            { departure: 'POM', arrival: 'BNE', date: '2025-08-10', label: 'Port Moresby to Brisbane' },
            { departure: 'BNE', arrival: 'POM', date: '2025-08-10', label: 'Brisbane to Port Moresby' },
            
            // Philippine domestic routes
            { departure: 'MNL', arrival: 'DVO', date: '2025-08-10', label: 'Manila to Davao' },
            { departure: 'DVO', arrival: 'MNL', date: '2025-08-10', label: 'Davao to Manila' },
            { departure: 'MNL', arrival: 'CEB', date: '2025-08-10', label: 'Manila to Cebu' },
            { departure: 'CEB', arrival: 'MNL', date: '2025-08-10', label: 'Cebu to Manila' },
            { departure: 'MNL', arrival: 'ILO', date: '2025-08-10', label: 'Manila to Iloilo' },
            { departure: 'ILO', arrival: 'MNL', date: '2025-08-10', label: 'Iloilo to Manila' },
            { departure: 'CEB', arrival: 'DVO', date: '2025-08-10', label: 'Cebu to Davao' },
            { departure: 'DVO', arrival: 'CEB', date: '2025-08-10', label: 'Davao to Cebu' },
            
            // International long-haul from Manila
            { departure: 'MNL', arrival: 'LAX', date: '2025-08-10', label: 'Manila to Los Angeles' },
            { departure: 'LAX', arrival: 'MNL', date: '2025-08-10', label: 'Los Angeles to Manila' },
            { departure: 'MNL', arrival: 'SFO', date: '2025-08-10', label: 'Manila to San Francisco' },
            { departure: 'SFO', arrival: 'MNL', date: '2025-08-10', label: 'San Francisco to Manila' },
            { departure: 'MNL', arrival: 'YVR', date: '2025-08-10', label: 'Manila to Vancouver' },
            { departure: 'YVR', arrival: 'MNL', date: '2025-08-10', label: 'Vancouver to Manila' },
            
            // Northeast Asia routes
            { departure: 'MNL', arrival: 'NRT', date: '2025-08-10', label: 'Manila to Tokyo Narita' },
            { departure: 'NRT', arrival: 'MNL', date: '2025-08-10', label: 'Tokyo Narita to Manila' },
            { departure: 'MNL', arrival: 'HND', date: '2025-08-10', label: 'Manila to Tokyo Haneda' },
            { departure: 'HND', arrival: 'MNL', date: '2025-08-10', label: 'Tokyo Haneda to Manila' },
            { departure: 'MNL', arrival: 'ICN', date: '2025-08-10', label: 'Manila to Seoul' },
            { departure: 'ICN', arrival: 'MNL', date: '2025-08-10', label: 'Seoul to Manila' },
            { departure: 'MNL', arrival: 'PVG', date: '2025-08-10', label: 'Manila to Shanghai' },
            { departure: 'PVG', arrival: 'MNL', date: '2025-08-10', label: 'Shanghai to Manila' },
            
            // Southeast Asia routes
            { departure: 'MNL', arrival: 'SIN', date: '2025-08-10', label: 'Manila to Singapore' },
            { departure: 'SIN', arrival: 'MNL', date: '2025-08-10', label: 'Singapore to Manila' },
            { departure: 'MNL', arrival: 'BKK', date: '2025-08-10', label: 'Manila to Bangkok' },
            { departure: 'BKK', arrival: 'MNL', date: '2025-08-10', label: 'Bangkok to Manila' },
            { departure: 'MNL', arrival: 'KUL', date: '2025-08-10', label: 'Manila to Kuala Lumpur' },
            { departure: 'KUL', arrival: 'MNL', date: '2025-08-10', label: 'Kuala Lumpur to Manila' },
            { departure: 'MNL', arrival: 'SGN', date: '2025-08-10', label: 'Manila to Ho Chi Minh City' },
            { departure: 'SGN', arrival: 'MNL', date: '2025-08-10', label: 'Ho Chi Minh City to Manila' },
            { departure: 'MNL', arrival: 'HAN', date: '2025-08-10', label: 'Manila to Hanoi' },
            { departure: 'HAN', arrival: 'MNL', date: '2025-08-10', label: 'Hanoi to Manila' },
            
            // Hong Kong and Greater China
            { departure: 'MNL', arrival: 'HKG', date: '2025-08-10', label: 'Manila to Hong Kong' },
            { departure: 'HKG', arrival: 'MNL', date: '2025-08-10', label: 'Hong Kong to Manila' },
            { departure: 'MNL', arrival: 'TPE', date: '2025-08-10', label: 'Manila to Taipei' },
            { departure: 'TPE', arrival: 'MNL', date: '2025-08-10', label: 'Taipei to Manila' },
            
            // Australia and New Zealand
            { departure: 'MNL', arrival: 'SYD', date: '2025-08-10', label: 'Manila to Sydney' },
            { departure: 'SYD', arrival: 'MNL', date: '2025-08-10', label: 'Sydney to Manila' },
            { departure: 'MNL', arrival: 'MEL', date: '2025-08-10', label: 'Manila to Melbourne' },
            { departure: 'MEL', arrival: 'MNL', date: '2025-08-10', label: 'Melbourne to Manila' },
            { departure: 'MNL', arrival: 'BNE', date: '2025-08-10', label: 'Manila to Brisbane' },
            { departure: 'BNE', arrival: 'MNL', date: '2025-08-10', label: 'Brisbane to Manila' },
            
            // Middle East routes
            { departure: 'MNL', arrival: 'DXB', date: '2025-08-10', label: 'Manila to Dubai' },
            { departure: 'DXB', arrival: 'MNL', date: '2025-08-10', label: 'Dubai to Manila' },
            { departure: 'MNL', arrival: 'DOH', date: '2025-08-10', label: 'Manila to Doha' },
            { departure: 'DOH', arrival: 'MNL', date: '2025-08-10', label: 'Doha to Manila' }
        ];
        
        let allFlights = [];
        
        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            
            // Add delay to respect rate limits
            if (i > 0) {
                console.log('⏳ Waiting 3 seconds to respect rate limits...');
                await delay(3000);
            }
            
            const flights = await searchFlightsForAllAirlines(
                route.departure,
                route.arrival,
                route.date,
                route.label
            );
            
            allFlights = allFlights.concat(flights);
            
            // Progress indicator
            console.log(`📊 Progress: ${i + 1}/${routes.length} routes searched, ${allFlights.length} total flights collected so far`);
        }
        
        console.log(`\n📊 Total flights collected: ${allFlights.length}`);
        
        if (allFlights.length === 0) {
            console.log('❌ No flights found in search results');
            return;
        }
        
        // Remove duplicates based on flight number and route
        const uniqueFlights = [];
        const seenFlights = new Set();
        
        allFlights.forEach(flight => {
            const key = `${flight.flight_number}-${flight.origin_code}-${flight.destination_code}`;
            if (!seenFlights.has(key)) {
                seenFlights.add(key);
                uniqueFlights.push(flight);
            }
        });
        
        console.log(`📊 Unique flights after deduplication: ${uniqueFlights.length}`);
        
        // Analyze airlines found
        const airlineCounts = {};
        uniqueFlights.forEach(flight => {
            const airline = flight.airline_code;
            airlineCounts[airline] = (airlineCounts[airline] || 0) + 1;
        });
        
        console.log('\n📊 Airlines found:');
        Object.entries(airlineCounts).sort((a, b) => b[1] - a[1]).forEach(([airline, count]) => {
            console.log(`   ${airline}: ${count} flights`);
        });
        
        // Clear existing flight data and insert new data
        console.log('\n🗑️  Clearing existing flight data...');
        const db = new sqlite3.Database(dbPath);
        
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM flights", function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Deleted ${this.changes} existing flights`);
                    resolve();
                }
            });
        });
        
        // Insert new flights
        console.log(`\n💾 Inserting ${uniqueFlights.length} new flights...`);
        
        const insertQuery = `
            INSERT OR REPLACE INTO flights (
                flight_number, airline_code, airline_name, origin_code, destination_code,
                departure_time, arrival_time, duration_minutes, aircraft_type, days_of_week,
                effective_from, effective_to, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        const stmt = db.prepare(insertQuery);
        let insertedCount = 0;
        let errors = 0;
        
        for (const flight of uniqueFlights) {
            try {
                await new Promise((resolve, reject) => {
                    stmt.run([
                        flight.flight_number,
                        flight.airline_code,
                        flight.airline_name,
                        flight.origin_code,
                        flight.destination_code,
                        flight.departure_time,
                        flight.arrival_time,
                        flight.duration_minutes,
                        flight.aircraft_type,
                        flight.days_of_week,
                        flight.effective_from,
                        flight.effective_to,
                        flight.status
                    ], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            insertedCount++;
                            if (insertedCount % 10 === 0) {
                                console.log(`✅ Inserted ${insertedCount} flights...`);
                            }
                            resolve();
                        }
                    });
                });
            } catch (error) {
                console.error(`❌ Error inserting ${flight.flight_number}:`, error.message);
                errors++;
            }
        }
        
        stmt.finalize();
        
        console.log(`\n🎉 Insertion complete: ${insertedCount} successful, ${errors} errors`);
        
        // Verify the results
        console.log('\n🔍 Verifying results...');
        
        await new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM flights", (err, row) => {
                if (err) {
                    console.error('❌ Error verifying results:', err.message);
                } else {
                    console.log(`✅ Total flights in database: ${row.count}`);
                }
                
                // Check airline distribution
                db.all(`SELECT airline_code, airline_name, COUNT(*) as flight_count 
                        FROM flights 
                        GROUP BY airline_code, airline_name 
                        ORDER BY flight_count DESC`, (err2, rows2) => {
                    if (err2) {
                        console.error('❌ Error checking airline distribution:', err2.message);
                    } else {
                        console.log(`\n📊 Airline Distribution:`);
                        rows2.forEach(airline => {
                            console.log(`   ${airline.airline_code} (${airline.airline_name}): ${airline.flight_count} flights`);
                        });
                    }
                    
                    // Check specific routes
                    db.get("SELECT COUNT(*) as count FROM flights WHERE origin_code = 'POM' AND destination_code = 'MNL'", (err3, row3) => {
                        if (err3) {
                            console.error('❌ Error checking POM-MNL routes:', err3.message);
                        } else {
                            console.log(`\n✅ POM → MNL flights: ${row3.count}`);
                        }
                        
                        db.close();
                        resolve();
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('💥 Fatal error during update:', error.message);
    }
}

// Run the comprehensive update
console.log('🚀 Starting comprehensive airline data update using Google Flights API...');
console.log('This will search 48+ routes across Asia-Pacific region for ALL airlines');
console.log('Expected to find: Philippine Airlines, Cebu Pacific, Air Niugini, Qantas,');
console.log('Singapore Airlines, Cathay Pacific, ANA, JAL, Korean Air, and many more!');
console.log('=====================================================================\n');

updateAllAirlineData().then(() => {
    console.log('\n🎉 Comprehensive airline data update complete!');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});
