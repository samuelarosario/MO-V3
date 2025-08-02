const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const url = require('url');

// SerpAPI configuration
const SERPAPI_KEY = '2fccbd120af01f77c5443c23695d0b92170cd9d8d6c1b9551a98bf0edba8cd2f';
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// Database path
const dbPath = path.join(__dirname, 'security-mo.db');

// Target airlines to search for
const TARGET_AIRLINES = {
    // Major U.S. Airlines
    'AA': 'American Airlines',
    'DL': 'Delta Air Lines',
    'UA': 'United Airlines',
    'WN': 'Southwest Airlines',
    'B6': 'JetBlue',
    'AS': 'Alaska Airlines',
    'NK': 'Spirit Airlines',
    'F9': 'Frontier Airlines',
    'G4': 'Allegiant Air',
    'HA': 'Hawaiian Airlines',
    'SY': 'Sun Country Airlines',
    'KS': 'PenAir',
    'OH': 'PSA Airlines',
    '9E': 'Endeavor Air',
    'YX': 'Republic Airways',
    'MQ': 'Envoy Air',
    'VX': 'Virgin America',
    
    // Major International Airlines
    'BA': 'British Airways',
    'AF': 'Air France',
    'LH': 'Lufthansa',
    'KL': 'KLM Royal Dutch Airlines',
    'CX': 'Cathay Pacific',
    'QR': 'Qatar Airways',
    'EK': 'Emirates',
    'SQ': 'Singapore Airlines',
    'JL': 'Japan Airlines',
    'NH': 'All Nippon Airways',
    'AC': 'Air Canada',
    'TP': 'TAP Air Portugal',
    'IB': 'Iberia',
    'AY': 'Finnair',
    'OS': 'Austrian Airlines',
    'SN': 'Brussels Airlines',
    'LX': 'Swiss International',
    'TK': 'Turkish Airlines',
    'SU': 'Aeroflot',
    'CZ': 'China Southern',
    'CA': 'Air China',
    'MU': 'China Eastern',
    'KE': 'Korean Air',
    'TG': 'Thai Airways',
    'MH': 'Malaysia Airlines',
    'QF': 'Qantas',
    'VA': 'Virgin Australia',
    'NZ': 'Air New Zealand',
    'LA': 'LATAM',
    'AV': 'Avianca',
    'ET': 'Ethiopian Airlines',
    'KQ': 'Kenya Airways',
    'SA': 'South African Airways'
};

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

// Helper function to determine airline code from flight number
function getAirlineCode(flightNumber) {
    if (!flightNumber) return 'XX';
    
    // Extract airline code from flight number
    const match = flightNumber.match(/^([A-Z0-9]{2,3})/);
    if (match) {
        const code = match[1];
        // Check if it's one of our target airlines
        if (TARGET_AIRLINES[code]) {
            return code;
        }
    }
    
    // Try alternative patterns
    if (flightNumber.startsWith('UA')) return 'UA';
    if (flightNumber.startsWith('AA')) return 'AA';
    if (flightNumber.startsWith('DL')) return 'DL';
    if (flightNumber.startsWith('WN')) return 'WN';
    if (flightNumber.startsWith('B6')) return 'B6';
    if (flightNumber.startsWith('AS')) return 'AS';
    if (flightNumber.startsWith('NK')) return 'NK';
    if (flightNumber.startsWith('F9')) return 'F9';
    if (flightNumber.startsWith('G4')) return 'G4';
    if (flightNumber.startsWith('HA')) return 'HA';
    if (flightNumber.startsWith('BA')) return 'BA';
    if (flightNumber.startsWith('AF')) return 'AF';
    if (flightNumber.startsWith('LH')) return 'LH';
    if (flightNumber.startsWith('KL')) return 'KL';
    if (flightNumber.startsWith('CX')) return 'CX';
    if (flightNumber.startsWith('QR')) return 'QR';
    if (flightNumber.startsWith('EK')) return 'EK';
    if (flightNumber.startsWith('SQ')) return 'SQ';
    if (flightNumber.startsWith('JL')) return 'JL';
    if (flightNumber.startsWith('NH')) return 'NH';
    if (flightNumber.startsWith('AC')) return 'AC';
    if (flightNumber.startsWith('TP')) return 'TP';
    if (flightNumber.startsWith('IB')) return 'IB';
    if (flightNumber.startsWith('AY')) return 'AY';
    if (flightNumber.startsWith('OS')) return 'OS';
    if (flightNumber.startsWith('SN')) return 'SN';
    if (flightNumber.startsWith('LX')) return 'LX';
    if (flightNumber.startsWith('TK')) return 'TK';
    if (flightNumber.startsWith('SU')) return 'SU';
    if (flightNumber.startsWith('CZ')) return 'CZ';
    if (flightNumber.startsWith('CA')) return 'CA';
    if (flightNumber.startsWith('MU')) return 'MU';
    if (flightNumber.startsWith('KE')) return 'KE';
    if (flightNumber.startsWith('TG')) return 'TG';
    if (flightNumber.startsWith('MH')) return 'MH';
    if (flightNumber.startsWith('QF')) return 'QF';
    if (flightNumber.startsWith('VA')) return 'VA';
    if (flightNumber.startsWith('NZ')) return 'NZ';
    if (flightNumber.startsWith('LA')) return 'LA';
    if (flightNumber.startsWith('AV')) return 'AV';
    if (flightNumber.startsWith('ET')) return 'ET';
    if (flightNumber.startsWith('KQ')) return 'KQ';
    if (flightNumber.startsWith('SA')) return 'SA';
    
    return 'XX'; // Unknown
}

async function searchMajorAirlineRoutes(departureId, arrivalId, outboundDate, label) {
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
        
        // Process and extract flight information for TARGET airlines only
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
                
                const airlineCode = getAirlineCode(flight.flight_number);
                
                // Only process flights from our target airlines
                if (TARGET_AIRLINES[airlineCode]) {
                    console.log(`   ✈️  Target airline flight found:`);
                    console.log(`      Flight: ${flight.flight_number}`);
                    console.log(`      Airline: ${flight.airline} (${airlineCode})`);
                    console.log(`      Route: ${flight.departure_airport?.id || 'N/A'} → ${flight.arrival_airport?.id || 'N/A'}`);
                    console.log(`      Time: ${flight.departure_airport?.time || 'N/A'} → ${flight.arrival_airport?.time || 'N/A'}`);
                    console.log(`      Aircraft: ${flight.airplane || 'N/A'}`);
                    console.log(`      Duration: ${flight.duration || 'N/A'} minutes`);
                    
                    // Extract time components
                    const depTime = flight.departure_airport?.time ? 
                        flight.departure_airport.time.split(' ')[1] : null;
                    const arrTime = flight.arrival_airport?.time ? 
                        flight.arrival_airport.time.split(' ')[1] : null;
                    
                    processedFlights.push({
                        flight_number: flight.flight_number,
                        airline_code: airlineCode,
                        airline_name: TARGET_AIRLINES[airlineCode] || flight.airline,
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
                } else {
                    console.log(`   ℹ️  Non-target airline: ${flight.airline} (${flight.flight_number})`);
                }
            });
        });
        
        console.log(`📊 Processed ${processedFlights.length} target airline flights from ${label}`);
        return processedFlights;
        
    } catch (error) {
        console.error(`❌ Error searching ${label}:`, error.message);
        return [];
    }
}

async function updateMajorAirlinesData() {
    console.log('🚀 Starting major airlines data update using Google Flights API...');
    console.log('==============================================================');
    console.log('Target Airlines:');
    Object.entries(TARGET_AIRLINES).forEach(([code, name]) => {
        console.log(`   ${code} - ${name}`);
    });
    console.log('==============================================================\n');
    
    try {
        // Define major international routes focused on hub airports
        const routes = [
            // Major U.S. Hub Routes
            { departure: 'LAX', arrival: 'JFK', date: '2025-08-10', label: 'Los Angeles to New York JFK' },
            { departure: 'JFK', arrival: 'LAX', date: '2025-08-10', label: 'New York JFK to Los Angeles' },
            { departure: 'ORD', arrival: 'LAX', date: '2025-08-10', label: 'Chicago to Los Angeles' },
            { departure: 'LAX', arrival: 'ORD', date: '2025-08-10', label: 'Los Angeles to Chicago' },
            { departure: 'ATL', arrival: 'LAX', date: '2025-08-10', label: 'Atlanta to Los Angeles' },
            { departure: 'LAX', arrival: 'ATL', date: '2025-08-10', label: 'Los Angeles to Atlanta' },
            { departure: 'DFW', arrival: 'JFK', date: '2025-08-10', label: 'Dallas to New York JFK' },
            { departure: 'JFK', arrival: 'DFW', date: '2025-08-10', label: 'New York JFK to Dallas' },
            { departure: 'SFO', arrival: 'JFK', date: '2025-08-10', label: 'San Francisco to New York JFK' },
            { departure: 'JFK', arrival: 'SFO', date: '2025-08-10', label: 'New York JFK to San Francisco' },
            { departure: 'MIA', arrival: 'LAX', date: '2025-08-10', label: 'Miami to Los Angeles' },
            { departure: 'LAX', arrival: 'MIA', date: '2025-08-10', label: 'Los Angeles to Miami' },
            { departure: 'SEA', arrival: 'JFK', date: '2025-08-10', label: 'Seattle to New York JFK' },
            { departure: 'JFK', arrival: 'SEA', date: '2025-08-10', label: 'New York JFK to Seattle' },
            { departure: 'BOS', arrival: 'LAX', date: '2025-08-10', label: 'Boston to Los Angeles' },
            { departure: 'LAX', arrival: 'BOS', date: '2025-08-10', label: 'Los Angeles to Boston' },
            { departure: 'DEN', arrival: 'JFK', date: '2025-08-10', label: 'Denver to New York JFK' },
            { departure: 'JFK', arrival: 'DEN', date: '2025-08-10', label: 'New York JFK to Denver' },
            
            // Trans-Atlantic Routes
            { departure: 'JFK', arrival: 'LHR', date: '2025-08-10', label: 'New York JFK to London Heathrow' },
            { departure: 'LHR', arrival: 'JFK', date: '2025-08-10', label: 'London Heathrow to New York JFK' },
            { departure: 'LAX', arrival: 'LHR', date: '2025-08-10', label: 'Los Angeles to London Heathrow' },
            { departure: 'LHR', arrival: 'LAX', date: '2025-08-10', label: 'London Heathrow to Los Angeles' },
            { departure: 'JFK', arrival: 'CDG', date: '2025-08-10', label: 'New York JFK to Paris CDG' },
            { departure: 'CDG', arrival: 'JFK', date: '2025-08-10', label: 'Paris CDG to New York JFK' },
            { departure: 'JFK', arrival: 'FRA', date: '2025-08-10', label: 'New York JFK to Frankfurt' },
            { departure: 'FRA', arrival: 'JFK', date: '2025-08-10', label: 'Frankfurt to New York JFK' },
            { departure: 'JFK', arrival: 'AMS', date: '2025-08-10', label: 'New York JFK to Amsterdam' },
            { departure: 'AMS', arrival: 'JFK', date: '2025-08-10', label: 'Amsterdam to New York JFK' },
            
            // Trans-Pacific Routes
            { departure: 'LAX', arrival: 'NRT', date: '2025-08-10', label: 'Los Angeles to Tokyo Narita' },
            { departure: 'NRT', arrival: 'LAX', date: '2025-08-10', label: 'Tokyo Narita to Los Angeles' },
            { departure: 'SFO', arrival: 'NRT', date: '2025-08-10', label: 'San Francisco to Tokyo Narita' },
            { departure: 'NRT', arrival: 'SFO', date: '2025-08-10', label: 'Tokyo Narita to San Francisco' },
            { departure: 'LAX', arrival: 'ICN', date: '2025-08-10', label: 'Los Angeles to Seoul' },
            { departure: 'ICN', arrival: 'LAX', date: '2025-08-10', label: 'Seoul to Los Angeles' },
            { departure: 'LAX', arrival: 'SYD', date: '2025-08-10', label: 'Los Angeles to Sydney' },
            { departure: 'SYD', arrival: 'LAX', date: '2025-08-10', label: 'Sydney to Los Angeles' },
            { departure: 'SFO', arrival: 'SYD', date: '2025-08-10', label: 'San Francisco to Sydney' },
            { departure: 'SYD', arrival: 'SFO', date: '2025-08-10', label: 'Sydney to San Francisco' },
            
            // European Hub Routes
            { departure: 'LHR', arrival: 'CDG', date: '2025-08-10', label: 'London to Paris' },
            { departure: 'CDG', arrival: 'LHR', date: '2025-08-10', label: 'Paris to London' },
            { departure: 'LHR', arrival: 'FRA', date: '2025-08-10', label: 'London to Frankfurt' },
            { departure: 'FRA', arrival: 'LHR', date: '2025-08-10', label: 'Frankfurt to London' },
            { departure: 'FRA', arrival: 'CDG', date: '2025-08-10', label: 'Frankfurt to Paris' },
            { departure: 'CDG', arrival: 'FRA', date: '2025-08-10', label: 'Paris to Frankfurt' },
            { departure: 'AMS', arrival: 'LHR', date: '2025-08-10', label: 'Amsterdam to London' },
            { departure: 'LHR', arrival: 'AMS', date: '2025-08-10', label: 'London to Amsterdam' },
            
            // Asian Hub Routes
            { departure: 'NRT', arrival: 'ICN', date: '2025-08-10', label: 'Tokyo to Seoul' },
            { departure: 'ICN', arrival: 'NRT', date: '2025-08-10', label: 'Seoul to Tokyo' },
            { departure: 'NRT', arrival: 'SIN', date: '2025-08-10', label: 'Tokyo to Singapore' },
            { departure: 'SIN', arrival: 'NRT', date: '2025-08-10', label: 'Singapore to Tokyo' },
            { departure: 'ICN', arrival: 'SIN', date: '2025-08-10', label: 'Seoul to Singapore' },
            { departure: 'SIN', arrival: 'ICN', date: '2025-08-10', label: 'Singapore to Seoul' },
            { departure: 'HKG', arrival: 'NRT', date: '2025-08-10', label: 'Hong Kong to Tokyo' },
            { departure: 'NRT', arrival: 'HKG', date: '2025-08-10', label: 'Tokyo to Hong Kong' },
            
            // Middle East Hub Routes
            { departure: 'DXB', arrival: 'LHR', date: '2025-08-10', label: 'Dubai to London' },
            { departure: 'LHR', arrival: 'DXB', date: '2025-08-10', label: 'London to Dubai' },
            { departure: 'DOH', arrival: 'LHR', date: '2025-08-10', label: 'Doha to London' },
            { departure: 'LHR', arrival: 'DOH', date: '2025-08-10', label: 'London to Doha' },
            { departure: 'DXB', arrival: 'JFK', date: '2025-08-10', label: 'Dubai to New York' },
            { departure: 'JFK', arrival: 'DXB', date: '2025-08-10', label: 'New York to Dubai' },
            
            // Additional Major Routes
            { departure: 'YYZ', arrival: 'JFK', date: '2025-08-10', label: 'Toronto to New York' },
            { departure: 'JFK', arrival: 'YYZ', date: '2025-08-10', label: 'New York to Toronto' },
            { departure: 'YVR', arrival: 'LAX', date: '2025-08-10', label: 'Vancouver to Los Angeles' },
            { departure: 'LAX', arrival: 'YVR', date: '2025-08-10', label: 'Los Angeles to Vancouver' },
            { departure: 'MEX', arrival: 'LAX', date: '2025-08-10', label: 'Mexico City to Los Angeles' },
            { departure: 'LAX', arrival: 'MEX', date: '2025-08-10', label: 'Los Angeles to Mexico City' }
        ];
        
        let allFlights = [];
        
        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            
            // Add delay to respect rate limits
            if (i > 0) {
                console.log('⏳ Waiting 3 seconds to respect rate limits...');
                await delay(3000);
            }
            
            const flights = await searchMajorAirlineRoutes(
                route.departure,
                route.arrival,
                route.date,
                route.label
            );
            
            allFlights = allFlights.concat(flights);
            
            // Progress indicator
            console.log(`📊 Progress: ${i + 1}/${routes.length} routes searched, ${allFlights.length} total target airline flights collected so far`);
        }
        
        console.log(`\n📊 Total target airline flights collected: ${allFlights.length}`);
        
        if (allFlights.length === 0) {
            console.log('❌ No target airline flights found in search results');
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
        
        console.log(`📊 Unique target airline flights after deduplication: ${uniqueFlights.length}`);
        
        // Analyze target airlines found
        const airlineCounts = {};
        uniqueFlights.forEach(flight => {
            const airline = flight.airline_code;
            airlineCounts[airline] = (airlineCounts[airline] || 0) + 1;
        });
        
        console.log('\n📊 Target airlines found:');
        Object.entries(airlineCounts).sort((a, b) => b[1] - a[1]).forEach(([airline, count]) => {
            console.log(`   ${airline} (${TARGET_AIRLINES[airline]}): ${count} flights`);
        });
        
        // Add new flights to existing database (don't clear)
        console.log('\n💾 Adding new target airline flights to database...');
        const db = new sqlite3.Database(dbPath);
        
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
                
                // Check target airline distribution
                const targetAirlineCodes = Object.keys(TARGET_AIRLINES).map(code => `'${code}'`).join(',');
                db.all(`SELECT airline_code, airline_name, COUNT(*) as flight_count 
                        FROM flights 
                        WHERE airline_code IN (${targetAirlineCodes})
                        GROUP BY airline_code, airline_name 
                        ORDER BY flight_count DESC`, (err2, rows2) => {
                    if (err2) {
                        console.error('❌ Error checking target airline distribution:', err2.message);
                    } else {
                        console.log(`\n📊 Target Airlines in Database:`);
                        rows2.forEach(airline => {
                            console.log(`   ${airline.airline_code} (${airline.airline_name}): ${airline.flight_count} flights`);
                        });
                    }
                    
                    db.close();
                    resolve();
                });
            });
        });
        
    } catch (error) {
        console.error('💥 Fatal error during update:', error.message);
    }
}

// Run the major airlines update
console.log('🚀 Starting major airlines data update using Google Flights API...');
console.log('This will search for flights from major U.S. and international airlines');
console.log('Expected to find: American, Delta, United, British Airways, Lufthansa,');
console.log('Emirates, Singapore Airlines, Cathay Pacific, and many more!');
console.log('====================================================================\n');

updateMajorAirlinesData().then(() => {
    console.log('\n🎉 Major airlines data update complete!');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});
