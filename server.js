// Security-MO Flight Search API Server
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const SerpAPIFlightSearcher = require('./serpapi-flight-searcher');
const SerpAPIatabaseUpdater = require('./database-updater-serpapi');
const { enhancedFlightSearch, getConnectionStats } = require('./enhanced-search-api');

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'security-mo.db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const db = new sqlite3.Database(dbPath);

// Initialize SerpAPI services
const serpApi = new SerpAPIFlightSearcher();
const serpUpdater = new SerpAPIatabaseUpdater();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api', (req, res) => {
    res.json({
        message: 'Security-MO Flight Search API',
        version: '3.0.0',
        status: 'running',
        serpapi: 'enabled',
        endpoints: {
            airports: '/api/airports',
            flights: '/api/flights',
            search: '/api/search',
            serpapi: {
                search: '/api/serpapi/search',
                flight: '/api/serpapi/flight/:number',
                route: '/api/serpapi/route/:origin/:destination',
                update: '/api/serpapi/update',
                stats: '/api/serpapi/stats'
            }
        }
    });
});

// Get all airports
app.get('/api/airports', (req, res) => {
    const { search, country, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM airports';
    let params = [];
    let conditions = [];
    
    if (search) {
        conditions.push('(code LIKE ? OR name LIKE ? OR city LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (country) {
        conditions.push('country LIKE ?');
        params.push(`%${country}%`);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY code LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            airports: rows,
            count: rows.length
        });
    });
});

// Get airport by code
app.get('/api/airports/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    
    db.get('SELECT * FROM airports WHERE code = ?', [code], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Airport not found' });
            return;
        }
        res.json(row);
    });
});

// Search flights
app.get('/api/flights', (req, res) => {
    const { flight_number, origin, destination, airline, limit = 20 } = req.query;
    
    let query = `
        SELECT f.*, 
               orig.name as origin_airport, orig.city as origin_city,
               dest.name as dest_airport, dest.city as dest_city
        FROM flights f
        JOIN airports orig ON f.origin_code = orig.code
        JOIN airports dest ON f.destination_code = dest.code
    `;
    
    let params = [];
    let conditions = [];
    
    if (flight_number) {
        // Handle wildcard patterns
        let flightPattern = flight_number.replace(/\*/g, '%');
        conditions.push('f.flight_number LIKE ?');
        params.push(flightPattern);
    }
    
    if (origin) {
        conditions.push('f.origin_code = ?');
        params.push(origin.toUpperCase());
    }
    
    if (destination) {
        conditions.push('f.destination_code = ?');
        params.push(destination.toUpperCase());
    }
    
    if (airline) {
        conditions.push('(f.airline_code LIKE ? OR f.airline_name LIKE ?)');
        const airlineTerm = `%${airline}%`;
        params.push(airlineTerm, airlineTerm);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY f.departure_time LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            flights: rows,
            count: rows.length
        });
    });
});

// Flight search endpoint - Enhanced with connecting flights
app.get('/api/search', enhancedFlightSearch(db));

// Connection statistics endpoint
app.get('/api/connections/stats', getConnectionStats);

// Database stats endpoint
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    db.get('SELECT COUNT(*) as count FROM airports', (err, airportCount) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        stats.airports = airportCount.count;
        
        db.get('SELECT COUNT(*) as count FROM flights', (err, flightCount) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.flights = flightCount.count;
            
            // Check for live flights table
            db.get('SELECT COUNT(*) as count FROM live_flights', (err, liveCount) => {
                if (!err && liveCount) {
                    stats.live_flights = liveCount.count;
                } else {
                    stats.live_flights = 0;
                }
                
                db.all('SELECT airline_name, COUNT(*) as routes FROM flights GROUP BY airline_name ORDER BY routes DESC', (err, airlines) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    stats.airlines = airlines;
                    
                    res.json({
                        database: 'security-mo.db',
                        status: 'operational',
                        stats: stats,
                        timestamp: new Date().toISOString(),
                        opensky_integration: true
                    });
                });
            });
        });
    });
});

// Live flights endpoint (from OpenSky integration)
app.get('/api/live-flights', (req, res) => {
    db.all(`
        SELECT flight_number, airline_code, icao24, latitude, longitude, 
               altitude, velocity, heading, last_contact, updated_at
        FROM live_flights 
        ORDER BY updated_at DESC
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            live_flights: rows,
            count: rows.length,
            last_updated: rows.length > 0 ? rows[0].updated_at : null
        });
    });
});

// Database explorer endpoint
app.get('/api/database', (req, res) => {
    const { table } = req.query;
    
    if (!table) {
        // Return list of tables
        db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, [], (err, tables) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                tables: tables.map(t => t.name),
                message: 'Available tables in database'
            });
        });
        return;
    }
    
    // Return data from specific table
    const limit = parseInt(req.query.limit) || 50;
    db.all(`SELECT * FROM ${table} LIMIT ?`, [limit], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            table: table,
            data: rows,
            count: rows.length,
            limited_to: limit
        });
    });
});

// ========================================
// SerpAPI Endpoints
// ========================================

// Search flights with SerpAPI
app.get('/api/serpapi/search', async (req, res) => {
    try {
        const { origin, destination, date } = req.query;
        
        if (!origin || !destination) {
            return res.status(400).json({ 
                error: 'Origin and destination are required',
                example: '/api/serpapi/search?origin=MNL&destination=CEB'
            });
        }

        const flights = await serpApi.searchFlights(origin, destination, date);
        
        res.json({
            origin,
            destination,
            date: date || 'flexible',
            flights: flights || [],
            count: flights ? flights.length : 0,
            source: 'SerpAPI Google Flights'
        });
    } catch (error) {
        console.error('SerpAPI search error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            message: error.message 
        });
    }
});

// Search specific flight with SerpAPI
app.get('/api/serpapi/flight/:number', async (req, res) => {
    try {
        const flightNumber = req.params.number.toUpperCase();
        
        const flightInfo = await serpApi.searchSpecificFlight(flightNumber);
        
        res.json({
            flight_number: flightNumber,
            data: flightInfo || null,
            source: 'SerpAPI Google Search'
        });
    } catch (error) {
        console.error('SerpAPI flight search error:', error);
        res.status(500).json({ 
            error: 'Flight search failed',
            message: error.message 
        });
    }
});

// Search route flights and save to database
app.post('/api/serpapi/route/:origin/:destination', async (req, res) => {
    try {
        const { origin, destination } = req.params;
        const { date } = req.body;
        
        const flights = await serpUpdater.searchRouteFlights(origin, destination, date);
        
        res.json({
            origin,
            destination,
            date: date || 'flexible',
            flights_found: flights.length,
            message: 'Flights searched and saved to database',
            source: 'SerpAPI Google Flights'
        });
    } catch (error) {
        console.error('SerpAPI route search error:', error);
        res.status(500).json({ 
            error: 'Route search failed',
            message: error.message 
        });
    }
});

// Update database with SerpAPI
app.post('/api/serpapi/update', async (req, res) => {
    try {
        const result = await serpUpdater.updateFlightDataFromSerpAPI();
        
        res.json({
            message: 'Database updated with SerpAPI data',
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('SerpAPI update error:', error);
        res.status(500).json({ 
            error: 'Update failed',
            message: error.message 
        });
    }
});

// Get SerpAPI database statistics
app.get('/api/serpapi/stats', async (req, res) => {
    try {
        const stats = await serpUpdater.getDatabaseStats();
        
        res.json({
            message: 'SerpAPI Database Statistics',
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('SerpAPI stats error:', error);
        res.status(500).json({ 
            error: 'Stats retrieval failed',
            message: error.message 
        });
    }
});

// Get SerpAPI search history for a flight
app.get('/api/serpapi/history/:flight', (req, res) => {
    const flightNumber = req.params.flight.toUpperCase();
    
    db.all(`
        SELECT * FROM serpapi_flight_data 
        WHERE flight_number = ? 
        ORDER BY updated_at DESC
    `, [flightNumber], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database query failed' });
            return;
        }
        
        res.json({
            flight_number: flightNumber,
            search_history: rows,
            count: rows.length
        });
    });
});

// Get SerpAPI live flights
app.get('/api/serpapi/live', (req, res) => {
    const { limit = 50, flight_number, route } = req.query;
    
    let query = 'SELECT * FROM live_flights_serpapi';
    let params = [];
    let conditions = [];
    
    if (flight_number) {
        conditions.push('flight_number = ?');
        params.push(flight_number.toUpperCase());
    }
    
    if (route) {
        const [origin, destination] = route.split('-');
        if (origin && destination) {
            conditions.push('(departure_code = ? AND arrival_code = ?)');
            params.push(origin.toUpperCase(), destination.toUpperCase());
        }
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database query failed' });
            return;
        }
        
        res.json({
            serpapi_live_flights: rows,
            count: rows.length,
            limited_to: limit,
            filters: { flight_number, route }
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Security-MO Flight Search API running on port ${port}`);
    console.log(`📊 Database: ${dbPath}`);
    console.log(`🔍 SerpAPI: Enabled`);
    console.log(`🌐 API Endpoints:`);
    console.log(`   GET http://localhost:${port}/`);
    console.log(`   GET http://localhost:${port}/api/airports`);
    console.log(`   GET http://localhost:${port}/api/flights`);
    console.log(`   GET http://localhost:${port}/api/search?from=MNL&to=LAX`);
    console.log(`   GET http://localhost:${port}/api/stats`);
    console.log(`🔍 SerpAPI Endpoints:`);
    console.log(`   GET http://localhost:${port}/api/serpapi/search?origin=MNL&destination=CEB`);
    console.log(`   GET http://localhost:${port}/api/serpapi/flight/PR216`);
    console.log(`   POST http://localhost:${port}/api/serpapi/route/MNL/CEB`);
    console.log(`   POST http://localhost:${port}/api/serpapi/update`);
    console.log(`   GET http://localhost:${port}/api/serpapi/stats`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});
