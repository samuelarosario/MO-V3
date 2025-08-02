// Run flights database setup
const { initializeFlightsDatabase } = require('./database/flights-setup');

console.log('🚀 Starting flights database setup...');

initializeFlightsDatabase()
    .then((db) => {
        console.log('✅ Flights database initialized successfully!');
        if (db) {
            db.close();
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Failed to initialize flights database:', error);
        process.exit(1);
    });
