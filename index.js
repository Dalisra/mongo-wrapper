const log = {
    error: console.error,
    debug: console.log
}
const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient

const defaultConfig = {
    //connectionString: "mongodb://localhost:27017/test", //Generated automatically if not specified.
    protocol: "mongodb", // if connectionString is provided this options is ignored
    host: 'localhost', // if connectionString is provided this options is ignored
    port: 27017, // if connectionString is provided this options is ignored
    database: 'test', // default database to return, in 3.6 driver you can change database
    maxConnectAttempts: 0, //how many times to try before giving up, 0 = never giveup.
    connectRetryDelay: 5000, // how many miliseconds to wait after each failed attempt to connect
    reconnect: true, // what to do if connection to database closes. (on 'close' event)
    log,
    mongoClientOptions : {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
}

let _client = null
const sleep = async msec => {
    return new Promise(resolve => setTimeout(resolve, msec))
}

const mongoWrapper = {
    currentAttemptNr: 0,
    config: {},
    defaultConfig,
    setConfig: config => {
        if (config) {
            if (config.afterConnect && typeof config.afterConnect !== "function") {
                delete config.afterConnect
                console.log("WARN: config.afterConnect should be a function. Ignoring.")
            }
            if (config.connectRetryDelay && typeof config.connectRetryDelay !== "number") {
                delete config.connectRetryDelay
                console.log("WARN: config.connectRetryDelay should be a number. Ignoring.")
            }
            if (config.maxConnectAttempts && typeof config.maxConnectAttempts !== "number") {
                delete config.maxConnectAttempts
                console.log("WARN: config.maxConnectAttempts should be a number. Ignoring.")
            }
            if (config.log) {
                if (config.log.error) log.error = config.log.error
                if (config.log && config.log.debug) log.debug = config.log.debug
                delete config.log
            }
            if(config.mongoClientOptions){
                mongoWrapper.config.mongoClientOptions = Object.assign({}, defaultConfig.mongoClientOptions, mongoWrapper.config.mongoClientOptions, config.mongoClientOptions)
                delete config.mongoClientOptions
            }
            mongoWrapper.config = Object.assign({}, defaultConfig, mongoWrapper.config, config)
        }
        else mongoWrapper.config = Object.assign({}, defaultConfig, mongoWrapper.config)
    },

    /** Method that tries to connect to mongo, and retries if it fails.
     * callback will be called only once it has successfully connected to database.
     * If no callback a promise will be returned instead.
     * Possible config options check: const _defaultConfig
     * @param {Object|String} [config=_defaultConfig] - config object or mongodb connection string
     * @param {mongoWrapperCallback} [callback]
     * @return {Promise} If no callback specified a promise is returned.
     */
    connectToMongo: (config, callback) => {
        if (typeof config === "function" && !callback) {
            callback = config
            config = {}
        }
        if (typeof config === "string") config = {connectionString: config}
        mongoWrapper.setConfig(config)
        return mongoWrapper.connect(callback)
    },

    /** Main method to connect to server,
     * usually you should run this method once at the start of the app
     * if it succeeds to connect then you don't need to run this anymore.
     *
     * If it fails to connect, you might need to wait and try to reconnect some time later.
     *
     * If connection breaks for some reason, application also might want to reconnect using this method.
     * @param callback
     */
    connect: async callback => {
        let url = mongoWrapper.getConnectionString()
        let client = new MongoClient(url, mongoWrapper.config.mongoConfig)
        if (mongoWrapper.config.maxConnectAttempts === 0 || mongoWrapper.config.maxConnectAttempts > mongoWrapper.currentAttemptNr) {
            try {
                mongoWrapper.currentAttemptNr++
                log.debug("Trying to connect, attempt nr: " + mongoWrapper.currentAttemptNr + "")
                //connect to database
                await client.connect()
                client.on('disconnected', mongoWrapper.reconnect)
                _client = client
                log.debug("Successfully finishing mongo connect method after " + mongoWrapper.currentAttemptNr + " tries.")
                mongoWrapper.currentAttemptNr = 0
                if (callback) callback(null, _client)
                else return _client
            } catch (err) {
                console.error("Cannot connect to MongoDB! Check that mongo is running..", err)
                await sleep(mongoWrapper.config.connectRetryDelay)

                if (callback) return mongoWrapper.connect(callback)
                else return await mongoWrapper.connect()
            }
        } else {
            console.error("Connection to mongoDB failed and will not try to connect anymore after " + mongoWrapper.currentAttemptNr + " retries. Restart needed!")
            let err = new Error("Maximum connection attempts reached, giving up.")
            if(callback) return callback(err)
            else throw err
        }
    },
    reconnect: () => {
        if(mongoWrapper.config.reconnect){
            console.log("Lost connection to Database, trying to reconnect.")
            if(mongoWrapper.client()) mongoWrapper.client().removeListener('disconnected', mongoWrapper.reconnect)
            mongoWrapper.connectToMongo()
        }
    },
    client: () => _client,
    db: database => mongoWrapper.client() ? mongoWrapper.client().db(database) : null,
    collection: collection => mongoWrapper.db() ? mongoWrapper.db().collection(collection) : null,
    close: (force, callback) => mongoWrapper.client().close(force, callback),
    mongodb: mongodb,
    ObjectID: mongodb.ObjectID,
    getConnectionString: () => {
        if (!mongoWrapper.config.connectionString) mongoWrapper.config.connectionString = (mongoWrapper.config.protocol || defaultConfig.protocol) + "://" + (mongoWrapper.config.host || defaultConfig.host) + ":" + (mongoWrapper.config.port || defaultConfig.port) + "/" + (mongoWrapper.config.database || defaultConfig.database)
        return mongoWrapper.config.connectionString
    },
    resetConfig: () => { mongoWrapper.config = Object.assign({}, defaultConfig) },
    /**
     * Handy shortcut to insert or replace data for one or many object(s)
     * @param collection {String} name of the collection to instert to.
     * @param data {JSON|array} single Json object or array of Json objects.
     * @param callback {Promise} - returns err as first param and result as second.
     * Check state of result
     * assert.equal(2, result.nInserted)
     * assert.equal(1, result.nUpserted)
     * assert.equal(1, result.nMatched)
     * assert.ok(1 == result.nModified || result.nModified == null)
     * assert.equal(1, result.nRemoved)
     * var upserts = result.getUpsertedIds()
     * assert.equal(1, upserts.length)
     * assert.equal(2, upserts[0].index)
     * assert.ok(upserts[0]._id != null)
     * var upsert = result.getUpsertedIdAt(0)
     * assert.equal(2, upsert.index)
     * assert.ok(upsert._id != null)
     */
    saveData: (collection, data, callback) => {
        //if data that we want to save is an array and has more than one item we itterate and save them in batch job.
        if (data instanceof Array && data.length > 1) {
            var batch = mongoWrapper.collection(collection).initializeUnorderedBulkOp({useLegacyOps: true})
            for (var i in data) {
                var item = data[i]
                if (item._id) batch.find({'_id': item._id}).upsert().updateOne(item)
                else batch.insert(item)
            }
            return batch.execute(callback)
        }
        //if it is an array, is must have only one item, lets get this item out of the array
        if (data instanceof Array) data = data[0]
        // save single item to db
        //if _id is specified, we try to save it to database by matching _id and using upsert function
        if (data._id) return mongoWrapper.collection(collection).replaceOne({'_id': data._id}, data, {'upsert': true}, callback)
        else return mongoWrapper.collection(collection).insertOne(data, callback) //if it does not have _id we just insert it (insert will generate _id)
    },
    /**
     * Updates data without resetting other fields.
     */
    updateData: (collection, data, callback) => {
        if (data instanceof Array) return callback(new Error("Arrays are not supported yet for updating"))
        if (!data._id) return callback(new Error("Missing ID.."))

        return mongoWrapper.collection(collection).findOneAndUpdate({_id: data._id}, {$set: data}, {returnOriginal: false, upsert: true}, callback)
    },
    /**
     * Handy shortcut to insert new row(s) into mongo db
     * @param collection {String} name of the collection to instert to.
     * @param data {JSON} single Json object.
     * @param callback {Promise} - returns err as first param and result as second.
     */
    insertData: (collection, data, callback) => {
        if (data instanceof Array) {
            return mongoWrapper.collection(collection).insertMany(data, callback)
        } else {
            return  mongoWrapper.collection(collection).insertOne(data, callback)
        }
    },
    /** Handy shortcust to clear data in one collection */
    clearData: (collection, callback) => {
        return mongoWrapper.collection(collection).deleteMany({}, callback)
    }
}
module.exports = mongoWrapper

/**
 * Promise or callback will be called only once it has successfully connected to database.
 * @callback mongoWrapperCallback
 * @param {Error} error - if no error this one will be null.
 * @param {Client} MongoClient - on success returns mongoClient, can be ignored.
 */