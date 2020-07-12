# mongo-wrapper
Simple mongodb wrapper.

## Install

```bash
npm install dalisra-mongo-wrapper -S
```

## Connecting to database

### With Default Options

```javascript
// Callback based:
const mongo = require("dalisra-mongo-wrapper")
// keep trying to connect untill success
mongo.connect(() => {
    // You are now connected to mongodb on localhost:27017 with "test" database as default
})

// Promise based:
mongo.connect().then(client => {
    // You are now connected to mongodb...
})

// In async function:
let client = await mongo.connect()
// You are now connected to mongodb..
```

### Define database

```javascript
const mongo = require("dalisra-mongo-wrapper")
// keep trying to connect untill success
mongo.connect({
    connectionString: "mongodb://localhost:27017", // as of 3.6 you dont need to provide database in connection string
    database: "foo"
}, (err, client) => {
    // You are now connected to mongodb on localhost:27017 with "foo" database as default
})
```

### With options

Default options that you can override are:
```javascript
const options = {
    connectionString: "mongodb://localhost:27017/test", //Generated automatically if not specified.
    protocol: "mongodb", // if connectionString is provided this options is ignored
    host: "localhost", // if connectionString is provided this options is ignored
    port: 27017, // if connectionString is provided this options is ignored
    database: "test", // default database to return, since 3.6 driver you can change database
    maxConnectAttempts: 0, //how many times to try before giving up, 0 = never giveup.
    connectRetryDelay: 5000, // how many miliseconds to wait after each failed attempt to connect
    reconnect: true, // what to do if connection to database closes. (on "disconnect" event)
    log:{
        debug: console.log,
        error: console.error
    },
    mongoClientOptions : {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
}
```
Once you override wanted options you can connect to database as follows:

```javascript
mongo.connectoToMongo(options).then(() => {
    // You are now successfully connected to database
}).catch(err => {
    //Reached maxConnectionAttempts, giving up..
})
```

## Helper methods

### Utility
```javascript
mongo.client() // <- MongoClient
mongo.db() // <- Mongo database pointer to default database
mongo.db("foo") // <- Change database and get database pointer
mongo.collection("bar") // <- Get collection pointer.
mongo.mongodb // <- Returns original MongoDb driver
mongo.ObjectID // <- Shortcut for ObjectID
mongo.getConnectionString() // <- Get connection string that has been used
mongo.close() // <- Close db connection
```

### Data
```javascript
mongo.saveData(collection, data, callback) // <- Shortcut to save (insert or update) data to database
mongo.clearData(collection, callback) // <- Clears all data in a collection
```

## Example Usage
```javascript
const mongo = require("dalisra-mongo-wrapper")

// keep trying to connect to mongodb on localhost with default parameters untill success
mongo.connect(async (err, client) => {
    if(err) throw err; // <- It is possible to config "give up conditions".

    // You are now connected to database and can start doing queries.
    await mongo.clearData("test") //deletes all data in collection "test".
    await mongo.saveData("test", {number: 123, name:"Product 123"})
    let data = await mongo.collection("test").find({}).toArray()
    console.log(data) // { _id: ObjectId(...), number: 123, name: "Product 123"}
    await mongo.close()
})
```

## Updates
* 3.1.2
    Better code coverage.
    Small bugfixes.
    Removed chai and sinon dev dependencies.
* 3.1.1
    Removed insertData -> use saveData.
    Removed updateData -> use saveData.
    Cleaned up.
* 3.1.0
    Cleaned up code.
    Updated libraries.
    Implemented promises.
* 3.0.0
    Updated packages to latest. Removed dependency to async library.
* 2.2.0
    Updated packages to latest.
    Fixed autoreconnect, changed some debug logging to warn / info.
