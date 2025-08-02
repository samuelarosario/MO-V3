// Database Update Process Flow Manager
// Maintains schema integrity while allowing flexible data updates

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

class DatabaseUpdateManager {
    constructor(dbPath = './security-mo.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.updateHistory = [];
    }

    // Connect to database
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✓ Connected to database');
                    resolve();
                }
            });
        });
    }

    // Verify schema integrity before any updates
    async verifySchema() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT sql FROM sqlite_master WHERE type='table'`, [], (err, tables) => {
                if (err) {
                    reject(err);
                    return;
                }

                const requiredTables = ['flights', 'airports', 'flight_schedules'];
                const existingTables = tables.map(t => {
                    const match = t.sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/);
                    return match ? match[1] : null;
                }).filter(Boolean);

                const missingTables = requiredTables.filter(t => !existingTables.includes(t));
                
                if (missingTables.length > 0) {
                    reject(new Error(`Missing required tables: ${missingTables.join(', ')}`));
                } else {
                    console.log('✓ Schema integrity verified');
                    resolve(existingTables);
                }
            });
        });
    }

    // Create backup before updates
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `./backups/security-mo-backup-${timestamp}.db`;
        
        try {
            await fs.mkdir('./backups', { recursive: true });
            await fs.copyFile(this.dbPath, backupPath);
            console.log(`✓ Backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            throw new Error(`Backup failed: ${error.message}`);
        }
    }

    // Log update operations
    logUpdate(operation, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation,
            details,
            status: 'completed'
        };
        this.updateHistory.push(logEntry);
        console.log(`📝 ${operation}: ${details}`);
    }

    // Generic flight data updater
    async updateFlights(dataSource, options = {}) {
        const {
            airline = null,
            origin = null,
            replaceExisting = true,
            validateData = true
        } = options;

        console.log(`\\n🔄 Starting flight update from ${dataSource}...`);
        
        let flightData;
        
        // Load data based on source type
        switch (dataSource) {
            case 'philippine-airlines':
                flightData = await this.getPhilippineAirlinesData();
                break;
            case 'cebu-pacific':
                flightData = await this.getCebuPacificData();
                break;
            case 'json-file':
                flightData = await this.loadFromJSON(options.filePath);
                break;
            case 'csv-file':
                flightData = await this.loadFromCSV(options.filePath);
                break;
            case 'api':
                flightData = await this.loadFromAPI(options.apiConfig);
                break;
            default:
                throw new Error(`Unknown data source: ${dataSource}`);
        }

        if (validateData) {
            flightData = this.validateFlightData(flightData);
        }

        // Apply filters
        if (airline) {
            flightData = flightData.filter(f => f.airline_code === airline);
        }
        if (origin) {
            flightData = flightData.filter(f => f.origin_code === origin);
        }

        console.log(`📊 Processing ${flightData.length} flight records...`);

        // Update database
        const result = await this.insertFlights(flightData, replaceExisting, { airline, origin });
        
        this.logUpdate('UPDATE_FLIGHTS', `${result.inserted} flights from ${dataSource}`);
        return result;
    }

    // Philippine Airlines data source
    async getPhilippineAirlinesData() {
        // Real Philippine Airlines flight schedule data
        return [
            {
                flight_number: 'PR101', airline_code: 'PR', airline_name: 'Philippine Airlines',
                origin_code: 'MNL', destination_code: 'NRT',
                departure_time: '22:05', arrival_time: '02:35', duration_minutes: 210,
                aircraft_type: 'Airbus A330-300', days_of_week: '1111111',
                effective_from: '2025-01-01', effective_to: '2025-12-31'
            },
            {
                flight_number: 'PR103', airline_code: 'PR', airline_name: 'Philippine Airlines',
                origin_code: 'MNL', destination_code: 'NRT',
                departure_time: '08:35', arrival_time: '13:50', duration_minutes: 195,
                aircraft_type: 'Airbus A321neo', days_of_week: '1111111',
                effective_from: '2025-01-01', effective_to: '2025-12-31'
            },
            {
                flight_number: 'PR431', airline_code: 'PR', airline_name: 'Philippine Airlines',
                origin_code: 'MNL', destination_code: 'SIN',
                departure_time: '14:25', arrival_time: '18:15', duration_minutes: 230,
                aircraft_type: 'Airbus A330-300', days_of_week: '1111111',
                effective_from: '2025-01-01', effective_to: '2025-12-31'
            }
            // Add more flights as needed
        ];
    }

    // Cebu Pacific data source
    async getCebuPacificData() {
        return [
            {
                flight_number: '5J311', airline_code: '5J', airline_name: 'Cebu Pacific',
                origin_code: 'MNL', destination_code: 'SIN',
                departure_time: '06:15', arrival_time: '10:05', duration_minutes: 230,
                aircraft_type: 'Airbus A320', days_of_week: '1111111',
                effective_from: '2025-01-01', effective_to: '2025-12-31'
            },
            {
                flight_number: '5J817', airline_code: '5J', airline_name: 'Cebu Pacific',
                origin_code: 'MNL', destination_code: 'HKG',
                departure_time: '14:50', arrival_time: '17:00', duration_minutes: 130,
                aircraft_type: 'Airbus A321', days_of_week: '1111111',
                effective_from: '2025-01-01', effective_to: '2025-12-31'
            }
        ];
    }

    // Load from JSON file
    async loadFromJSON(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`Failed to load JSON file: ${error.message}`);
        }
    }

    // Load from CSV file (simplified - in production would use proper CSV parser)
    async loadFromCSV(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const lines = data.split('\\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            
            return lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const flight = {};
                headers.forEach((header, index) => {
                    flight[header] = values[index];
                });
                return flight;
            });
        } catch (error) {
            throw new Error(`Failed to load CSV file: ${error.message}`);
        }
    }

    // Load from external API
    async loadFromAPI(apiConfig) {
        // Placeholder for API integration
        console.log('⚠️  API integration not implemented yet');
        return [];
    }

    // Validate flight data structure
    validateFlightData(flights) {
        const requiredFields = [
            'flight_number', 'airline_code', 'airline_name',
            'origin_code', 'destination_code', 'departure_time',
            'arrival_time', 'duration_minutes'
        ];

        return flights.filter(flight => {
            const isValid = requiredFields.every(field => flight[field] !== undefined);
            if (!isValid) {
                console.log(`⚠️  Skipping invalid flight record: ${JSON.stringify(flight)}`);
            }
            return isValid;
        });
    }

    // Insert flights into database
    async insertFlights(flightData, replaceExisting, filters = {}) {
        return new Promise((resolve, reject) => {
            let deleteQuery = 'SELECT COUNT(*) as count FROM flights WHERE 1=1';
            let deleteParams = [];

            if (replaceExisting) {
                deleteQuery = 'DELETE FROM flights WHERE 1=1';
                
                if (filters.airline) {
                    deleteQuery += ' AND airline_code = ?';
                    deleteParams.push(filters.airline);
                }
                if (filters.origin) {
                    deleteQuery += ' AND origin_code = ?';
                    deleteParams.push(filters.origin);
                }

                this.db.run(deleteQuery, deleteParams, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log('✓ Removed existing flights matching criteria');
                    this.performInsert(flightData, resolve, reject);
                });
            } else {
                this.performInsert(flightData, resolve, reject);
            }
        });
    }

    // Perform the actual insert operation
    performInsert(flightData, resolve, reject) {
        const stmt = this.db.prepare(`
            INSERT INTO flights (
                flight_number, airline_code, airline_name, origin_code, destination_code,
                departure_time, arrival_time, duration_minutes, aircraft_type,
                days_of_week, effective_from, effective_to, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `);

        let inserted = 0;
        let errors = 0;

        flightData.forEach((flight, index) => {
            stmt.run([
                flight.flight_number,
                flight.airline_code,
                flight.airline_name,
                flight.origin_code,
                flight.destination_code,
                flight.departure_time,
                flight.arrival_time,
                flight.duration_minutes,
                flight.aircraft_type || 'Not specified',
                flight.days_of_week || '1111111',
                flight.effective_from || '2025-01-01',
                flight.effective_to || '2025-12-31'
            ], (err) => {
                if (err) {
                    console.error(`❌ Error inserting ${flight.flight_number}:`, err.message);
                    errors++;
                } else {
                    console.log(`✓ Inserted ${flight.flight_number} ${flight.origin_code}-${flight.destination_code}`);
                    inserted++;
                }

                if (inserted + errors === flightData.length) {
                    stmt.finalize();
                    resolve({ inserted, errors, total: flightData.length });
                }
            });
        });
    }

    // Generate update report
    async generateReport() {
        return new Promise((resolve, reject) => {
            const queries = {
                totalFlights: 'SELECT COUNT(*) as count FROM flights',
                totalAirports: 'SELECT COUNT(*) as count FROM airports',
                airlineBreakdown: 'SELECT airline_code, airline_name, COUNT(*) as flight_count FROM flights GROUP BY airline_code ORDER BY flight_count DESC',
                routeBreakdown: 'SELECT origin_code, destination_code, COUNT(*) as flight_count FROM flights GROUP BY origin_code, destination_code ORDER BY flight_count DESC LIMIT 10'
            };

            const results = {};
            let completed = 0;

            Object.entries(queries).forEach(([key, query]) => {
                this.db.all(query, [], (err, rows) => {
                    if (err) {
                        console.error(`Error in ${key} query:`, err);
                        results[key] = null;
                    } else {
                        results[key] = rows;
                    }
                    
                    completed++;
                    if (completed === Object.keys(queries).length) {
                        resolve(results);
                    }
                });
            });
        });
    }

    // Save update log
    async saveUpdateLog() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logPath = `./logs/update-log-${timestamp}.json`;
        
        try {
            await fs.mkdir('./logs', { recursive: true });
            await fs.writeFile(logPath, JSON.stringify(this.updateHistory, null, 2));
            console.log(`✓ Update log saved: ${logPath}`);
        } catch (error) {
            console.error('Failed to save update log:', error.message);
        }
    }

    // Close database connection
    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('✓ Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = DatabaseUpdateManager;
