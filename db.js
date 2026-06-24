const mysql = require('mysql2');

// Use the public MySQL host and credentials from Railway
const pool = mysql.createPool({
  host: "reseau.proxy.rlwy.net",       // Public MySQL host from Railway
  user: "root",                        // MySQL user
  password: "@syA4789463",             // MySQL password
  database: "railway",                 // MySQL database name
  port: 3306,                          // MySQL port
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }   // Required if TLS is enabled
});

console.log("MYSQL HOST:", pool.config.connectionConfig.host);
console.log("MYSQL USER:", pool.config.connectionConfig.user);

module.exports = pool.promise();