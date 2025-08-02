/**
 * Enhanced Flight Search API with Connecting Flights Support
 * Enhances the existing server.js with connecting flight capabilities
 */

const ConnectingFlightAnalyzer = require('./connecting-flight-analyzer');

/**
 * Enhanced search endpoint that includes both direct and connecting flights
 */
function enhancedFlightSearch(db) {
    return async (req, res) => {
        const { from, to, date, includeConnections = 'true' } = req.query;
        
        if (!from || !to) {
            res.status(400).json({ 
                error: 'Missing required parameters: from and to airport codes' 
            });
            return;
        }

        const fromCode = from.toUpperCase();
        const toCode = to.toUpperCase();
        
        try {
            // First, search for direct flights
            const directFlights = await searchDirectFlights(db, fromCode, toCode);
            
            let connectingFlights = [];
            
            // If no direct flights found and connections are requested, search for connecting flights
            if (directFlights.length === 0 && includeConnections === 'true') {
                const analyzer = new ConnectingFlightAnalyzer();
                await analyzer.connect(); // Initialize database connection
                const allConnections = await analyzer.findConnections(fromCode, toCode, 20);
                
                // Filter out connections with layovers less than 60 minutes (1 hour)
                connectingFlights = allConnections.filter(connection => 
                    connection.layover.minutes >= 60
                );
                
                analyzer.close();
            }
            
            // Format the response
            const response = {
                route: {
                    from: fromCode,
                    to: toCode,
                    date: date || 'any'
                },
                direct_flights: directFlights,
                connecting_flights: connectingFlights,
                total_options: directFlights.length + connectingFlights.length,
                has_direct: directFlights.length > 0,
                has_connections: connectingFlights.length > 0
            };
            
            res.json(response);
            
        } catch (error) {
            console.error('Enhanced search error:', error);
            res.status(500).json({ 
                error: 'Internal server error during flight search',
                details: error.message 
            });
        }
    };
}

/**
 * Search for direct flights between two airports
 */
function searchDirectFlights(db, fromCode, toCode) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT f.flight_number, f.airline_name, f.airline_code, f.departure_time, f.arrival_time, 
                   f.duration_minutes, f.aircraft_type,
                   f.origin_code, f.destination_code,
                   orig.name as origin_name, orig.city as origin_city, orig.country as origin_country,
                   dest.name as dest_name, dest.city as dest_city, dest.country as dest_country,
                   orig.timezone as origin_timezone, dest.timezone as dest_timezone
            FROM flights f
            JOIN airports orig ON f.origin_code = orig.code
            JOIN airports dest ON f.destination_code = dest.code
            WHERE f.origin_code = ? AND f.destination_code = ?
            ORDER BY f.departure_time
        `;
        
        db.all(query, [fromCode, toCode], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

/**
 * Get connection statistics for a route
 */
async function getConnectionStats(req, res) {
    const { from, to } = req.query;
    
    if (!from || !to) {
        res.status(400).json({ 
            error: 'Missing required parameters: from and to airport codes' 
        });
        return;
    }

    const fromCode = from.toUpperCase();
    const toCode = to.toUpperCase();
    
    try {
        const analyzer = new ConnectingFlightAnalyzer();
        await analyzer.connect(); // Initialize database connection
        const connections = await analyzer.findConnections(fromCode, toCode, 20);
        analyzer.close();
        
        // Analyze connection statistics
        const stats = {
            route: `${fromCode} → ${toCode}`,
            total_connections: connections.length,
            risk_breakdown: {
                high_risk: connections.filter(c => c.layover.warning.risk === 'high').length,
                medium_risk: connections.filter(c => c.layover.warning.risk === 'medium').length,
                low_risk: connections.filter(c => c.layover.warning.risk === 'low').length
            },
            popular_hubs: {},
            shortest_layover: null,
            longest_layover: null,
            fastest_journey: null
        };
        
        // Calculate hub popularity
        connections.forEach(conn => {
            const hub = conn.layover.airport;
            stats.popular_hubs[hub] = (stats.popular_hubs[hub] || 0) + 1;
        });
        
        // Find shortest and longest layovers
        if (connections.length > 0) {
            connections.sort((a, b) => a.layover.minutes - b.layover.minutes);
            stats.shortest_layover = {
                minutes: connections[0].layover.minutes,
                airport: connections[0].layover.airport,
                warning: connections[0].layover.warning.color
            };
            stats.longest_layover = {
                minutes: connections[connections.length - 1].layover.minutes,
                airport: connections[connections.length - 1].layover.airport,
                warning: connections[connections.length - 1].layover.warning.color
            };
            
            // Find fastest total journey
            const fastestConn = connections.reduce((fastest, current) => {
                const currentTime = calculateTotalMinutes(current.totalJourney.departure, current.totalJourney.arrival);
                const fastestTime = calculateTotalMinutes(fastest.totalJourney.departure, fastest.totalJourney.arrival);
                return currentTime < fastestTime ? current : fastest;
            });
            
            stats.fastest_journey = {
                total_minutes: calculateTotalMinutes(fastestConn.totalJourney.departure, fastestConn.totalJourney.arrival),
                route: fastestConn.totalJourney.route,
                layover_minutes: fastestConn.layover.minutes,
                hub: fastestConn.layover.airport
            };
        }
        
        res.json(stats);
        
    } catch (error) {
        console.error('Connection stats error:', error);
        res.status(500).json({ 
            error: 'Internal server error getting connection stats',
            details: error.message 
        });
    }
}

/**
 * Helper function to calculate total journey time in minutes
 */
function calculateTotalMinutes(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight flights
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }
    
    return endMinutes - startMinutes;
}

module.exports = {
    enhancedFlightSearch,
    getConnectionStats,
    searchDirectFlights
};
