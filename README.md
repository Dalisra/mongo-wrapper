# mongo-wrapper
Simple mongodb wrapper

Supports mongodb 3.6 features

## Install

```bash
npm install dalisra-mongo-wrapper -S
```

## Connecting to database

### Default

```javascript
const mongo = require('dalisra-mongo-wrapper')
// keep trying to connect untill success
mongo.connectToMongo(() => {
    // You are now connected to 'test' database
})
```

### With connection string
```javascript
mongo.connectToMongo("mongodb://localhost:27017/foo", () => {
    // You are now connected to 'foo' database
})
```

### With advanced configuration
```javascript
mongo.connectoToMongo({
    connectionString: "mongodb://localhost:27017/test",
    maxConnectAttempts: 0, //how many times to try before giving up, 0 = never giveup.
    connectRetryDelay: 5000, // how many miliseconds to wait after each failed attempt to connect
    afterConnect: function(client, callback){
        //TODO: do something with the client before rest of the application gets access to it.
        callback()
    }
}, (err) => {
    if(err) {
        console.log("Reached maxConnectionAttempts, giving up..")
        throw err
    }
    
    // You are now connected to database
})
```
## Helper methods

### Utility
```javascript
mongo.client() // <- MongoClient
mongo.db() // <- Mongo database pointer.
mongo.db('foo') // <- Change database and get database pointer
mongo.collection('bar') // <- Get collection pointer.
mongo.mongodb // <- Returns original MongoDb driver
mongo.ObjectID // <- Shortcut for ObjectID
mongo.getConnectionString() // <- Get connection string that has been used
mongo.close() // <- Close db connection
```

### Data
```javascript
mongo.saveData(collection, data, callback) // <- Shortcut to save (insert or update) data to database
mongo.updateData(collection, data, callback) // <- Updates data without resetting other fields. (_id field must be supplied)
mongo.insertData(collection, data, callback) // <- Inserts new data to database. 
mongo.clearData(collection, callback) // <- Clears all data in a collection
```


## Example Usage
```javascript
const mongo = require("dalisra-mongo-wrapper")
const async = require('async')

// keep trying to connect to mongodb on localhost with default parameters untill success
mongo.connectToMongo((err) => {
    if(err) throw err; // <- It is possible to config 'give up conditions'.

    // You are now connected to database and can start doing queries.
    async.waterfall([
        (next) => {
            // lets clear all the data in products collection
            mongo.clearData('products', (err, result) => {
                if(err) console.error("MongoDb returned error: ", err)
                console.log("Result: " + JSON.stringify(result))
                next()
            })
        },
        (next) => {
            // lets add a product
            mongo.saveData('products', {number: 123, name:"Product 123"}, (err, result) => {
                if(err) console.error("MongoDb returned error: ", err)
                console.log("Products created: " + JSON.stringify(result.ops))
                next()
            })
        },
        (next) => {
            // lets find all products in products collection
            mongo.collection('products').find({}).toArray((err, products) => {
                if(err) console.error("MongoDb returned error: ", err)
                console.log("Got following products from database: " + JSON.stringify(products))
                next()
            })
        }
    ], (err) => {
        mongo.client().close();
    })
})
```

## Planning / under consideration:
```javascript
* mongo.findAll('collection')
* mongo.find('collection', {foo:'bar'})
* mongo.findOne('collection', {_id: '123'})
* mongo.deleteAll('collection')
* mongo.delete('collection', {foo:'bar'})
* mongo.deleteOne('collection', {_id:'123'})
```