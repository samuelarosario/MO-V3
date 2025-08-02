# SerpAPI Integration Quick Start Guide

## 🚀 Overview
This guide helps you get started with the new SerpAPI integration that replaces AviationStack for flight data.

## 📋 What Changed
- **Before**: AviationStack API for live flight tracking
- **After**: SerpAPI with Google Flights & Google Search for comprehensive flight information
- **Benefits**: Better search capabilities, more comprehensive data, Google's reliable infrastructure

## 🔧 Setup Steps

### 1. Run Migration (if needed)
```bash
node migration-aviationstack-to-serpapi.js
```

### 2. Test SerpAPI Integration
```bash
# Comprehensive test
node test-serpapi-comprehensive.js

# Basic integration test  
node test-serpapi-integration.js
```

### 3. Update Database with SerpAPI
```bash
# Run database updater
node database-updater-serpapi.js

# Or use the test version
node test-serpapi-integration.js
```

### 4. Start Enhanced Server
```bash
node server.js
```

## 🌐 New API Endpoints

### SerpAPI Flight Search
```
GET /api/serpapi/search?origin=MNL&destination=CEB
GET /api/serpapi/search?origin=MNL&destination=CEB&date=2024-02-15
```

### Specific Flight Lookup
```
GET /api/serpapi/flight/PR216
GET /api/serpapi/flight/5J123
```

### Route Flight Search & Save
```
POST /api/serpapi/route/MNL/CEB
POST /api/serpapi/route/MNL/DVO
Body: { "date": "2024-02-15" } (optional)
```

### Database Operations
```
POST /api/serpapi/update          # Update database with SerpAPI
GET /api/serpapi/stats           # Get database statistics
GET /api/serpapi/history/PR216   # Get search history for flight
GET /api/serpapi/live           # Get SerpAPI live flights
```

## 🧪 Testing Commands

### Quick Flight Search
```bash
node query-pr216-serpapi.js
```

### API Testing with curl
```bash
# Test specific flight
curl "http://localhost:3000/api/serpapi/flight/PR216"

# Test route search
curl "http://localhost:3000/api/serpapi/search?origin=MNL&destination=CEB"

# Get statistics
curl "http://localhost:3000/api/serpapi/stats"

# Update database
curl -X POST "http://localhost:3000/api/serpapi/update"
```

## 📊 Database Tables

### New SerpAPI Tables
- `serpapi_flight_data` - Search results and extracted flight information
- `live_flights_serpapi` - Live flight data from Google Flights
- `serpapi_search_log` - API usage tracking and logging

### Preserved Tables
- `flights` - Original scheduled flight data
- `airports` - Airport information
- `live_flights` - Original AviationStack data (kept for reference)

## 🔍 Features

### SerpAPI Flight Searcher (`serpapi-flight-searcher.js`)
- Search specific flights by number
- Search flights by route (origin/destination)
- Extract flight information from search results
- Search airline information
- Rate limiting and error handling

### Database Updater (`database-updater-serpapi.js`)
- Safe database updates preserving existing data
- Batch processing with rate limiting
- Comprehensive error handling
- Statistics tracking

### Enhanced Server (`server.js`)
- All original endpoints preserved
- New SerpAPI endpoints added
- Enhanced API documentation
- Improved error handling

## 🔐 Security Features
- API key stored securely in `credentials.json`
- Rate limiting to respect API quotas
- Error handling without exposing sensitive data
- Backup creation before migrations

## 📈 Performance
- Efficient database queries with indexes
- Batch processing for bulk updates
- Caching of search results
- Graceful degradation on API failures

## 🚨 Troubleshooting

### Common Issues
1. **API Key Issues**: Check `credentials.json` has valid `serpapi_key`
2. **Rate Limiting**: SerpAPI has usage limits, add delays between requests
3. **Database Errors**: Run migration script to ensure tables exist
4. **No Results**: Some flights may not have data in Google search results

### Debug Commands
```bash
# Check database structure
sqlite3 security-mo.db ".tables"

# Check SerpAPI tables
sqlite3 security-mo.db "SELECT COUNT(*) FROM serpapi_flight_data;"

# Check API key
node -e "console.log(require('./credentials.json').serpapi_key ? 'Key exists' : 'No key')"
```

## 🎯 Migration Path

### Phase 1: Parallel Operation (Current)
- Both AviationStack and SerpAPI work together
- Original data preserved
- New SerpAPI data added alongside

### Phase 2: SerpAPI Primary (Recommended)
- Use SerpAPI as primary data source
- Keep AviationStack as fallback
- Gradually phase out AviationStack calls

### Phase 3: SerpAPI Only (Future)
- Remove AviationStack dependencies
- Clean up old code and tables
- Full SerpAPI integration

## 📝 Example Usage

### Search for Philippine Airlines flights
```javascript
const serpApi = new SerpAPIFlightSearcher();
const flights = await serpApi.searchFlights('MNL', 'CEB');
```

### Update database with latest data
```javascript
const updater = new SerpAPIatabaseUpdater();
const result = await updater.updateFlightDataFromSerpAPI();
```

### Query specific flight
```javascript
const flightInfo = await serpApi.searchSpecificFlight('PR216');
```

## 🎉 Success Indicators
- ✅ Migration completes without errors
- ✅ SerpAPI tests pass
- ✅ Server starts with new endpoints
- ✅ Database has new SerpAPI tables
- ✅ Flight searches return results
- ✅ API endpoints respond correctly

## 📞 Support
If you encounter issues:
1. Check the troubleshooting section above
2. Run the comprehensive test: `node test-serpapi-comprehensive.js`
3. Check server logs for detailed error messages
4. Verify API key and internet connectivity
