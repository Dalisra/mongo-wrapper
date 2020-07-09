const mongo = require('../index')

mongo.connectToMongo({
    database: null
}).then(client => {
    // Use local variable:
    // return client.db().admin().listDatabases()

    // Or use global mongo variable:
    return mongo.db().admin().listDatabases()
}).then(resp => {
    console.log("Promise Based: " + JSON.stringify(resp))
    // make sure to close with global mongo object to remove listeners, otherwise it will reconnect automatically.
    mongo.close()

}).then(() => {
    mongo.connectToMongo({}, (err, client) => {
        client.db().admin().listDatabases((err, resp) => {
            if (err) return console.error("Failed with error: ", err)
            console.log("Callback Based: " + JSON.stringify(resp))
            mongo.close(() => {
                // Doing timeout so you can turn off mongodb server, and test for reconnects.
                console.log("Sleeping for 5 seconds.")
                setTimeout(async () => {
                    try {
                        let client = await mongo.connectToMongo()
                        let resp = await mongo.db().admin().listDatabases()
                        console.log("async/await Based: " + JSON.stringify(resp))
                        await mongo.close()
                    } catch (err) {
                        console.error("Failed with error:", err)
                    }
                }, 5000)

            })
        })
    })
}).catch(err => console.error("Failed with error: ", err))