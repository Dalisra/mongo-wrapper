const MongoClient = require('mongodb').MongoClient
const test = require('assert')
// Connection url
const url = 'mongodb://localhost:27017'
// Database Name
const dbName = 'test'
// Connect using MongoClient
MongoClient.connect(url, { useUnifiedTopology: true, useNewUrlParser: true }, function (err, client) {
    if (err) throw err
    // Use the admin database for the operation
    const adminDb = client.db(dbName).admin()
    // List all the available databases
    adminDb.listDatabases(function (err, dbs) {
        console.log(dbs)
        test.equal(null, err)
        test.ok(dbs.databases.length > 0)
        client.close()
    })
})