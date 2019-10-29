const mongo = require('../index')
const test = require('assert')


async function clearProducts() {
// lets clear all the data in products collection
    return new Promise((resolve, reject) => {
        mongo.clearData('products', (err, result) => {
    
            if(err) return reject(err)
            console.log("Result: " + JSON.stringify(result))
            return resolve(result)
        })
    })
}

async function insertProducts() {
    return new Promise((resolve, reject) => {
        // lets add a product
        mongo.saveData('products', {number: 123, name:"Product 123"}, (err, result) => {
            if(err) {
                console.error("MongoDb returned error: ", err)
                return reject(err)
            }
            console.log("Products created: " + JSON.stringify(result.ops))
            resolve(result)
        })
    })
}

async function findProducts(){
    return new Promise((resolve, reject) => {
    // lets find all products in products collection
        mongo.collection('products').find({}).toArray((err, products) => {
            if(err) {
                console.error("MongoDb returned error: ", err)
                return reject(err)
            }
            console.log("Got following products from database: " + JSON.stringify(products))
            resolve(products)
        })
    })
}

async function runTest(err) {
    if(err) throw err // <- It is possible to config 'give up conditions'.

    let result = await clearProducts()
    test.ok(result != null)
    
    let result2 = await insertProducts()
    test.ok(result2.insertedCount == 1)

    let result3 = await findProducts()
    test.ok(result3.length = 1)
    test.ok(result3[0].number = "123")

    mongo.close()
}

mongo.connectToMongo({maxConnectAttempts:5}, runTest)