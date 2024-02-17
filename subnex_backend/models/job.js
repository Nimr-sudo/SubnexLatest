const firedb = require('./startup/db.js');
const Job = firedb.firestore.collection("Jobs");

module.exports = Job;
