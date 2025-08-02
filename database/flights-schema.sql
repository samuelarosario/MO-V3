-- Create flights table for local flight database
CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_number VARCHAR(10) NOT NULL,
    airline_code VARCHAR(3) NOT NULL,
    airline_name VARCHAR(100) NOT NULL,
    origin_code VARCHAR(3) NOT NULL,
    destination_code VARCHAR(3) NOT NULL,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    aircraft_type VARCHAR(50),
    days_of_week VARCHAR(7) NOT NULL, -- SMTWTFS format (1=operates, 0=doesn't)
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create flight schedules table for date-specific data
CREATE TABLE IF NOT EXISTS flight_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL,
    flight_date DATE NOT NULL,
    actual_departure_time TIME,
    actual_arrival_time TIME,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, delayed, cancelled, completed
    delay_minutes INTEGER DEFAULT 0,
    gate VARCHAR(10),
    FOREIGN KEY (flight_id) REFERENCES flights(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(origin_code, destination_code);
CREATE INDEX IF NOT EXISTS idx_flights_airline ON flights(airline_code);
CREATE INDEX IF NOT EXISTS idx_flight_schedules_date ON flight_schedules(flight_date);
CREATE INDEX IF NOT EXISTS idx_flight_schedules_flight ON flight_schedules(flight_id);
