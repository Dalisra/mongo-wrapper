const mongo = require("../index")
const assert = require("assert")

describe("Tests before connecting to database", function () {

    beforeEach(function () {
        console.log("Resetting mongodb.")
        mongo.resetConfig()
    })

    it("Test default / null values", function (done) {

        assert.ok(mongo.db() === null)
        assert.ok(mongo.db("test") === null)
        assert.ok(mongo.client() === null)
        assert.ok(mongo.collection() === null)
        assert.ok(mongo.collection("test") === null)

        assert.ok(mongo.getConnectionString() === "mongodb://localhost:27017/test")
        done()
    })

    it("Testing maxNumberOfAttempts", function (done) {
        this.timeout(10000)
        mongo.connectToMongo({
            port: 27018,
            connectRetryDelay: 500,
            maxConnectAttempts: 3,
            mongoClientOptions: {
                connectTimeoutMS: 100,
                serverSelectionTimeoutMS: 500,
                reconnectTries: 0,
            },
            //log: { debug: ()=>{}, error: ()=>{}, warn: ()=>{}, fatal: ()=>{} } // to prevent logs while testing.
        }, (err) => {

            assert.ok(mongo.db() === null)
            assert.ok(mongo.db("test") === null)
            assert.ok(mongo.client() === null)
            assert.ok(mongo.collection() === null)
            assert.ok(mongo.collection("test") === null)

            assert.ok(err !== null)
            assert.ok(err.message !== null)
            assert.ok(err.message === "Maximum connection attempts reached, giving up.")
            done()
        })
    })

})


describe("Positive Wrapper Tests", function () {
    this.timeout(1000)
    before(function (done) {
        mongo.connectToMongo().then(() => done())
    })

    it("validate that we are connected", function (done) {
        assert.ok(mongo.client() !== null)
        done()
    })

    it("clear data", function (done) {
        mongo.clearData("test").then(async () => {
            try {
                let data = await mongo.collection("test").find().toArray()

                assert.ok(Array.isArray(data))
                assert.ok(data.length === 0)

            } catch (err) {
                throw err
            }
            finally {
                done()
            }
        })
    })


    it("insert one document using saveData", function (done) {
        mongo.saveData("test", {a: 1, b: 2})
            .then(() => mongo.collection("test").find({a: 1}).toArray())
            .then((data) => {
                assert.ok(Array.isArray(data))
                assert.ok(data.length === 1)
                assert.ok(data[0].a === 1)
                assert.ok(data[0].b === 2)
                assert.ok(data[0]._id)
                done()
            })
    })
    it("insert several documents using saveData", function (done) {
        mongo.saveData("test", [{a: 3, b: 1}, {a: 3, b: 2}])
            .then(() => mongo.collection("test").find({a: 3}).toArray())
            .then((data) => {
                assert.ok(Array.isArray(data))
                assert.ok(data.length === 2)
                assert.ok(data[0].a === 3 && data[1].a === 3)
                assert.ok(data[0].b === 1 && data[1].b === 2)
                assert.ok(data[0]._id && data[1]._id)
                done()
            })
    })

    it("insert one document using insertData")
    it("insert several documents using insertData")

    it("read some data")

    it("update one document using updateData")

    after((done) => {
        mongo.close().then(done)
    })
})