const mongo = require("../index")
const test = require("assert")


function clearProducts() {
// lets clear all the data in products collection
    console.log("Clearing products..")
    return mongo.clearData("products")
}

function insertProducts() {
    console.log("Inserting products..")
    return mongo.saveData("products", {number: 123, name:"Product 123"})
}

function findProducts(){
    console.log("Finding products..")
    return mongo.collection("products").find({}).toArray()
}

async function runTest(err) {
    if(err) throw err // <- if maxConnectAttempts reached.

    let result = await clearProducts()
    test.ok(result != null)
    
    let result2 = await insertProducts()
    test.ok(result2.insertedCount == 1)

    let result3 = await findProducts()
    console.log("Found products: " + JSON.stringify(result3))
    test.ok(result3.length = 1)
    test.ok(result3[0].number = "123")
    test.ok(result3[0].name = "Product 123")

    console.log("Closing mongodb connection..")
    await mongo.close()
}

mongo.connectToMongo({maxConnectAttempts:5}, runTest)