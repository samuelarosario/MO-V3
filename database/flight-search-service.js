const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'security-mo.db');

class FlightSearchService {
    constructor() {
        this.db = new sqlite3.Database(dbPath);
    }

    // Search for direct flights
    searchDirectFlights(origin, destination, date = null) {
        return new Promise((resolve, reject) => {
            console.log(`🔍 Searching direct flights: ${origin} → ${destination}`);
            
            const query = `
                SELECT 
                    f.flight_number,
                    f.airline_code,
                    f.airline_name,
                    f.origin_code,
                    f.destination_code,
                    f.departure_time,
                    f.arrival_time,
                    f.duration_minutes,
                    f.aircraft_type,
                    f.days_of_week,
                    o.name as origin_name,
                    o.city as origin_city,
                    d.name as destination_name,
                    d.city as destination_city
                FROM flights f
                JOIN airports o ON f.origin_code = o.code
                JOIN airports d ON f.destination_code = d.code
                WHERE 
                    f.origin_code = ? 
                    AND f.destination_code = ?
                    AND f.status = 'active'
                ORDER BY f.departure_time
            `;
            
            this.db.all(query, [origin, destination], (err, rows) => {
                if (err) {
                    console.error('❌ Database error:', err);
                    reject(err);
                } else {
                    console.log(`✅ Found ${rows.length} direct flights`);
                    resolve(rows);
                }
            });
        });
    }

    // Search for connecting flights (1 stop)
    searchConnectingFlights(origin, destination, maxConnections = 1) {
        return new Promise((resolve, reject) => {
            console.log(`🔄 Searching connecting flights: ${origin} → ${destination} (max ${maxConnections} stops)`);
            
            const query = `
                WITH connections AS (
                    SELECT 
                        f1.flight_number as first_flight,
                        f1.airline_name as first_airline,
                        f1.origin_code,
                        f1.destination_code as connection_code,
                        f1.departure_time as first_departure,
                        f1.arrival_time as first_arrival,
                        f1.duration_minutes as first_duration,
                        f1.aircraft_type as first_aircraft,
                        
                        f2.flight_number as second_flight,
                        f2.airline_name as second_airline,
                        f2.destination_code,
                        f2.departure_time as second_departure,
                        f2.arrival_time as second_arrival,
                        f2.duration_minutes as second_duration,
                        f2.aircraft_type as second_aircraft,
                        
                        (julianday('1970-01-01 ' || f2.departure_time) - julianday('1970-01-01 ' || f1.arrival_time)) * 24 * 60 as layover_minutes,
                        (f1.duration_minutes + f2.duration_minutes) as total_flight_minutes,
                        
                        o.name as origin_name,
                        o.city as origin_city,
                        c.name as connection_name,
                        c.city as connection_city,
                        d.name as destination_name,
                        d.city as destination_city
                        
                    FROM flights f1
                    JOIN flights f2 ON f1.destination_code = f2.origin_code
                    JOIN airports o ON f1.origin_code = o.code
                    JOIN airports c ON f1.destination_code = c.code
                    JOIN airports d ON f2.destination_code = d.code
                    WHERE 
                        f1.origin_code = ? 
                        AND f2.destination_code = ?
                        AND f1.status = 'active'
                        AND f2.status = 'active'
                        AND f1.destination_code != f2.destination_code
                )
                SELECT * FROM connections
                WHERE layover_minutes >= 120 AND layover_minutes <= 1440
                ORDER BY total_flight_minutes, layover_minutes
                LIMIT 10
            `;
            
            this.db.all(query, [origin, destination], (err, rows) => {
                if (err) {
                    console.error('❌ Database error:', err);
                    reject(err);
                } else {
                    console.log(`✅ Found ${rows.length} connecting flights`);
                    resolve(rows);
                }
            });
        });
    }

    // Search for 2-stop connecting flights
    searchTwoStopFlights(origin, destination) {
        return new Promise((resolve, reject) => {
            console.log(`🔄🔄 Searching 2-stop flights: ${origin} → ${destination}`);
            
            const query = `
                WITH two_stop_connections AS (
                    SELECT 
                        f1.flight_number as first_flight,
                        f1.airline_name as first_airline,
                        f1.origin_code,
                        f1.destination_code as first_connection_code,
                        f1.departure_time as first_departure,
                        f1.arrival_time as first_arrival,
                        f1.duration_minutes as first_duration,
                        f1.aircraft_type as first_aircraft,
                        
                        f2.flight_number as second_flight,
                        f2.airline_name as second_airline,
                        f2.destination_code as second_connection_code,
                        f2.departure_time as second_departure,
                        f2.arrival_time as second_arrival,
                        f2.duration_minutes as second_duration,
                        f2.aircraft_type as second_aircraft,
                        
                        f3.flight_number as third_flight,
                        f3.airline_name as third_airline,
                        f3.destination_code,
                        f3.departure_time as third_departure,
                        f3.arrival_time as third_arrival,
                        f3.duration_minutes as third_duration,
                        f3.aircraft_type as third_aircraft,
                        
                        -- Calculate layover times with proper handling for overnight flights
                        CASE 
                            WHEN julianday('1970-01-01 ' || f2.departure_time) >= julianday('1970-01-01 ' || f1.arrival_time)
                            THEN (julianday('1970-01-01 ' || f2.departure_time) - julianday('1970-01-01 ' || f1.arrival_time)) * 24 * 60
                            ELSE (julianday('1970-01-02 ' || f2.departure_time) - julianday('1970-01-01 ' || f1.arrival_time)) * 24 * 60
                        END as first_layover_minutes,
                        
                        CASE 
                            WHEN julianday('1970-01-01 ' || f3.departure_time) >= julianday('1970-01-01 ' || f2.arrival_time)
                            THEN (julianday('1970-01-01 ' || f3.departure_time) - julianday('1970-01-01 ' || f2.arrival_time)) * 24 * 60
                            ELSE (julianday('1970-01-02 ' || f3.departure_time) - julianday('1970-01-01 ' || f2.arrival_time)) * 24 * 60
                        END as second_layover_minutes,
                        
                        (f1.duration_minutes + f2.duration_minutes + f3.duration_minutes) as total_flight_minutes,
                        
                        o.name as origin_name,
                        o.city as origin_city,
                        c1.name as first_connection_name,
                        c1.city as first_connection_city,
                        c2.name as second_connection_name,
                        c2.city as second_connection_city,
                        d.name as destination_name,
                        d.city as destination_city
                        
                    FROM flights f1
                    JOIN flights f2 ON f1.destination_code = f2.origin_code
                    JOIN flights f3 ON f2.destination_code = f3.origin_code
                    JOIN airports o ON f1.origin_code = o.code
                    JOIN airports c1 ON f1.destination_code = c1.code
                    JOIN airports c2 ON f2.destination_code = c2.code
                    JOIN airports d ON f3.destination_code = d.code
                    WHERE 
                        f1.origin_code = ? 
                        AND f3.destination_code = ?
                        AND f1.status = 'active'
                        AND f2.status = 'active'
                        AND f3.status = 'active'
                        AND f1.origin_code != f2.origin_code
                        AND f2.origin_code != f3.destination_code
                        AND f1.origin_code != f3.destination_code
                )
                SELECT * FROM two_stop_connections
                WHERE first_layover_minutes >= 120 AND first_layover_minutes <= 1440
                  AND second_layover_minutes >= 120 AND second_layover_minutes <= 1440
                ORDER BY (total_flight_minutes + first_layover_minutes + second_layover_minutes), first_layover_minutes
                LIMIT 5
            `;
            
            this.db.all(query, [origin, destination], (err, rows) => {
                if (err) {
                    console.error('❌ Database error:', err);
                    reject(err);
                } else {
                    console.log(`✅ Found ${rows.length} 2-stop flights`);
                    resolve(rows);
                }
            });
        });
    }

    // Get all flights from an airport
    getFlightsFromAirport(airportCode) {
        return new Promise((resolve, reject) => {
            console.log(`🛫 Getting flights from: ${airportCode}`);
            
            const query = `
                SELECT 
                    f.flight_number,
                    f.airline_name,
                    f.destination_code,
                    d.name as destination_name,
                    d.city as destination_city,
                    d.country,
                    f.departure_time,
                    f.arrival_time,
                    f.duration_minutes,
                    f.aircraft_type,
                    f.days_of_week
                FROM flights f
                JOIN airports d ON f.destination_code = d.code
                WHERE 
                    f.origin_code = ?
                    AND f.status = 'active'
                ORDER BY f.departure_time
            `;
            
            this.db.all(query, [airportCode], (err, rows) => {
                if (err) {
                    console.error('❌ Database error:', err);
                    reject(err);
                } else {
                    console.log(`✅ Found ${rows.length} outbound flights`);
                    resolve(rows);
                }
            });
        });
    }

    // Get comprehensive flight search results
    async searchFlights(origin, destination, searchDate = null, includeConnections = true) {
        try {
            console.log(`\n🔍 COMPREHENSIVE FLIGHT SEARCH`);
            console.log(`📍 Route: ${origin} → ${destination}`);
            console.log(`📅 Date: ${searchDate || 'Any date'}`);
            console.log(`🔄 Include connections: ${includeConnections}`);
            
            const results = {
                route: `${origin} → ${destination}`,
                searchDate: searchDate,
                directFlights: [],
                connectingFlights: [],
                twoStopFlights: [],
                totalOptions: 0,
                searchTime: new Date().toISOString()
            };

            // Search direct flights
            const directFlights = await this.searchDirectFlights(origin, destination, searchDate);
            results.directFlights = directFlights;

            // Search connecting flights if requested
            if (includeConnections) {
                const connectingFlights = await this.searchConnectingFlights(origin, destination);
                results.connectingFlights = connectingFlights;
                
                // Debug logging for 2-stop search decision
                console.log(`📊 Flight count check: Direct=${directFlights.length}, 1-stop=${connectingFlights.length}`);
                
                // If no direct or 1-stop flights found, try 2-stop flights
                if (directFlights.length === 0 && connectingFlights.length === 0) {
                    console.log(`🔄 No direct or 1-stop flights found, searching 2-stop connections...`);
                    const twoStopFlights = await this.searchTwoStopFlights(origin, destination);
                    results.twoStopFlights = twoStopFlights;
                    console.log(`🔄🔄 2-stop search completed: found ${twoStopFlights.length} options`);
                } else {
                    console.log(`⏭️  Skipping 2-stop search: found ${directFlights.length + connectingFlights.length} flights`);
                }
            }

            results.totalOptions = results.directFlights.length + results.connectingFlights.length + results.twoStopFlights.length;
            
            console.log(`\n📊 SEARCH SUMMARY:`);
            console.log(`✈️  Direct flights: ${results.directFlights.length}`);
            console.log(`🔄 Connecting flights (1-stop): ${results.connectingFlights.length}`);
            console.log(`🔄🔄 Two-stop flights: ${results.twoStopFlights.length}`);
            console.log(`📈 Total options: ${results.totalOptions}`);
            
            return results;
            
        } catch (error) {
            console.error('❌ Flight search error:', error);
            throw error;
        }
    }

    // Format flight results for display
    formatFlightResults(searchResults) {
        const formatted = {
            success: true,
            route: searchResults.route,
            totalFlights: searchResults.totalOptions,
            flights: []
        };

        // Format direct flights
        searchResults.directFlights.forEach(flight => {
            formatted.flights.push({
                type: 'direct',
                flightNumber: flight.flight_number,
                airline: flight.airline_name,
                origin: {
                    code: flight.origin_code,
                    name: flight.origin_name,
                    city: flight.origin_city
                },
                destination: {
                    code: flight.destination_code,
                    name: flight.destination_name,
                    city: flight.destination_city
                },
                departure: flight.departure_time,
                arrival: flight.arrival_time,
                duration: flight.duration_minutes,
                aircraft: flight.aircraft_type,
                daysOfWeek: flight.days_of_week
            });
        });

        // Format connecting flights
        searchResults.connectingFlights.forEach(connection => {
            formatted.flights.push({
                type: 'connecting',
                legs: [
                    {
                        flightNumber: connection.first_flight,
                        airline: connection.first_airline,
                        origin: {
                            code: connection.origin_code,
                            name: connection.origin_name,
                            city: connection.origin_city
                        },
                        destination: {
                            code: connection.connection_code,
                            name: connection.connection_name,
                            city: connection.connection_city
                        },
                        departure: connection.first_departure,
                        arrival: connection.first_arrival,
                        duration: connection.first_duration,
                        aircraft: connection.first_aircraft
                    },
                    {
                        flightNumber: connection.second_flight,
                        airline: connection.second_airline,
                        origin: {
                            code: connection.connection_code,
                            name: connection.connection_name,
                            city: connection.connection_city
                        },
                        destination: {
                            code: connection.destination_code,
                            name: connection.destination_name,
                            city: connection.destination_city
                        },
                        departure: connection.second_departure,
                        arrival: connection.second_arrival,
                        duration: connection.second_duration,
                        aircraft: connection.second_aircraft
                    }
                ],
                layoverMinutes: Math.round(connection.layover_minutes),
                totalDuration: connection.total_flight_minutes + connection.layover_minutes
            });
        });

        // Format 2-stop flights
        if (searchResults.twoStopFlights) {
            searchResults.twoStopFlights.forEach(connection => {
                formatted.flights.push({
                    type: 'two-stop',
                    legs: [
                        {
                            flightNumber: connection.first_flight,
                            airline: connection.first_airline,
                            origin: {
                                code: connection.origin_code,
                                name: connection.origin_name,
                                city: connection.origin_city
                            },
                            destination: {
                                code: connection.first_connection_code,
                                name: connection.first_connection_name,
                                city: connection.first_connection_city
                            },
                            departure: connection.first_departure,
                            arrival: connection.first_arrival,
                            duration: connection.first_duration,
                            aircraft: connection.first_aircraft
                        },
                        {
                            flightNumber: connection.second_flight,
                            airline: connection.second_airline,
                            origin: {
                                code: connection.first_connection_code,
                                name: connection.first_connection_name,
                                city: connection.first_connection_city
                            },
                            destination: {
                                code: connection.second_connection_code,
                                name: connection.second_connection_name,
                                city: connection.second_connection_city
                            },
                            departure: connection.second_departure,
                            arrival: connection.second_arrival,
                            duration: connection.second_duration,
                            aircraft: connection.second_aircraft
                        },
                        {
                            flightNumber: connection.third_flight,
                            airline: connection.third_airline,
                            origin: {
                                code: connection.second_connection_code,
                                name: connection.second_connection_name,
                                city: connection.second_connection_city
                            },
                            destination: {
                                code: connection.destination_code,
                                name: connection.destination_name,
                                city: connection.destination_city
                            },
                            departure: connection.third_departure,
                            arrival: connection.third_arrival,
                            duration: connection.third_duration,
                            aircraft: connection.third_aircraft
                        }
                    ],
                    layoverMinutes: [Math.round(connection.first_layover_minutes), Math.round(connection.second_layover_minutes)],
                    totalDuration: connection.total_flight_minutes + connection.first_layover_minutes + connection.second_layover_minutes
                });
            });
        }

        return formatted;
    }

    close() {
        this.db.close();
    }
}

module.exports = FlightSearchService;
