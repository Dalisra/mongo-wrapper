# mongo-wrapper
Simple mongodb wrapper

## Install

    npm install dalisra-mongo-wrapper -S

## Usage

    const mongo = require("../index")
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

## Planning / under consideration:

    * mongo.findAll('collection')
    * mongo.find('collection', {foo:'bar'})
    * mongo.findOne('collection', {_id: '123'})
    * mongo.deleteAll('collection')
    * mongo.delete('collection', {foo:'bar'})
    * mongo.deleteOne('collection', {_id:'123'})