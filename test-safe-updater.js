const DatabaseUpdater = require('./database-updater-safe');

console.log('🚀 Testing Safe Database Updater...\n');

const updater = new DatabaseUpdater();

updater.updateDatabase()
    .then(() => {
        console.log('\n✅ Safe database update test completed successfully!');
    })
    .catch(err => {
        console.error('\n❌ Update failed:', err.message);
    });
