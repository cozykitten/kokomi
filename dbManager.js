const fs = require('fs');

function readDatabase(file) {
    return JSON.parse(fs.readFileSync(file));
}

const sync = (db) => new Promise((resolve) => {
    fs.writeFile("./words.json", JSON.stringify(db, null, 2), err => {
        if (err) throw err;
        resolve();
    });
});

const synclb = (lb) => new Promise((resolve) => {
    fs.writeFile("./logDb.json", JSON.stringify(lb, null, 2), err => {
        if (err) throw err;
        resolve();
    });
});
    
const db = readDatabase('words.json');
const lb = readDatabase('logDb.json');

exports.db = db;
exports.lb = lb;
exports.sync = sync;
exports.synclb = synclb;