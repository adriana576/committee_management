const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'u125391022_CommitteeMng',
  password: '@lesyA9480',
  database: 'u125391022_CMS',
  port: 3306
});

db.connect(err => {
  if(err) {
    console.log("Connection failed:", err.message);
  } else {
    console.log("Connected successfully");
  }
});

module.exports = db;