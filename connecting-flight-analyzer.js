const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Connecting Flight Analyzer
 * Analyzes potential connecting flights and provides layover warnings
 * Color coding:
 * - Red: Less than 2 hours (risky connection)
 * - Orange: 2-3 hours (tight connection)
 * - Green: 3+ hours (comfortable connection)
 */
class ConnectingFlightAnalyzer {
    constructor() {
        this.dbPath = path.join(__dirname, 'security-mo.db');
        this.db = null;
        
        // Minimum connection times by airport type (in minutes)
        this.minConnectionTimes = {
            'international': 120, // 2 hours for international connections
            'domestic': 60,       // 1 hour for domestic connections
            'same_terminal': 45,  // 45 minutes if same terminal
            'different_terminal': 90 // 1.5 hours if different terminals
        };
        
        // Major hub airports that typically require longer connections
        this.majorHubs = [
            'JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'DEN', 'LAS', 'PHX', 'IAH', 'MIA',
            'LHR', 'CDG', 'FRA', 'AMS', 'DXB', 'DOH', 'SIN', 'NRT', 'ICN', 'HKG',
            'SYD', 'MEL', 'YYZ', 'YVR'
        ];
    }

    // Initialize database connection
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error connecting to database:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Connected to flight database');
                    resolve();
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
        }
    }

    // Calculate time difference between two times in minutes
    calculateLayoverMinutes(arrivalTime, departureTime, sameDay = true) {
        const [arrHour, arrMin] = arrivalTime.split(':').map(Number);
        const [depHour, depMin] = departureTime.split(':').map(Number);
        
        let arrivalMinutes = arrHour * 60 + arrMin;
        let departureMinutes = depHour * 60 + depMin;
        
        // Handle overnight connections
        if (!sameDay || departureMinutes < arrivalMinutes) {
            departureMinutes += 24 * 60; // Add 24 hours
        }
        
        return departureMinutes - arrivalMinutes;
    }

    // Get layover warning color and message
    getLayoverWarning(layoverMinutes, isInternational = false, isHub = false) {
        const hours = Math.floor(layoverMinutes / 60);
        const minutes = layoverMinutes % 60;
        const timeStr = `${hours}h ${minutes}m`;
        
        let minRequired = isInternational ? 120 : 60;
        if (isHub) minRequired += 30; // Add 30 minutes for major hubs
        
        if (layoverMinutes < 120) { // Less than 2 hours
            return {
                color: '🔴 RED',
                status: 'RISKY',
                message: `⚠️ Very tight connection (${timeStr}) - High risk of missing connection`,
                risk: 'high',
                recommendation: 'Consider booking a later flight or allow more time'
            };
        } else if (layoverMinutes < 180) { // 2-3 hours
            return {
                color: '🟠 ORANGE',
                status: 'TIGHT',
                message: `⚡ Tight connection (${timeStr}) - Manageable but rush required`,
                risk: 'medium',
                recommendation: 'Move quickly between gates, check terminal maps'
            };
        } else { // 3+ hours
            return {
                color: '🟢 GREEN',
                status: 'COMFORTABLE',
                message: `✅ Comfortable connection (${timeStr}) - Plenty of time`,
                risk: 'low',
                recommendation: 'Relax, explore airport amenities, grab a meal'
            };
        }
    }

    // Find potential connecting flights for a given route
    async findConnections(originCode, finalDestination, maxConnections = 5) {
        console.log(`\n🔍 Analyzing connections from ${originCode} to ${finalDestination}...`);
        
        return new Promise((resolve, reject) => {
            // Find flights departing from origin
            const outboundQuery = `
                SELECT f1.*, a1.name as origin_name, a1.city as origin_city,
                       a2.name as dest_name, a2.city as dest_city
                FROM flights f1
                LEFT JOIN airports a1 ON f1.origin_code = a1.code
                LEFT JOIN airports a2 ON f1.destination_code = a2.code
                WHERE f1.origin_code = ? AND f1.status = 'active'
                ORDER BY f1.departure_time
            `;
            
            this.db.all(outboundQuery, [originCode], (err, outboundFlights) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const connections = [];
                let processed = 0;
                
                if (outboundFlights.length === 0) {
                    resolve([]);
                    return;
                }
                
                // For each outbound flight, find connecting flights
                outboundFlights.forEach((outbound, index) => {
                    const connectingQuery = `
                        SELECT f2.*, a1.name as origin_name, a1.city as origin_city,
                               a2.name as dest_name, a2.city as dest_city
                        FROM flights f2
                        LEFT JOIN airports a1 ON f2.origin_code = a1.code
                        LEFT JOIN airports a2 ON f2.destination_code = a2.code
                        WHERE f2.origin_code = ? AND f2.destination_code = ? 
                        AND f2.status = 'active'
                        ORDER BY f2.departure_time
                    `;
                    
                    this.db.all(connectingQuery, [outbound.destination_code, finalDestination], (err2, connectingFlights) => {
                        if (err2) {
                            processed++;
                            if (processed === outboundFlights.length) resolve(connections);
                            return;
                        }
                        
                        // Analyze each potential connection
                        connectingFlights.forEach(connecting => {
                            const layoverMinutes = this.calculateLayoverMinutes(
                                outbound.arrival_time, 
                                connecting.departure_time
                            );
                            
                            // Only include positive layovers (no negative connections)
                            if (layoverMinutes > 0) {
                                const isHub = this.majorHubs.includes(outbound.destination_code);
                                const isInternational = outbound.origin_code !== connecting.destination_code; // Simple international check
                                
                                const warning = this.getLayoverWarning(layoverMinutes, isInternational, isHub);
                                
                                connections.push({
                                    outbound: {
                                        flight: `${outbound.airline_code} ${outbound.flight_number}`,
                                        airline: outbound.airline_name,
                                        route: `${outbound.origin_code} → ${outbound.destination_code}`,
                                        departure: outbound.departure_time,
                                        arrival: outbound.arrival_time,
                                        aircraft: outbound.aircraft_type
                                    },
                                    connecting: {
                                        flight: `${connecting.airline_code} ${connecting.flight_number}`,
                                        airline: connecting.airline_name,
                                        route: `${connecting.origin_code} → ${connecting.destination_code}`,
                                        departure: connecting.departure_time,
                                        arrival: connecting.arrival_time,
                                        aircraft: connecting.aircraft_type
                                    },
                                    layover: {
                                        airport: outbound.destination_code,
                                        minutes: layoverMinutes,
                                        warning: warning,
                                        isHub: isHub,
                                        isInternational: isInternational
                                    },
                                    totalJourney: {
                                        departure: outbound.departure_time,
                                        arrival: connecting.arrival_time,
                                        route: `${originCode} → ${outbound.destination_code} → ${finalDestination}`
                                    }
                                });
                            }
                        });
                        
                        processed++;
                        if (processed === outboundFlights.length) {
                            // Sort by layover time and limit results
                            connections.sort((a, b) => a.layover.minutes - b.layover.minutes);
                            resolve(connections.slice(0, maxConnections));
                        }
                    });
                });
            });
        });
    }

    // Display connection analysis results
    displayConnections(connections, originCode, finalDestination) {
        console.log(`\n✈️ ═══════════════════════════════════════════════════════════════`);
        console.log(`   CONNECTING FLIGHTS: ${originCode} → ${finalDestination}`);
        console.log(`═══════════════════════════════════════════════════════════════\n`);
        
        if (connections.length === 0) {
            console.log('❌ No connecting flights found for this route');
            return;
        }
        
        connections.forEach((conn, index) => {
            console.log(`${index + 1}. ${conn.layover.warning.color} CONNECTION`);
            console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            
            // Outbound flight details
            console.log(`   🛫 OUTBOUND: ${conn.outbound.flight} (${conn.outbound.airline})`);
            console.log(`      Route: ${conn.outbound.route}`);
            console.log(`      Time: ${conn.outbound.departure} → ${conn.outbound.arrival}`);
            console.log(`      Aircraft: ${conn.outbound.aircraft || 'N/A'}`);
            
            // Layover details with warning
            console.log(`   🔄 LAYOVER at ${conn.layover.airport}:`);
            console.log(`      ${conn.layover.warning.message}`);
            console.log(`      Status: ${conn.layover.warning.status} (${conn.layover.warning.risk} risk)`);
            if (conn.layover.isHub) console.log(`      ⚠️ Major hub airport - allow extra time`);
            console.log(`      💡 ${conn.layover.warning.recommendation}`);
            
            // Connecting flight details
            console.log(`   🛬 CONNECTING: ${conn.connecting.flight} (${conn.connecting.airline})`);
            console.log(`      Route: ${conn.connecting.route}`);
            console.log(`      Time: ${conn.connecting.departure} → ${conn.connecting.arrival}`);
            console.log(`      Aircraft: ${conn.connecting.aircraft || 'N/A'}`);
            
            // Total journey summary
            const totalTime = this.calculateLayoverMinutes(conn.totalJourney.departure, conn.totalJourney.arrival);
            const totalHours = Math.floor(totalTime / 60);
            const totalMins = totalTime % 60;
            console.log(`   📊 TOTAL JOURNEY: ${totalHours}h ${totalMins}m`);
            console.log(`      ${conn.totalJourney.route}`);
            console.log(`      ${conn.totalJourney.departure} → ${conn.totalJourney.arrival}\n`);
        });
        
        // Summary statistics
        const riskCounts = connections.reduce((acc, conn) => {
            acc[conn.layover.warning.risk]++;
            return acc;
        }, { high: 0, medium: 0, low: 0 });
        
        console.log(`📈 CONNECTION SUMMARY:`);
        console.log(`   🔴 High Risk (< 2h): ${riskCounts.high} connections`);
        console.log(`   🟠 Medium Risk (2-3h): ${riskCounts.medium} connections`);
        console.log(`   🟢 Low Risk (3h+): ${riskCounts.low} connections`);
    }

    // Main analysis function
    async analyzeRoute(originCode, finalDestination) {
        try {
            await this.connect();
            const connections = await this.findConnections(originCode, finalDestination);
            this.displayConnections(connections, originCode, finalDestination);
            this.close();
            return connections;
        } catch (error) {
            console.error('❌ Error analyzing connections:', error.message);
            this.close();
            throw error;
        }
    }
}

// Export for use in other modules
module.exports = ConnectingFlightAnalyzer;

// CLI usage if run directly
if (require.main === module) {
    const analyzer = new ConnectingFlightAnalyzer();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node connecting-flight-analyzer.js <ORIGIN> <DESTINATION>');
        console.log('Example: node connecting-flight-analyzer.js MNL LAX');
        process.exit(1);
    }
    
    const [origin, destination] = args;
    
    console.log('🚀 Starting Connecting Flight Analysis...');
    console.log(`📍 Route: ${origin} → ${destination}`);
    
    analyzer.analyzeRoute(origin, destination)
        .then(() => {
            console.log('\n✅ Analysis complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Analysis failed:', error.message);
            process.exit(1);
        });
}
