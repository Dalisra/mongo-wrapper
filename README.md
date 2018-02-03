# mongo-wrapper
Simple mongodb wrapper

## Install

    npm install dalisra-mongo-wrapper -S

## Usage

    // include wrapper
    let mongo = require('dalisra-mongo-wrapper')

    // define options or load from environment variables
    let opts = {} // TODO: explain possible config here.

    // keep trying to connect untill success
    mongo.connectToMongo(opts, (err) => {
        if(err) throw err; // <- It is possible to config 'give up conditions'.

        // You are now connected to database and can start doing queries.
        
        // Example: save some data:
        mongo.saveData('products', {number: 123, name:"Product 123"}, (err, createdProduct)=>{
            if(err) return console.error("MongoDb returned error: ", err)

            console.log("Product created: " + JSON.stringify(createdProduct))

            // And now lets get some data:
            mongo.collection('products').find({}).toArray((err, products) => {
                if(err) return console.error("MongoDb returned error: ", err)

                console.log("Got following products from database: " + JSON.stringify(products))
            })
        })
    })

## Planning / under consideration:

    * mongo.findAll('collection')
    * mongo.find('collection', {foo:'bar'})
    * mongo.findOne('collection', {_id: '123'})
    * mongo.deleteAll('collection')
    * mongo.delete('collection', {foo:'bar'})
    * mongo.deleteOne('collection', {_id:'123'})