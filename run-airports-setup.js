// Run airports database setup
const { initializeAirportsDatabase } = require('./database/airports-setup');

console.log('🚀 Starting airports database setup...');

initializeAirportsDatabase()
    .then((db) => {
        console.log('✅ Airports database initialized successfully!');
        if (db) {
            db.close();
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Failed to initialize airports database:', error);
        process.exit(1);
    });
