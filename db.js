// db.js
const mysql = require('mysql2');

// Create a connection pool with promise support
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", 
  database: "mydb",
  waitForConnections: true,  // Allows for better connection handling
  connectionLimit: 10,       // Limits the number of connections
  queueLimit: 0      
});

// Use the promise API for queries
const db = pool.promise();  // This allows using async/await and promises

module.exports = db;
