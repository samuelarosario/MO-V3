// Database configuration for SQL Server Express
const sql = require('mssql');

// SQL Server connection configuration
const dbConfig = {
    // Local SQL Server Express configuration
    server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
    database: process.env.DB_NAME || 'SecurityMO',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 1433,
    
    options: {
        encrypt: process.env.NODE_ENV === 'production', // Use encryption in production (Azure)
        trustServerCertificate: true, // For local development
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
    },
    
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Azure SQL Database configuration (for production)
const azureDbConfig = {
    server: process.env.AZURE_DB_SERVER,
    database: process.env.AZURE_DB_NAME,
    user: process.env.AZURE_DB_USER,
    password: process.env.AZURE_DB_PASSWORD,
    port: 1433,
    
    options: {
        encrypt: true, // Always use encryption for Azure
        trustServerCertificate: false,
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
    },
    
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Connection pool
let pool = null;

// Initialize database connection
async function initializeDatabase() {
    try {
        console.log('🗄️  Initializing SQL Server connection...');
        
        // Use Azure config in production, local config in development
        const config = process.env.NODE_ENV === 'production' && process.env.AZURE_DB_SERVER 
            ? azureDbConfig 
            : dbConfig;
            
        console.log('Database Config:', {
            server: config.server,
            database: config.database,
            user: config.user ? '***configured***' : 'not set',
            encrypt: config.options.encrypt
        });
        
        pool = await sql.connect(config);
        console.log('✅ SQL Server connected successfully');
        
        // Test the connection
        const result = await pool.request().query('SELECT 1 as test');
        console.log('✅ Database connection test passed');
        
        return pool;
    } catch (error) {
        console.error('❌ SQL Server connection failed:', error.message);
        console.log('💡 Falling back to in-memory airport data...');
        return null;
    }
}

// Get database connection pool
function getPool() {
    return pool;
}

// Search airports using SQL Server
async function searchAirportsSQL(query) {
    try {
        if (!pool) {
            throw new Error('Database not connected');
        }
        
        const request = pool.request();
        request.input('SearchTerm', sql.NVarChar(100), query);
        
        const result = await request.execute('SearchAirports');
        
        return result.recordset.map(row => ({
            code: row.code,
            name: row.name,
            city: row.city,
            country: row.country,
            latitude: row.latitude,
            longitude: row.longitude,
            timezone: row.timezone
        }));
    } catch (error) {
        console.error('SQL Airport Search Error:', error.message);
        throw error;
    }
}

// Close database connection
async function closeDatabase() {
    try {
        if (pool) {
            await pool.close();
            console.log('🗄️  SQL Server connection closed');
        }
    } catch (error) {
        console.error('Error closing database:', error.message);
    }
}

module.exports = {
    initializeDatabase,
    getPool,
    searchAirportsSQL,
    closeDatabase,
    sql
};
