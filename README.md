# Security-MO Flight Search Database System v3.0

A comprehensive flight search database system with airports and flight route data, built with SQLite and Node.js.

## Features

- **85 International Airports** with detailed information
- **31 Flight Routes** with comprehensive scheduling data
- **RESTful API** for flight and airport searches
- **SQLite Database** for fast local operations
- **Real-time Search** capabilities

## Database Schema

### Airports Table
- Airport codes (IATA 3-letter codes)
- Airport names and locations
- Geographic coordinates
- Timezone information
- 85 major international airports

### Flights Table
- Flight numbers and airline information
- Route information (origin/destination)
- Schedule data (departure/arrival times)
- Aircraft types and operational days
- 31 comprehensive flight routes

### Flight Schedules Table
- Date-specific flight instances
- Real-time status tracking
- Delay information
- Gate assignments

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up databases:**
   ```bash
   npm run setup
   ```

3. **Test the database:**
   ```bash
   npm run test-db
   ```

4. **Start the API server:**
   ```bash
   npm start
   ```

The API will be available at `http://localhost:3000`

## API Endpoints

### Base URL: `http://localhost:3000`

- **GET /** - API information and status
- **GET /api/stats** - Database statistics
- **GET /api/airports** - List all airports
  - Query params: `search`, `country`, `limit`
- **GET /api/airports/:code** - Get specific airport by code
- **GET /api/flights** - Search flights
  - Query params: `origin`, `destination`, `airline`, `limit`
- **GET /api/search** - Flight route search
  - Query params: `from`, `to`, `date`

### Example Requests

```bash
# Get all airports
curl "http://localhost:3000/api/airports"

# Search airports by name/code
curl "http://localhost:3000/api/airports?search=Manila"

# Get specific airport
curl "http://localhost:3000/api/airports/MNL"

# Search flights from Manila to LAX
curl "http://localhost:3000/api/search?from=MNL&to=LAX"

# Get database statistics
curl "http://localhost:3000/api/stats"
```

## Database Files

- `security-mo.db` - Main SQLite database containing all data
- `database/flights-schema.sql` - Flight tables schema
- `database/airports-sqlite.sql` - Airport data initialization

## Scripts

- `npm start` - Start the API server
- `npm run setup` - Initialize both databases
- `npm run setup-flights` - Setup flights database only
- `npm run setup-airports` - Setup airports database only  
- `npm run test-db` - Run database tests
- `npm run dev` - Start server with nodemon (development)

## Sample Data

### Airlines Included
- Philippine Airlines (12 routes)
- Air Niugini (9 routes)
- Virgin Australia (2 routes)
- Singapore Airlines (2 routes)
- Qantas (2 routes)
- Jetstar Airways (2 routes)
- Cathay Pacific (2 routes)

### Major Airports Included
- MNL - Manila, Philippines
- LAX - Los Angeles, USA
- LHR - London Heathrow, UK
- NRT - Tokyo Narita, Japan
- SYD - Sydney, Australia
- SIN - Singapore Changi
- HKG - Hong Kong
- And 78 more international airports

## Development

The system uses SQLite for local development, making it easy to set up and run without external database dependencies.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Server    │ ←→ │  SQLite Database │ ←→ │  Flight Search  │
│   (Express.js)  │    │  (security-mo.db)│    │   Frontend      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## License

MIT License - See LICENSE file for details.

---

**Security-MO Team**  
Version 3.0.0 - August 2025
