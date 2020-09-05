const mongo = require("../index")
const assert = require("assert")

describe("Tests before connecting to database", function () {

    it("Test default / null values", function (done) {

        mongo.setConfig() // should not fail.
        assert.equal(mongo.db(), null)
        assert.equal(mongo.db("test"), null)
        assert.equal(mongo.client(), null)
        assert.equal(mongo.collection(), null)
        assert.equal(mongo.collection("test"), null)

        assert.equal(mongo.getConnectionString(), "mongodb://localhost:27017/test")
        assert.equal(mongo.config.maxConnectAttempts, 0)
        assert.equal(mongo.config.connectRetryDelay, 5000)
        assert.equal(mongo.config.reconnect, true)

        //Test changing default values:
        mongo.setConfig({
            maxConnectAttempts: 5,
            connectRetryDelay: 1000,
            reconnect: false,
            database: "test1",
            port: "27018",
            host: "unknown",
        })

        assert.ok(mongo.getConnectionString() === "mongodb://unknown:27018/test1")
        assert.ok(mongo.config.maxConnectAttempts === 5)
        assert.ok(mongo.config.connectRetryDelay === 1000)
        assert.ok(mongo.config.reconnect === false)

        // Test reset
        mongo.resetConfig()

        assert.ok(mongo.getConnectionString() === "mongodb://localhost:27017/test")
        assert.ok(mongo.config.maxConnectAttempts === 0)
        assert.ok(mongo.config.connectRetryDelay === 5000)
        assert.ok(mongo.config.reconnect === true)

        done()
    })

    it("Test wrong values", () => {
        mongo.resetConfig()

        mongo.setConfig({
            maxConnectAttempts: "tooMany",
            connectRetryDelay: "forever",
            log: {debug: () => {}} // To prevent logs when testing.
        })

        assert.equal(mongo.config.maxConnectAttempts, 0)
        assert.equal(mongo.config.connectRetryDelay, 5000)
    })

    it("Testing maxNumberOfAttempts", function (done) {
        mongo.connectToMongo({
            port: 27018,
            connectRetryDelay: 100,
            maxConnectAttempts: 2,
            mongoClientOptions: {
                connectTimeoutMS: 100,
                serverSelectionTimeoutMS: 500,
                reconnectTries: 0,
            },
            log: {debug: () => {}, error: () => {}} // To prevent logs when testing.
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

    it("Testing maxNumberOfAttempts Promise", async () => {
        try{
            mongo.resetConfig()
            await mongo.connectToMongo({
                port: 27018,
                connectRetryDelay: 500,
                maxConnectAttempts: 1,
                mongoClientOptions: {
                    connectTimeoutMS: 100,
                    serverSelectionTimeoutMS: 500,
                    reconnectTries: 0,
                },
                log: {error: () => {}} // To prevent logs when testing.
            })
        }catch(err){
                assert.equal(mongo.currentAttemptNr, 1)
                assert.ok(mongo.db() === null)
                assert.ok(mongo.db("test") === null)
                assert.ok(mongo.client() === null)
                assert.ok(mongo.collection() === null)
                assert.ok(mongo.collection("test") === null)

                assert.ok(err !== null)
                assert.ok(err.message !== null)
                assert.ok(err.message === "Maximum connection attempts reached, giving up.")
        }
    })

    it("Test closing connection when there is no connection", (done) => {
        // first try async way with promises
        (async () => {
            await mongo.close()
            assert.ok(true) // should not crash.
        })().then(() => {
            // now try again with callback.
            mongo.close(true, function(err, result){
                assert.equal(err, null)
                assert.equal(result, null)
                done()
            })
        })
    })
})

describe("Positive Wrapper Tests", function () {
    this.timeout(1000)
    before(function (done) {
        mongo.resetConfig()
        mongo.connectToMongo(done)
    })

    it("validate that we are connected", function () {
        assert.ok(mongo.client() !== null)
    })

    it("clear data", function (done) {
        mongo.clearData("test").then(async () => {
            try {
                let data = await mongo.collection("test").find().toArray()

                assert.ok(Array.isArray(data))
                assert.ok(data.length === 0)

            } catch (err) {
                throw err
            } finally {
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

    it("Try to disconnect", (done) => {
        let logLine = 0
        mongo.setConfig({log:{debug: (log) => {
            if(logLine === 0) {
                assert.strictEqual(log, "Lost connection to Database..")
                logLine++
            }else if(logLine === 1){
                assert.strictEqual(log, "Trying to reconnect..")
                logLine++
            }else{
                console.log(log)
            }
        }}})

        assert.ok(mongo.config.reconnect)
        assert.ok(mongo.client())

        mongo.client().emit("disconnected", Error("Fake disconnect"))

        assert.strictEqual(mongo.client(), null)
        setTimeout(() => {
            assert.ok(mongo.client())
            done()
        }, 900)
    })

    after(done => {
        assert.ok(mongo.client())
        mongo.close().then(() => {
            assert.strictEqual(mongo.client(), null)
            done()
        })
    })


})

describe("second connect", function () {

    before(function (done) {
        mongo.resetConfig()
        mongo.connectToMongo("mongodb://localhost:27017/test").then(() => done())
    })

    it("make sure we are connected", function () {
        assert.ok(mongo.client())
    })

    it("update all existing items and add one more", async () => {

        let data = await mongo.collection("test").find({a: 3}).toArray()
        assert.strictEqual(data.length, 2)
        for (let i in data) {
            if(data.hasOwnProperty(i)){
                data[i].test = true
            }
        }
        data.push({a: 3, b: 100, test: false})
        await mongo.saveData("test", data)
        let newData = await mongo.collection("test").find({a: 3}, {sort: "b"}).toArray()

        assert.equal(newData.length, 3)
        assert.ok(newData[2].b === 100 && newData[2].test === false)
    })

    it("single item for update data", async () => {
        let data = await mongo.collection("test").find({a: 3}).toArray()

        let item = data[0]

        item.b = 200
        item.c = 300
        await mongo.saveData("test", [item])

        let newItem = await mongo.collection("test").findOne({b: 200, c: 300})

        assert.deepEqual(item, newItem)
    })

    it("Disconnect from mongo without reconnect", (done) => {
        mongo.setConfig({ reconnect:false, log:{debug: (log) => assert.strictEqual(log, "Lost connection to Database..")} })
        mongo.client().emit("disconnected", Error("Fake disconnect"))
        assert.ok(mongo.client() !== null)
        setTimeout(() => {
            assert.ok(mongo.client() !== null) // since this is fake disconnect the mongo client acctually did not disconnect.
            done()
        }, 100)
    })

    after(done => {
        mongo.close(done)
    })
})