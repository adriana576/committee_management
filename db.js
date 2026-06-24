const mysql = require('mysql2');

console.log("MYSQL HOST:", process.env.MYSQL_HOST);
console.log("MYSQL USER:", process.env.MYSQL_USER);

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  port: 3306,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool.promise();