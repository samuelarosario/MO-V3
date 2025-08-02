// Predefined Update Workflows
// Ready-to-use update processes for common scenarios

const DatabaseUpdateManager = require('./database-update-manager');
const OnlineFlightDataFetcher = require('./online-flight-fetcher');

class UpdateWorkflows {
    constructor() {
        this.manager = new DatabaseUpdateManager();
    }

    // Workflow 1: Update all Philippine Airlines flights
    async updatePhilippineAirlines() {
        console.log('🇵🇭 Starting Philippine Airlines update workflow...');
        
        try {
            await this.manager.connect();
            await this.manager.verifySchema();
            const backupPath = await this.manager.createBackup();
            
            const result = await this.manager.updateFlights('philippine-airlines', {
                airline: 'PR',
                replaceExisting: true,
                validateData: true
            });
            
            console.log(`\\n📊 Philippine Airlines Update Complete:`);
            console.log(`   • Inserted: ${result.inserted} flights`);
            console.log(`   • Errors: ${result.errors} flights`);
            console.log(`   • Backup: ${backupPath}`);
            
            await this.generateSummaryReport();
            
        } catch (error) {
            console.error('❌ Philippine Airlines update failed:', error.message);
        } finally {
            await this.manager.close();
        }
    }

    // Workflow 2: Update all flights from Manila (MNL)
    async updateManilaFlights() {
        console.log('🏙️  Starting Manila (MNL) flights update workflow...');
        
        try {
            await this.manager.connect();
            await this.manager.verifySchema();
            const backupPath = await this.manager.createBackup();
            
            // Update multiple airlines from MNL
            const airlines = ['philippine-airlines', 'cebu-pacific'];
            let totalInserted = 0;
            let totalErrors = 0;
            
            for (const airline of airlines) {
                const result = await this.manager.updateFlights(airline, {
                    origin: 'MNL',
                    replaceExisting: false, // Don't replace between airlines
                    validateData: true
                });
                
                totalInserted += result.inserted;
                totalErrors += result.errors;
            }
            
            console.log(`\\n📊 Manila Flights Update Complete:`);
            console.log(`   • Total Inserted: ${totalInserted} flights`);
            console.log(`   • Total Errors: ${totalErrors} flights`);
            console.log(`   • Backup: ${backupPath}`);
            
            await this.generateSummaryReport();
            
        } catch (error) {
            console.error('❌ Manila flights update failed:', error.message);
        } finally {
            await this.manager.close();
        }
    }

    // Workflow 3: Update from external file
    async updateFromFile(filePath, fileType = 'json') {
        console.log(`📁 Starting file update workflow: ${filePath}`);
        
        try {
            await this.manager.connect();
            await this.manager.verifySchema();
            const backupPath = await this.manager.createBackup();
            
            const result = await this.manager.updateFlights(`${fileType}-file`, {
                filePath: filePath,
                replaceExisting: false,
                validateData: true
            });
            
            console.log(`\\n📊 File Update Complete:`);
            console.log(`   • File: ${filePath}`);
            console.log(`   • Inserted: ${result.inserted} flights`);
            console.log(`   • Errors: ${result.errors} flights`);
            console.log(`   • Backup: ${backupPath}`);
            
            await this.generateSummaryReport();
            
        } catch (error) {
            console.error('❌ File update failed:', error.message);
        } finally {
            await this.manager.close();
        }
    }

    // Workflow 4: Complete database refresh
    async completeRefresh() {
        console.log('🔄 Starting complete database refresh workflow...');
        
        try {
            await this.manager.connect();
            await this.manager.verifySchema();
            const backupPath = await this.manager.createBackup();
            
            console.log('🗑️  Clearing existing flight data...');
            await this.clearAllFlights();
            
            // Load data from all sources
            const sources = ['philippine-airlines', 'cebu-pacific'];
            let totalInserted = 0;
            let totalErrors = 0;
            
            for (const source of sources) {
                console.log(`\\n🔄 Loading ${source} data...`);
                const result = await this.manager.updateFlights(source, {
                    replaceExisting: false,
                    validateData: true
                });
                
                totalInserted += result.inserted;
                totalErrors += result.errors;
            }
            
            console.log(`\\n📊 Complete Refresh Complete:`);
            console.log(`   • Total Inserted: ${totalInserted} flights`);
            console.log(`   • Total Errors: ${totalErrors} flights`);
            console.log(`   • Backup: ${backupPath}`);
            
            await this.generateSummaryReport();
            
        } catch (error) {
            console.error('❌ Complete refresh failed:', error.message);
        } finally {
            await this.manager.close();
        }
    }

    // Helper: Clear all flights
    async clearAllFlights() {
        return new Promise((resolve, reject) => {
            this.manager.db.run('DELETE FROM flights', [], (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✓ All flights cleared');
                    resolve();
                }
            });
        });
    }

    // Workflow 5: Update from online sources
    async updateFromOnlineSources() {
        console.log('🌍 Starting online sources update workflow...');
        
        const fetcher = new OnlineFlightDataFetcher();
        try {
            const result = await fetcher.updateFromOnlineSources();
            console.log('\\n✅ Online sources update completed successfully!');
            return result;
        } catch (error) {
            console.error('❌ Online sources update failed:', error.message);
            throw error;
        }
    }

    // Helper: Generate summary report
    async generateSummaryReport() {
        
        const report = await this.manager.generateReport();
        
        console.log('\\n=== DATABASE SUMMARY ===');
        console.log(`Total Flights: ${report.totalFlights[0].count}`);
        console.log(`Total Airports: ${report.totalAirports[0].count}`);
        
        console.log('\\n=== AIRLINES ===');
        report.airlineBreakdown.forEach(airline => {
            console.log(`${airline.airline_code} (${airline.airline_name}): ${airline.flight_count} flights`);
        });
        
        console.log('\\n=== TOP ROUTES ===');
        report.routeBreakdown.forEach(route => {
            console.log(`${route.origin_code} → ${route.destination_code}: ${route.flight_count} flights`);
        });
        
        await this.manager.saveUpdateLog();
    }
}

// Command line interface
async function main() {
    const workflow = process.argv[2];
    const param = process.argv[3];
    
    const updater = new UpdateWorkflows();
    
    switch (workflow) {
        case 'pr':
        case 'philippine-airlines':
            await updater.updatePhilippineAirlines();
            break;
            
        case 'mnl':
        case 'manila':
            await updater.updateManilaFlights();
            break;
            
        case 'file':
            if (!param) {
                console.error('❌ File path required. Usage: node update-workflows.js file <path>');
                process.exit(1);
            }
            await updater.updateFromFile(param);
            break;
            
        case 'refresh':
        case 'complete':
            await updater.completeRefresh();
            break;
            
        case 'online':
        case 'fetch':
            await updater.updateFromOnlineSources();
            break;
            
        default:
            console.log('📖 Available update workflows:');
            console.log('   node update-workflows.js pr              - Update Philippine Airlines');
            console.log('   node update-workflows.js mnl             - Update Manila flights');
            console.log('   node update-workflows.js file <path>     - Update from file');
            console.log('   node update-workflows.js refresh         - Complete database refresh');
            console.log('   node update-workflows.js online          - Update from online sources');
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = UpdateWorkflows;
