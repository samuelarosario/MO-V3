const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'security-mo.db');

async function initializeFlightsDatabase() {
    console.log('🛫 Initializing flights database...');
    
    const db = new sqlite3.Database(dbPath);
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Read and execute schema
            const fs = require('fs');
            const schemaPath = path.join(__dirname, 'flights-schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            db.exec(schema, (err) => {
                if (err) {
                    console.error('❌ Error creating flights schema:', err);
                    reject(err);
                    return;
                }
                
                console.log('✅ Flights schema created successfully');
                
                // Insert comprehensive flight data
                insertFlightData(db, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('✅ Flight data inserted successfully');
                        resolve(db);
                    }
                });
            });
        });
    });
}

function insertFlightData(db, callback) {
    console.log('📊 Inserting comprehensive flight data...');
    
    // Define comprehensive flight routes
    const flights = [
        // PNG Regional Routes
        { flight_number: 'PX101', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'POM', destination: 'LAE', departure: '06:00', arrival: '07:15', duration: 75, aircraft: 'Dash 8-400', days: '1111100' },
        { flight_number: 'PX102', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'LAE', destination: 'POM', departure: '08:00', arrival: '09:15', duration: 75, aircraft: 'Dash 8-400', days: '1111100' },
        { flight_number: 'PX121', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'POM', destination: 'MAG', departure: '09:30', arrival: '10:30', duration: 60, aircraft: 'Dash 8-300', days: '1010100' },
        { flight_number: 'PX122', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'MAG', destination: 'POM', departure: '11:00', arrival: '12:00', duration: 60, aircraft: 'Dash 8-300', days: '1010100' },
        { flight_number: 'PX131', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'POM', destination: 'RAB', departure: '14:00', arrival: '15:45', duration: 105, aircraft: 'Dash 8-400', days: '0101010' },
        { flight_number: 'PX132', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'RAB', destination: 'POM', departure: '16:30', arrival: '18:15', duration: 105, aircraft: 'Dash 8-400', days: '0101010' },
        
        // PNG International Routes
        { flight_number: 'PX8', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'POM', destination: 'BNE', departure: '23:55', arrival: '05:25', duration: 210, aircraft: 'Boeing 737-800', days: '0010100' },
        { flight_number: 'PX9', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'BNE', destination: 'POM', departure: '12:30', arrival: '16:45', duration: 195, aircraft: 'Boeing 737-800', days: '0001000' },
        { flight_number: 'PX12', airline_code: 'PX', airline_name: 'Air Niugini', origin: 'POM', destination: 'CNS', departure: '01:00', arrival: '03:30', duration: 150, aircraft: 'Fokker 100', days: '1000010' },
        
        // Philippines Domestic Routes
        { flight_number: 'PR2131', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'MNL', destination: 'CEB', departure: '06:20', arrival: '08:05', duration: 105, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR2132', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'CEB', destination: 'MNL', departure: '08:45', arrival: '10:25', duration: 100, aircraft: 'Airbus A321', days: '1111111' },
        { flight_number: 'PR1841', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'MNL', destination: 'DVO', departure: '07:00', arrival: '09:25', duration: 145, aircraft: 'Airbus A320', days: '1111111' },
        { flight_number: 'PR1842', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'DVO', destination: 'MNL', departure: '10:15', arrival: '12:35', duration: 140, aircraft: 'Airbus A320', days: '1111111' },
        
        // Philippines International Routes
        { flight_number: 'PR532', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'MNL', destination: 'BNE', departure: '20:50', arrival: '06:20', duration: 450, aircraft: 'Airbus A330-300', days: '0001000' },
        { flight_number: 'PR533', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'BNE', destination: 'MNL', departure: '10:30', arrival: '16:10', duration: 460, aircraft: 'Airbus A330-300', days: '0010000' },
        { flight_number: 'PR212', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'MNL', destination: 'SYD', departure: '19:05', arrival: '07:50', duration: 525, aircraft: 'Airbus A350-900', days: '1111111' },
        { flight_number: 'PR213', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'SYD', destination: 'MNL', departure: '11:40', arrival: '18:25', duration: 525, aircraft: 'Airbus A350-900', days: '1111111' },
        { flight_number: 'PR102', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'MNL', destination: 'NRT', departure: '14:40', arrival: '20:05', duration: 205, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'PR103', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'NRT', destination: 'MNL', departure: '22:05', arrival: '02:35', duration: 210, aircraft: 'Airbus A330-300', days: '1111111' },
        
        // Connection Flights (MNL-BNE-POM routing)
        { flight_number: 'JQ7', airline_code: 'JQ', airline_name: 'Jetstar Airways', origin: 'MNL', destination: 'BNE', departure: '01:25', arrival: '11:55', duration: 450, aircraft: 'Airbus A321', days: '0100100' },
        { flight_number: 'JQ8', airline_code: 'JQ', airline_name: 'Jetstar Airways', origin: 'BNE', destination: 'MNL', departure: '13:30', arrival: '19:00', duration: 450, aircraft: 'Airbus A321', days: '0010100' },
        
        // Australian Domestic (for connections)
        { flight_number: 'QF1521', airline_code: 'QF', airline_name: 'Qantas', origin: 'BNE', destination: 'SYD', departure: '06:00', arrival: '07:25', duration: 85, aircraft: 'Boeing 737-800', days: '1111111' },
        { flight_number: 'QF1522', airline_code: 'QF', airline_name: 'Qantas', origin: 'SYD', destination: 'BNE', departure: '08:00', arrival: '09:15', duration: 75, aircraft: 'Boeing 737-800', days: '1111111' },
        { flight_number: 'VA973', airline_code: 'VA', airline_name: 'Virgin Australia', origin: 'BNE', destination: 'MEL', departure: '07:00', arrival: '09:30', duration: 150, aircraft: 'Boeing 737-800', days: '1111111' },
        { flight_number: 'VA974', airline_code: 'VA', airline_name: 'Virgin Australia', origin: 'MEL', destination: 'BNE', departure: '10:15', arrival: '12:30', duration: 135, aircraft: 'Boeing 737-800', days: '1111111' },
        
        // Major International Routes
        { flight_number: 'SQ231', airline_code: 'SQ', airline_name: 'Singapore Airlines', origin: 'MNL', destination: 'SIN', departure: '14:25', arrival: '18:10', duration: 165, aircraft: 'Airbus A350-900', days: '1111111' },
        { flight_number: 'SQ232', airline_code: 'SQ', airline_name: 'Singapore Airlines', origin: 'SIN', destination: 'MNL', departure: '20:15', arrival: '01:15', duration: 180, aircraft: 'Airbus A350-900', days: '1111111' },
        { flight_number: 'CX910', airline_code: 'CX', airline_name: 'Cathay Pacific', origin: 'MNL', destination: 'HKG', departure: '08:20', arrival: '11:05', duration: 105, aircraft: 'Airbus A330-300', days: '1111111' },
        { flight_number: 'CX911', airline_code: 'CX', airline_name: 'Cathay Pacific', origin: 'HKG', destination: 'MNL', departure: '13:25', arrival: '17:25', duration: 120, aircraft: 'Airbus A330-300', days: '1111111' },
        
        // US Routes
        { flight_number: 'PR126', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'MNL', destination: 'LAX', departure: '23:35', arrival: '19:05', duration: 690, aircraft: 'Boeing 777-300ER', days: '1111111' },
        { flight_number: 'PR127', airline_code: 'PR', airline_name: 'Philippine Airlines', origin: 'LAX', destination: 'MNL', departure: '00:50', arrival: '06:30', duration: 700, aircraft: 'Boeing 777-300ER', days: '1111111' },
    ];
    
    // Insert flights
    const stmt = db.prepare(`
        INSERT INTO flights (
            flight_number, airline_code, airline_name, origin_code, destination_code,
            departure_time, arrival_time, duration_minutes, aircraft_type, days_of_week,
            effective_from, effective_to, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let insertCount = 0;
    flights.forEach(flight => {
        stmt.run([
            flight.flight_number,
            flight.airline_code,
            flight.airline_name,
            flight.origin,
            flight.destination,
            flight.departure,
            flight.arrival,
            flight.duration,
            flight.aircraft,
            flight.days,
            '2025-01-01',
            '2025-12-31',
            'active'
        ], (err) => {
            if (err) {
                console.error('❌ Error inserting flight:', flight.flight_number, err);
            } else {
                insertCount++;
                if (insertCount === flights.length) {
                    stmt.finalize();
                    console.log(`✅ Inserted ${insertCount} flight routes`);
                    callback(null);
                }
            }
        });
    });
}

module.exports = { initializeFlightsDatabase };
