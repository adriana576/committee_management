const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST, // use private host
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT, // usually 3306
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();