# Database Update System - Quick Reference

## 🚀 One-Command Updates

### Update Specific Airlines
```bash
node update-workflows.js pr              # Philippine Airlines only
node update-workflows.js mnl             # All flights from Manila
```

### Import from Files
```bash
node update-workflows.js file data-templates/sample-flights.json
node update-workflows.js file data-templates/sample-flights.csv
```

### Complete Operations
```bash
node update-workflows.js refresh         # Complete database refresh
```

## 📁 System Files Created

### Core System
- `database-update-manager.js` - Main update engine
- `update-workflows.js` - Predefined workflows
- `update-config.json` - Configuration settings

### Documentation & Templates
- `DATABASE-UPDATE-GUIDE.md` - Complete documentation
- `data-templates/sample-flights.json` - JSON template
- `data-templates/sample-flights.csv` - CSV template

### Generated Folders
- `backups/` - Automatic database backups
- `logs/` - Operation logs and reports

## ✅ Key Features Implemented

### Safety First
- ✅ Schema protection (never modifies structure)
- ✅ Automatic backups before changes
- ✅ Data validation and error handling
- ✅ Comprehensive logging

### Flexibility
- ✅ Multiple data sources (JSON, CSV, built-in)
- ✅ Configurable update options
- ✅ Selective updates (by airline, origin, etc.)
- ✅ Complete refresh capability

### Monitoring
- ✅ Detailed operation reports
- ✅ Database statistics after updates
- ✅ Success/error tracking
- ✅ Audit trail maintenance

## 🔄 Current Status
- Database contains: 22 total flights
- Philippine Airlines: 3 flights updated
- System fully operational and tested
- All safety features active

---
Ready for production use! 🎉
