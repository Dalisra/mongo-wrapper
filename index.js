var log = {
    error: console.error,
    debug: console.log
}
var mongodb = require('mongodb')
var MongoClient = mongodb.MongoClient
var async = require('async')
var _db
var _connectionString

var mongoWrapper = {

    setConfig : function(config){
        if(typeof config === 'string') _connectionString = config;
        else{
            _connectionString = "mongodb://" + config.HOST + ":" + config.PORT + "/" + config.DATABASE
        }
    },

    /** Method that tries to connect to mongo, and retries if it fails.
     * callback will be called only once it has been successfull to connect to database.
     */
    connectToMongo: function(config, callback) {
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
                        //if We encountered error.. we try to reconnect after some time..
                        setTimeout(function () {
                            log.debug("Trying to reconnect..")
                            next()
                        }, 5000)
                    } else {
                        log.debug("Success! connected to Mongo!")
                        next()
                    }
                })
            },
            function(err){
                if(err) return log.error("Connection to mongoDB failed and will not try to connect anymore.. Restart needed!", err)
                if(!err) log.debug("Successfully finishing mongo connect method.")
                if(callback) callback(err)
                return
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
    connect: function (callback) {
        MongoClient.connect(this.getConnectionString(), function (err, db) {
            if (err) return callback(err)
            /*require('./mongo/afterConnect')(db, function (err) {
                if (err) return callback(err)
                //TODO: move 2 lines back here when afterconnect is implemented.
            })*/
            _db = db
            return callback()
        })
    },

    /**
     * Tells if we are connected to database.
     * @return {boolean}
     */
    isConnected: function () {
        if (_db) return true
        return false
    },

    /**
     * Database object to use while it is connected to mongoDB.
     * @returns {*}
     */
    db: function(){ return _db },
    mongodb: mongodb,
    ObjectID: mongodb.ObjectID,
    getConnectionString : function(){
        return _connectionString
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
        var collection = _db.collection(collection)
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
        var collection = _db.collection(collection)
        collection.findOneAndUpdate({_id: data._id}, {$set:data}, { returnOriginal:false, upsert:true }, callback)
    },
    /**
     * Handy shortcut to insert new row(s) into mongo db
     * @param collection {String} name of the collection to instert to.
     * @param data {JSON} single Json object.
     * @param callback {Promise} - returns err as first param and result as second.
     */
    insertData : function (collection, data, callback) {
        var collection = _db.collection(collection)
        if (data instanceof Array) {
            collection.insertMany(data, callback)
        } else {
            collection.insertOne(data, callback)
        }
    }
}
module.exports = mongoWrapper
