const fs = require('fs');

function readDatabase(file) {
    const data = fs.readFileSync(`./data/${file}`);
    return JSON.parse(data);
}

exports.sync = (db) => new Promise(async (resolve, reject) => {
    try {
        await fs.promises.writeFile("./data/words.json", JSON.stringify(db, null, 2));

        const fileStats = await fs.promises.stat('./data/words.json');
        if (fileStats.size > 50) {

            for (let index = 2; index >= 0; index--) {
                try {
                    if (index === 2) {
                        await fs.promises.rm(`./data/words-${index}.bak`);
                    } else {
                        await fs.promises.rename(`./data/words-${index}.bak`, `./data/words-${index + 1}.bak`);
                    }
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        throw err;
                    }
                }
            }

            await fs.promises.copyFile('./data/words.json', './data/words-0.bak');
        }
        resolve();
    } catch (err) {
        reject(err);
    }
});

exports.synclb = (lb) => new Promise(async (resolve, reject) => {
    try {
        await fs.promises.writeFile("./data/logDb.json", JSON.stringify(lb, null, 2));
        resolve();
    } catch (err) {
        reject(err);
    }
});

exports.synccd = (cd) => new Promise(async (resolve, reject) => {
    try {
        await fs.promises.writeFile("./data/creds.json", JSON.stringify(cd, null, 2));
        resolve();
    } catch (err) {
        reject(err);   
    }
});

exports.syncre = (re) => new Promise(async (resolve, reject) => {
    try {
        await fs.promises.writeFile("./data/receipts.json", JSON.stringify(re, null, 2));
        resolve();
    } catch (err) {
        reject(err);   
    }
});

exports.db = readDatabase('words.json');
exports.lb = readDatabase('logDb.json');
exports.cd = readDatabase('creds.json');
exports.re = readDatabase('receipts.json');