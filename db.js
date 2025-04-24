const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool with promise support
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mydb',
  waitForConnections: true,  // Allows for better connection handling
  connectionLimit: 10,       // Limits the number of connections
  queueLimit: 0      
});

// Use the promise API for queries
const db = pool.promise();

// Test the database connection
(async () => {
  try {
    const [rows] = await db.query('SELECT 1');
    console.log('Database connection successful:', rows);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1); // Exit the process if the connection fails
  }
})();

module.exports = db;