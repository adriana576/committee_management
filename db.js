const mysql = require('mysql2');

// Create connection to Railway MySQL
const connection = mysql.createConnection({
  host: process.env.RAILWAY_PRIVATE_DOMAIN, // Railway internal host
  user: process.env.DB_USER,                // DB user from Railway
  password: process.env.DB_PASSWORD,        // DB password from Railway
  database: process.env.DB_NAME,            // DB name from Railway
  port: process.env.DB_PORT || 3306         // Usually 3306
});

// Connect
connection.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to Railway MySQL database');
});

module.exports = connection;