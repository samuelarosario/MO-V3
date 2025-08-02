// Database setup script for Security-MO
// Run this script to initialize the SQL Server database with airport data

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
    database: 'master', // Connect to master to create database
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 1433,
    
    options: {
        encrypt: false, // For local development
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 60000,
        connectionTimeout: 30000
    }
};

async function setupDatabase() {
    let pool = null;
    
    try {
        console.log('🗄️  Connecting to SQL Server...');
        console.log('Server:', config.server);
        
        // Connect to master database
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');
        
        // Create database if it doesn't exist
        const dbName = process.env.DB_NAME || 'SecurityMO';
        console.log(`🏗️  Creating database: ${dbName}`);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName}')
            BEGIN
                CREATE DATABASE [${dbName}]
            END
        `);
        
        console.log(`✅ Database ${dbName} created/verified`);
        
        // Close connection to master
        await pool.close();
        
        // Connect to our database
        const appConfig = { ...config, database: dbName };
        pool = await sql.connect(appConfig);
        console.log(`✅ Connected to ${dbName} database`);
        
        // Read and execute the airport initialization script
        console.log('📄 Reading airport database script...');
        const scriptPath = path.join(__dirname, 'init-airports.sql');
        const script = fs.readFileSync(scriptPath, 'utf8');
        
        console.log('🏗️  Executing airport database initialization...');
        
        // Split script by GO statements and execute each batch
        const batches = script.split(/\nGO\s*\n/);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                console.log(`   Executing batch ${i + 1}/${batches.length}...`);
                await pool.request().query(batch);
            }
        }
        
        console.log('✅ Airport database initialization completed!');
        
        // Test the setup
        console.log('🧪 Testing database setup...');
        const testResult = await pool.request()
            .input('SearchTerm', sql.NVarChar(100), 'Manila')
            .execute('SearchAirports');
            
        console.log(`✅ Test successful! Found ${testResult.recordset.length} airports for 'Manila'`);
        console.log('Sample result:', testResult.recordset[0]);
        
        await pool.close();
        console.log('🎉 Database setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.error('Stack:', error.stack);
        
        if (error.message.includes('Login failed')) {
            console.log('\n💡 Authentication Issue:');
            console.log('   - Make sure SQL Server is running');
            console.log('   - Try using Windows Authentication (leave DB_USER and DB_PASSWORD empty)');
            console.log('   - Or create a SQL Server user and update .env file');
        } else if (error.message.includes('server was not found')) {
            console.log('\n💡 Connection Issue:');
            console.log('   - Make sure SQL Server Express is installed and running');
            console.log('   - Check if the server name is correct: localhost\\SQLEXPRESS');
            console.log('   - Make sure SQL Server Browser service is running');
        }
        
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (closeError) {
                // Ignore close errors
            }
        }
    }
}

// Run setup
console.log('🚀 Starting Security-MO Database Setup...');
setupDatabase().then(() => {
    console.log('✨ Setup complete!');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
});
