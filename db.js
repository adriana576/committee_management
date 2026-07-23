const mysql = require('mysql2');
require('dotenv').config(); // Make sure dotenv is installed

const db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
});

db.connect(err => {
    if(err){
        console.error("Error connecting to Hostinger MySQL:", err);
    } else {
        console.log("Connected to Hostinger MySQL");
    }
});

module.exports = db;