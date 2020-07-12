const log = {
    error: console.error,
    debug: console.log
}
const mongodb = require("mongodb")
const MongoClient = mongodb.MongoClient
const sleep = async msec => {
    return new Promise(resolve => setTimeout(resolve, msec))
}
/**
 * Default config contains all the defaults.
 * @type {Object}
 */
const defaultConfig = {
    //connectionString: "mongodb://localhost:27017/test", //Generated automatically if not specified.
    protocol: "mongodb", // if connectionString is provided this options is ignored
    host: "localhost", // if connectionString is provided this options is ignored
    port: 27017, // if connectionString is provided this options is ignored
    database: "test", // default database to return, in 3.6 driver you can change database
    maxConnectAttempts: 0, //how many times to try before giving up, 0 = never giveup.
    connectRetryDelay: 5000, // how many miliseconds to wait after each failed attempt to connect
    reconnect: true, // what to do if connection to database closes. (on "close" event)
    log,
    mongoClientOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
}
let _client = null
/**
 * Promise (resolved) or callback will be called only once it has successfully connected to database.
 * @callback mongoCallback
 * @param {Error} error - if no error this one will be null.
 * @param {Client} MongoClient - on success returns mongoClient, can be ignored.
 */

/** Method that tries to connect to mongo, and retries if it fails.
 * callback will be called only once it has successfully connected to database.
 * If no callback a promise will be returned instead.
 * Possible config options check: const _defaultConfig
 * @param {defaultConfig|String} [defaultConfig] - config object or mongodb connection string
 * @param {mongoCallback} [callback]
 * @return {Promise} If no callback specified a promise is returned.
 */

const connectToMongo = async (config, callback) => {
    if (typeof config === "function" && !callback) {
        callback = config
        config = {}
    }
    if (typeof config === "string") config = {connectionString: config}
    mongo.setConfig(config)

    let url = mongo.getConnectionString()
    let client = new MongoClient(url, mongo.config.mongoClientOptions)
    if (mongo.config.maxConnectAttempts === 0 || mongo.config.maxConnectAttempts > mongo.currentAttemptNr) {
        try {
            mongo.currentAttemptNr++
            log.debug("Trying to connect, attempt nr: " + mongo.currentAttemptNr + "")
            //connect to database
            await client.connect()
            client.on("disconnected", mongo.reconnect)
            _client = client
            log.debug("Successfully finishing mongo connect method after " + mongo.currentAttemptNr + " tries.")
            mongo.currentAttemptNr = 0
            if (callback) callback(null, _client)
            else return _client
        } catch (err) {
            console.error("Cannot connect to MongoDB! Check that mongo is running..", err)
            await sleep(mongo.config.connectRetryDelay)

            if (callback) return connectToMongo(config, callback)
            else return await mongo.connect()
        }
    } else {
        console.error("Connection to mongoDB failed and will not try to connect anymore after " + mongo.currentAttemptNr + " retries. Restart needed!")
        let err = new Error("Maximum connection attempts reached, giving up.")
        if(callback) return callback(err)
        else throw err
    }
}

const mongo = {
    connectToMongo,
    connect: connectToMongo, //alias
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
                mongo.config.mongoClientOptions = Object.assign({}, defaultConfig.mongoClientOptions, mongo.config.mongoClientOptions, config.mongoClientOptions)
                delete config.mongoClientOptions
            }
            mongo.config = Object.assign({}, defaultConfig, mongo.config, config)
        }
        else mongo.config = Object.assign({}, defaultConfig, mongo.config)
    },
    reconnect: () => {
        if(mongo.config.reconnect){
            console.log("Lost connection to Database, trying to reconnect.")
            if(mongo.client()) mongo.client().removeListener("disconnected", mongo.reconnect)
            mongo.connectToMongo()
        }
    },
    client: () => _client,
    db: database => mongo.client() ? mongo.client().db(database) : null,
    collection: collection => mongo.db() ? mongo.db().collection(collection) : null,
    close: (force, callback) => mongo.client().close(force, callback),
    mongodb: mongodb,
    ObjectID: mongodb.ObjectID,
    getConnectionString: () => {
        if (!mongo.config.connectionString) mongo.config.connectionString = (mongo.config.protocol || defaultConfig.protocol) + "://" + (mongo.config.host || defaultConfig.host) + ":" + (mongo.config.port || defaultConfig.port) + "/" + (mongo.config.database || defaultConfig.database)
        return mongo.config.connectionString
    },
    resetConfig: () => { mongo.config = Object.assign({}, defaultConfig) },

    /**
     * Handy shortcut to insert or update data (unordered) for one or many object(s).
     * @param collection {String} name of the collection to instert to.
     * @param data {JSON|array} single Json object or array of Json objects.
     * @param {Collection~bulkWriteOpCallback} [callback] The command result callback
     * @return {Promise} - If no callback, promise is returned.
     */
    saveData: (collection, data, callback) => {
        //if data that we want to save is an array and has more than one item we itterate and save them in batch job.
        if (Array.isArray(data) && data.length > 1) {
            let operations = []
            for (let i in data) {
                let item = data[i]
                if (item._id) operations.push({updateOne: {filter:{_id:mongo.ObjectID(item._id)}}, update:{$set: item}, upsert:true })
                else operations.push({insertOne: {document: item} })
            }
            return mongo.collection(collection).bulkWrite(operations, {ordered:false}, callback)
        }
        //if it is an array, is must have only one item, lets get this item out of the array
        if (Array.isArray(data)) data = data[0]
        // save single item to db
        //if _id is specified, we try to save it to database by matching _id and using upsert function
        if (data._id) return mongo.collection(collection).updateOne({"_id": data._id}, {$set:data}, {"upsert": true}, callback)
        else return mongo.collection(collection).insertOne(data, callback) //if it does not have _id we just insert it (insert will generate _id)
    },
    /** Handy shortcust to clear data in one collection */
    clearData: (collection, callback) => {
        return mongo.collection(collection).deleteMany({}, callback)
    }
}
module.exports = mongo