var log = {
    error: console.error,
    debug: console.log,
    warn: console.log,
    fatal: console.error
}
var mongodb = require('mongodb')
var MongoClient = mongodb.MongoClient
var async = require('async')

var _currentAttemptNr = 0
var _currentDatabase = null
var _client = null
var _config = {}
var _defaultConfig = {
    //connectionString: "mongodb://localhost:27017/test", //HOST and PORT is ignored when using this one.
    HOST: 'localhost',
    PORT: 27017,
    DATABASE: 'test',
    maxConnectAttempts: 0,
    connectRetryDelay: 5000,
    afterConnect: function(client, callback){
        callback()
    }
}

var mongoWrapper = {

    setConfig : function(config){
        if(config){
            if(config.afterConnect && typeof config.afterConnect !== "function") {
                delete config.afterConnect
                log.debug("WARN: config.afterConnect should be a function. Ignoring.")
            }
            if(config.connectRetryDelay && typeof config.connectRetryDelay !== "number"){
                delete config.connectRetryDelay
                log.debug("WARN: config.connectRetryDelay should be a number. Ignoring.")
            }
            if(config.maxConnectAttempts && typeof config.maxConnectAttempts !== "number"){
                delete config.maxConnectAttempts
                log.debug("WARN: config.maxConnectAttempts should be a number. Ignoring.")
            }
            if(config.log){
                //using this logger internaly for all logs
                log = config.log
                delete config.log
            }
            _config = Object.assign(_defaultConfig, _config, config)
        }
        else _config = Object.assign(_defaultConfig, _config)
    },

    /** Method that tries to connect to mongo, and retries if it fails.
     * callback will be called only once it has been successfull to connect to database.
     * Config contains has:
     * @param HOST - default 'localhost'
     * @param PORT - default 27017
     * @param DATABASE - default 'test'
     * @param afterConnect - function that is called after success connection, this function is called with 2 params: client & callback
     */
    connectToMongo: function connectToMongo(config, callback) {
        if(typeof config === "function" && !callback) {
            callback = config
            config = {}
        }
        if(typeof config === "string") config = { connectionString: config }
        
        this.setConfig(config)

        async.whilst(
            function(){
                if(mongoWrapper.isConnected()) return false
                else return true
            },
            function(next){
                mongoWrapper.connect(function(err){
                    if (err) {
                        log.error("Cannot connect to MongoDB! Check that mongo is running..", err)

                        //check if we reached max attempts and end with error
                        if(_config.maxConnectAttempts && _config.maxConnectAttempts !== 0 && _config.maxConnectAttempts <= _currentAttemptNr) {
                            return next(new Error("Maximum connection attempts reached, giving up."))
                        }
                        //if We encountered error.. we try to reconnect after some time..
                        setTimeout(function () {
                            log.debug("Trying to reconnect.. Attempt nr:" + (_currentAttemptNr+1))
                            next()
                        }, _config.connectRetryDelay || 5000)
                    } else {
                        log.debug("Success! connected to Mongo!")
                        next()
                    }
                })
            },
            function(err){
                if(err) log.error("Connection to mongoDB failed and will not try to connect anymore after " + _currentAttemptNr + " retries. Restart needed!", err)
                else log.debug("Successfully finishing mongo connect method after " + _currentAttemptNr + " tries.")
                _currentAttemptNr = 0
                if(callback) callback(err)
            }
        )
    },

    /** Main method to connect to server,
     * usually you should run this method once at the start of the app
     * if it succedes to connect then you dont need to run this anymore.
     *
     * If it fails to connect, you might need to wait and try to reconnect some time later.
     *
     * If connection breaks for some reason, application also might want to reconnect using this method.
     * @param callback
     */
    connect: function connect(callback) {
        _currentAttemptNr++
        MongoClient.connect(this.getConnectionString(), function (err, client) {
            if (err) return callback(err)

            _config.afterConnect(client, function(){
                _client = client
                return callback()
            })
        })
    },

    /**
     * Tells if we are connected to database.
     * @return {boolean}
     */
    isConnected: function isConnected() {
        if (_client) return true
        return false
    },

    /**
     * Database object to use while it is connected to mongoDB.
     * @returns {*}
     */
    db: function db(database){ 
        if(!this.client()) return null
        _currentDatabase = database || _config.DATABASE
        return this.client().db(_currentDatabase) 
    },
    getConfig: function getConfig(){
        return _config
    },
    getCurrentDatabase: function getCurrentDatabase(){
        return _currentDatabase
    },
    client: function client(){
        return _client
    },
    collection: function collection(collection){
        if(!this.db()) return null
        return this.db().collection(collection)
    },
    close: function close(){
        if(this.client()) this.client().close();
    },
    mongodb: mongodb,
    ObjectID: mongodb.ObjectID,
    getConnectionString : function(){
        if(_config.connectionString) return _config.connectionString
        return "mongodb://" + (_config.HOST || _defaultConfig.HOST) + ":" + (_config.PORT || _defaultConfig.PORT) + "/" + (_config.DATABASE || _defaultConfig.DATABASE)
    },

    /**
     * Handy shortcut to insert or update data for one or many object(s)
     * @param collection {String} name of the collection to instert to.
     * @param data {JSON|array} single Json object or array of Json objects.
     * @param callback {Promise} - returns err as first param and result as second.
     *
     // Check state of result
     assert.equal(2, result.nInserted)
     assert.equal(1, result.nUpserted)
     assert.equal(1, result.nMatched)
     assert.ok(1 == result.nModified || result.nModified == null)
     assert.equal(1, result.nRemoved)
     var upserts = result.getUpsertedIds()
     assert.equal(1, upserts.length)
     assert.equal(2, upserts[0].index)
     assert.ok(upserts[0]._id != null)
     var upsert = result.getUpsertedIdAt(0)
     assert.equal(2, upsert.index)
     assert.ok(upsert._id != null)
     */
    saveData : function (collection, data, callback) {
        var collection = this.collection(collection)
        //if data that we want to save is an array and has more than one item we itterate and save them in batch job.
        if (data instanceof Array && data.length > 1) {
            var batch = collection.initializeUnorderedBulkOp({useLegacyOps: true})
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
        if (data._id) return collection.updateOne({'_id': data._id}, data, {'upsert': true}, callback)
        else return collection.insertOne(data, callback) //if it does not have _id we just insert it (insert will generate _id)
    },

    /**
     * Updates data without resetting other fields.
     */
    updateData : function(collection, data, callback){
        if(data instanceof Array) return callback(new Error("Arrays are not supported yet for updating"))
        if(!data._id) return callback(new Error("Missing ID.."))
        var collection = this.db().collection(collection)
        collection.findOneAndUpdate({_id: data._id}, {$set:data}, { returnOriginal:false, upsert:true }, callback)
    },
    /**
     * Handy shortcut to insert new row(s) into mongo db
     * @param collection {String} name of the collection to instert to.
     * @param data {JSON} single Json object.
     * @param callback {Promise} - returns err as first param and result as second.
     */
    insertData : function (collection, data, callback) {
        var collection = this.db().collection(collection)
        if (data instanceof Array) {
            collection.insertMany(data, callback)
        } else {
            collection.insertOne(data, callback)
        }
    },
    clearData: function clearData(collection, callback){
        this.collection(collection).deleteMany({}, callback)
    }
}
module.exports = mongoWrapper