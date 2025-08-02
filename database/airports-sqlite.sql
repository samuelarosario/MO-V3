-- SQLite version of airports database initialization
-- This replaces the SQL Server version for local development

-- Create Airports table
CREATE TABLE IF NOT EXISTS airports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    timezone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_airports_code ON airports(code);
CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city);
CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country);
CREATE INDEX IF NOT EXISTS idx_airports_name ON airports(name);

-- Insert comprehensive airport data
INSERT OR IGNORE INTO airports (code, name, city, country, latitude, longitude, timezone) VALUES
('MNL', 'Ninoy Aquino International Airport', 'Manila', 'Philippines', 14.5086, 121.0194, 'Asia/Manila'),
('POM', 'Jacksons International Airport', 'Port Moresby', 'Papua New Guinea', -9.4438, 147.2200, 'Pacific/Port_Moresby'),
('NRT', 'Narita International Airport', 'Tokyo', 'Japan', 35.7647, 140.3864, 'Asia/Tokyo'),
('HND', 'Haneda Airport', 'Tokyo', 'Japan', 35.5494, 139.7798, 'Asia/Tokyo'),
('LAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 33.9425, -118.4081, 'America/Los_Angeles'),
('JFK', 'John F. Kennedy International Airport', 'New York', 'United States', 40.6413, -73.7781, 'America/New_York'),
('LHR', 'Heathrow Airport', 'London', 'United Kingdom', 51.4700, -0.4543, 'Europe/London'),
('CDG', 'Charles de Gaulle Airport', 'Paris', 'France', 49.0097, 2.5479, 'Europe/Paris'),
('DXB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 25.2532, 55.3657, 'Asia/Dubai'),
('SIN', 'Changi Airport', 'Singapore', 'Singapore', 1.3644, 103.9915, 'Asia/Singapore'),
('SYD', 'Kingsford Smith Airport', 'Sydney', 'Australia', -33.9399, 151.1753, 'Australia/Sydney'),
('MEL', 'Melbourne Airport', 'Melbourne', 'Australia', -37.6690, 144.8410, 'Australia/Melbourne'),
('BKK', 'Suvarnabhumi Airport', 'Bangkok', 'Thailand', 13.6900, 100.7501, 'Asia/Bangkok'),
('KUL', 'Kuala Lumpur International Airport', 'Kuala Lumpur', 'Malaysia', 2.7456, 101.7072, 'Asia/Kuala_Lumpur'),
('CGK', 'Soekarno-Hatta International Airport', 'Jakarta', 'Indonesia', -6.1256, 106.6559, 'Asia/Jakarta'),
('ICN', 'Incheon International Airport', 'Seoul', 'South Korea', 37.4602, 126.4407, 'Asia/Seoul'),
('PVG', 'Shanghai Pudong International Airport', 'Shanghai', 'China', 31.1443, 121.8083, 'Asia/Shanghai'),
('PEK', 'Beijing Capital International Airport', 'Beijing', 'China', 40.0801, 116.5846, 'Asia/Shanghai'),
('DEL', 'Indira Gandhi International Airport', 'New Delhi', 'India', 28.5562, 77.1000, 'Asia/Kolkata'),
('BOM', 'Chhatrapati Shivaji International Airport', 'Mumbai', 'India', 19.0896, 72.8656, 'Asia/Kolkata'),
('YVR', 'Vancouver International Airport', 'Vancouver', 'Canada', 49.1967, -123.1815, 'America/Vancouver'),
('YYZ', 'Pearson International Airport', 'Toronto', 'Canada', 43.6777, -79.6248, 'America/Toronto'),
('FRA', 'Frankfurt Airport', 'Frankfurt', 'Germany', 50.0379, 8.5622, 'Europe/Berlin'),
('AMS', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 52.3105, 4.7683, 'Europe/Amsterdam'),
('MAD', 'Madrid-Barajas Airport', 'Madrid', 'Spain', 40.4936, -3.5668, 'Europe/Madrid'),
('FCO', 'Leonardo da Vinci International Airport', 'Rome', 'Italy', 41.8003, 12.2389, 'Europe/Rome'),
('ZUR', 'Zurich Airport', 'Zurich', 'Switzerland', 47.4647, 8.5492, 'Europe/Zurich'),
('VIE', 'Vienna International Airport', 'Vienna', 'Austria', 48.1103, 16.5697, 'Europe/Vienna'),
('CPH', 'Copenhagen Airport', 'Copenhagen', 'Denmark', 55.6181, 12.6561, 'Europe/Copenhagen'),
('OSL', 'Oslo Airport', 'Oslo', 'Norway', 60.1939, 11.1004, 'Europe/Oslo'),
('ARN', 'Stockholm Arlanda Airport', 'Stockholm', 'Sweden', 59.6519, 17.9186, 'Europe/Stockholm'),
('HEL', 'Helsinki Airport', 'Helsinki', 'Finland', 60.3172, 24.9633, 'Europe/Helsinki'),
('IST', 'Istanbul Airport', 'Istanbul', 'Turkey', 41.2753, 28.7519, 'Europe/Istanbul'),
('DOH', 'Hamad International Airport', 'Doha', 'Qatar', 25.2731, 51.6081, 'Asia/Qatar'),
('AUH', 'Abu Dhabi International Airport', 'Abu Dhabi', 'United Arab Emirates', 24.4330, 54.6511, 'Asia/Dubai'),
('CAI', 'Cairo International Airport', 'Cairo', 'Egypt', 30.1219, 31.4056, 'Africa/Cairo'),
('JNB', 'OR Tambo International Airport', 'Johannesburg', 'South Africa', -26.1367, 28.2411, 'Africa/Johannesburg'),
('CPT', 'Cape Town International Airport', 'Cape Town', 'South Africa', -33.9648, 18.6017, 'Africa/Johannesburg'),
('CUN', 'Cancun International Airport', 'Cancun', 'Mexico', 21.0365, -86.8771, 'America/Cancun'),
('MEX', 'Mexico City International Airport', 'Mexico City', 'Mexico', 19.4363, -99.0721, 'America/Mexico_City'),
('GRU', 'São Paulo-Guarulhos International Airport', 'São Paulo', 'Brazil', -23.4356, -46.4731, 'America/Sao_Paulo'),
('GIG', 'Rio de Janeiro-Galeão International Airport', 'Rio de Janeiro', 'Brazil', -22.8075, -43.2436, 'America/Sao_Paulo'),
('EZE', 'Ezeiza International Airport', 'Buenos Aires', 'Argentina', -34.8222, -58.5358, 'America/Argentina/Buenos_Aires'),
('SCL', 'Santiago International Airport', 'Santiago', 'Chile', -33.3928, -70.7856, 'America/Santiago'),
('LIM', 'Jorge Chávez International Airport', 'Lima', 'Peru', -12.0219, -77.1142, 'America/Lima'),
('BOG', 'El Dorado International Airport', 'Bogotá', 'Colombia', 4.7016, -74.1469, 'America/Bogota'),
('UIO', 'Mariscal Sucre International Airport', 'Quito', 'Ecuador', -0.1292, -78.3575, 'America/Guayaquil'),
('PTY', 'Tocumen International Airport', 'Panama City', 'Panama', 9.0714, -79.3831, 'America/Panama'),

-- Additional major airports
('ORD', 'O''Hare International Airport', 'Chicago', 'United States', 41.9742, -87.9073, 'America/Chicago'),
('DFW', 'Dallas/Fort Worth International Airport', 'Dallas', 'United States', 32.8998, -97.0403, 'America/Chicago'),
('ATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'United States', 33.6407, -84.4277, 'America/New_York'),
('MIA', 'Miami International Airport', 'Miami', 'United States', 25.7959, -80.2870, 'America/New_York'),
('SFO', 'San Francisco International Airport', 'San Francisco', 'United States', 37.6213, -122.3790, 'America/Los_Angeles'),
('SEA', 'Seattle-Tacoma International Airport', 'Seattle', 'United States', 47.4502, -122.3088, 'America/Los_Angeles'),
('LAS', 'McCarran International Airport', 'Las Vegas', 'United States', 36.0840, -115.1537, 'America/Los_Angeles'),
('DEN', 'Denver International Airport', 'Denver', 'United States', 39.8561, -104.6737, 'America/Denver'),
('PHX', 'Phoenix Sky Harbor International Airport', 'Phoenix', 'United States', 33.4342, -112.0080, 'America/Phoenix'),
('IAH', 'George Bush Intercontinental Airport', 'Houston', 'United States', 29.9902, -95.3368, 'America/Chicago'),

-- European hubs
('MUC', 'Munich Airport', 'Munich', 'Germany', 48.3537, 11.7750, 'Europe/Berlin'),
('LGW', 'Gatwick Airport', 'London', 'United Kingdom', 51.1537, -0.1821, 'Europe/London'),
('BCN', 'Barcelona-El Prat Airport', 'Barcelona', 'Spain', 41.2974, 2.0833, 'Europe/Madrid'),
('MXP', 'Malpensa Airport', 'Milan', 'Italy', 45.6306, 8.7231, 'Europe/Rome'),
('WAW', 'Warsaw Chopin Airport', 'Warsaw', 'Poland', 52.1657, 20.9671, 'Europe/Warsaw'),
('PRG', 'Václav Havel Airport Prague', 'Prague', 'Czech Republic', 50.1008, 14.2632, 'Europe/Prague'),
('BRU', 'Brussels Airport', 'Brussels', 'Belgium', 50.9014, 4.4844, 'Europe/Brussels'),
('GVA', 'Geneva Airport', 'Geneva', 'Switzerland', 46.2381, 6.1090, 'Europe/Zurich'),

-- Asia-Pacific additional hubs
('TPE', 'Taiwan Taoyuan International Airport', 'Taipei', 'Taiwan', 25.0797, 121.2342, 'Asia/Taipei'),
('HKG', 'Hong Kong International Airport', 'Hong Kong', 'Hong Kong', 22.3080, 113.9185, 'Asia/Hong_Kong'),
('KIX', 'Kansai International Airport', 'Osaka', 'Japan', 34.4347, 135.2441, 'Asia/Tokyo'),
('CTS', 'New Chitose Airport', 'Sapporo', 'Japan', 42.7747, 141.6920, 'Asia/Tokyo'),
('GMP', 'Gimpo International Airport', 'Seoul', 'South Korea', 37.5583, 126.7942, 'Asia/Seoul'),
('PUS', 'Gimhae International Airport', 'Busan', 'South Korea', 35.1795, 128.9382, 'Asia/Seoul'),
('CAN', 'Guangzhou Baiyun International Airport', 'Guangzhou', 'China', 23.3924, 113.2988, 'Asia/Shanghai'),
('CTU', 'Chengdu Shuangliu International Airport', 'Chengdu', 'China', 30.5785, 103.9487, 'Asia/Shanghai'),
('XIY', 'Xi''an Xianyang International Airport', 'Xi''an', 'China', 34.4471, 108.7519, 'Asia/Shanghai'),

-- Middle East & Africa
('RUH', 'King Khalid International Airport', 'Riyadh', 'Saudi Arabia', 24.9576, 46.6988, 'Asia/Riyadh'),
('JED', 'King Abdulaziz International Airport', 'Jeddah', 'Saudi Arabia', 21.6796, 39.1567, 'Asia/Riyadh'),
('KWI', 'Kuwait International Airport', 'Kuwait City', 'Kuwait', 29.2267, 47.9689, 'Asia/Kuwait'),
('BAH', 'Bahrain International Airport', 'Manama', 'Bahrain', 26.2708, 50.6336, 'Asia/Bahrain'),
('MCT', 'Muscat International Airport', 'Muscat', 'Oman', 23.5933, 58.2844, 'Asia/Muscat'),
('ADD', 'Addis Ababa Bole International Airport', 'Addis Ababa', 'Ethiopia', 8.9806, 38.7997, 'Africa/Addis_Ababa'),
('NBO', 'Jomo Kenyatta International Airport', 'Nairobi', 'Kenya', -1.3192, 36.9278, 'Africa/Nairobi'),
('LOS', 'Murtala Muhammed International Airport', 'Lagos', 'Nigeria', 6.5774, 3.3212, 'Africa/Lagos'),
('CAS', 'Mohammed V International Airport', 'Casablanca', 'Morocco', 33.3675, -7.5898, 'Africa/Casablanca'),
('TUN', 'Tunis-Carthage International Airport', 'Tunis', 'Tunisia', 36.8510, 10.2272, 'Africa/Tunis');
