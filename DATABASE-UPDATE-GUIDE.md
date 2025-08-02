# Database Update Process Flow Documentation

## Overview
This system provides a comprehensive, schema-safe database update process for flight data. It maintains database integrity while allowing flexible data updates from multiple sources.

## 🏗️ System Architecture

### Core Components
1. **DatabaseUpdateManager** - Core update engine
2. **UpdateWorkflows** - Predefined update processes
3. **Configuration System** - Customizable settings
4. **Data Templates** - Sample input formats

### Key Features
- ✅ **Schema Protection** - Never modifies database structure
- ✅ **Automatic Backups** - Creates backups before any changes
- ✅ **Data Validation** - Ensures data quality
- ✅ **Multiple Sources** - JSON, CSV, API, predefined datasets
- ✅ **Logging System** - Tracks all operations
- ✅ **Rollback Support** - Restore from backups if needed

## 🚀 Quick Start Guide

### 1. Basic Usage
```bash
# Update Philippine Airlines flights
node update-workflows.js pr

# Update all Manila (MNL) flights
node update-workflows.js mnl

# Update from JSON file
node update-workflows.js file data-templates/sample-flights.json

# Complete database refresh
node update-workflows.js refresh
```

### 2. Using the Core Manager
```javascript
const DatabaseUpdateManager = require('./database-update-manager');

const manager = new DatabaseUpdateManager();
await manager.connect();
await manager.updateFlights('philippine-airlines', {
    airline: 'PR',
    origin: 'MNL',
    replaceExisting: true
});
await manager.close();
```

## 📊 Available Data Sources

### Built-in Sources
- **philippine-airlines** - Philippine Airlines (PR) flight schedules
- **cebu-pacific** - Cebu Pacific (5J) flight schedules
- **json-file** - Import from JSON file
- **csv-file** - Import from CSV file
- **api** - External API integration (placeholder)

### Adding New Sources
1. Add data source method to `DatabaseUpdateManager`
2. Update configuration in `update-config.json`
3. Create data template in `data-templates/`

## 🔧 Configuration

### Database Settings
```json
{
  "database": {
    "path": "./security-mo.db",
    "backupEnabled": true,
    "backupPath": "./backups/",
    "logPath": "./logs/"
  }
}
```

### Data Source Settings
```json
{
  "dataSources": {
    "philippine-airlines": {
      "enabled": true,
      "airlineCode": "PR",
      "airlineName": "Philippine Airlines",
      "updateFrequency": "daily"
    }
  }
}
```

## 📁 File Structure
```
├── database-update-manager.js    # Core update engine
├── update-workflows.js           # Predefined workflows
├── update-config.json           # Configuration file
├── data-templates/              # Sample data formats
│   ├── sample-flights.json
│   └── sample-flights.csv
├── backups/                     # Automatic backups
└── logs/                       # Update logs
```

## 🔄 Update Workflows

### Workflow 1: Single Airline Update
Updates flights for a specific airline with data validation and backup.

**Usage:** `node update-workflows.js pr`
**Process:**
1. Connect to database
2. Verify schema integrity
3. Create backup
4. Remove existing flights (if replace=true)
5. Insert new flight data
6. Generate report
7. Save log

### Workflow 2: Origin-based Update
Updates all flights from a specific origin airport.

**Usage:** `node update-workflows.js mnl`
**Process:**
1. Updates multiple airlines from MNL
2. Preserves existing data from other origins
3. Comprehensive validation

### Workflow 3: File Import
Imports flight data from external files.

**Usage:** `node update-workflows.js file path/to/data.json`
**Supported Formats:**
- JSON (array of flight objects)
- CSV (comma-separated values)

### Workflow 4: Complete Refresh
Clears all flight data and rebuilds from all sources.

**Usage:** `node update-workflows.js refresh`
**⚠️ Warning:** This removes ALL existing flight data

## 📝 Data Format Requirements

### Required Fields
- `flight_number` - Flight identifier (e.g., "PR101")
- `airline_code` - 2-3 letter airline code (e.g., "PR")
- `airline_name` - Full airline name
- `origin_code` - 3-letter origin airport code
- `destination_code` - 3-letter destination airport code
- `departure_time` - Time in HH:MM format
- `arrival_time` - Time in HH:MM format
- `duration_minutes` - Flight duration in minutes

### Optional Fields
- `aircraft_type` - Aircraft model
- `days_of_week` - Operating days (1111111 = daily)
- `effective_from` - Start date (YYYY-MM-DD)
- `effective_to` - End date (YYYY-MM-DD)

## 🛡️ Safety Features

### Schema Protection
- Never modifies table structure
- Validates table existence before operations
- Maintains referential integrity

### Automatic Backups
- Creates timestamped backups before changes
- Stores in `/backups/` directory
- Enables quick rollback if needed

### Data Validation
- Checks required fields
- Validates data types
- Filters invalid records
- Reports validation errors

### Operation Logging
- Logs all operations with timestamps
- Tracks success/failure counts
- Saves detailed reports
- Enables audit trails

## 🔍 Monitoring & Reports

### Update Reports Include:
- Total flights in database
- Airline breakdown with flight counts
- Top routes by frequency
- Operation success/error counts
- Backup locations
- Validation results

### Log Files
- Saved in `/logs/` directory
- JSON format for easy parsing
- Timestamped for tracking
- Include operation details

## ⚠️ Important Notes

### Schema Integrity
- **NEVER modify the database schema**
- The update system works within existing structure
- Add new airlines as data, not schema changes

### Backup Strategy
- Backups are created automatically
- Keep multiple backups for safety
- Test restore procedures regularly

### Data Sources
- Verify data quality before importing
- Use validation to catch errors
- Test with small datasets first

### Performance
- Large datasets may take time to process
- Consider batch processing for huge files
- Monitor disk space for backups/logs

## 🚨 Troubleshooting

### Common Issues
1. **"Missing required tables"** - Run database setup first
2. **"Backup failed"** - Check disk space and permissions
3. **"Validation errors"** - Review data format requirements
4. **"Database locked"** - Close other database connections

### Recovery
1. **Bad update:** Restore from backup in `/backups/`
2. **Corrupted data:** Use complete refresh workflow
3. **Missing data:** Check logs for operation details

## 🔄 Maintenance Schedule

### Recommended Updates
- **Daily:** Philippine Airlines schedules
- **Weekly:** Complete database refresh
- **Monthly:** Archive old logs and backups
- **Quarterly:** Review and update data sources

---

**Last Updated:** August 2, 2025
**Version:** 1.0.0
