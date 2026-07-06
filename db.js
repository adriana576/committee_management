const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'srv2133.hstgr.io',
    user: 'u125391022_committee',
    password: 'xxxxxxxx',
    database: 'u125391022_committee_db',
    port: 3306
});

db.connect(err => {
    if(err){
        console.log(err);
    }else{
        console.log("Connected to Hostinger MySQL");
    }
});

module.exports = db;