const mongo = require("../index")
const assert = require("assert")

describe("Tests before connecting to database", function (){
    
    beforeEach(function (){
        mongo.resetConfig()
    })
    
    it("Test default / null values", function (done){
        
        assert.ok(mongo.db() === null)
        assert.ok(mongo.db("test") === null)
        assert.ok(mongo.client() === null)
        assert.ok(mongo.collection() === null)
        assert.ok(mongo.collection("test") === null)
        
        assert.ok(mongo.getConnectionString() === "mongodb://localhost:27017/test")
        assert.ok(mongo.config.maxConnectAttempts === 0)
        assert.ok(mongo.config.connectRetryDelay === 5000)
        assert.ok(mongo.config.reconnect === true)
        
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
            connectRetryDelay: "forever"
        })
        
        assert.equal(mongo.config.maxConnectAttempts, 0)
        assert.equal(mongo.config.connectRetryDelay, 5000)
    })
    
    it("Testing maxNumberOfAttempts", function (done){
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

describe("Positive Wrapper Tests", function (){
    this.timeout(1000)
    before(function (done){
        mongo.resetConfig()
        mongo.connectToMongo(done)
    })
    
    it("validate that we are connected", function (){
        assert.ok(mongo.client() !== null)
    })
    
    it("clear data", function (done){
        mongo.clearData("test").then(async () => {
            try{
                let data = await mongo.collection("test").find().toArray()
                
                assert.ok(Array.isArray(data))
                assert.ok(data.length === 0)
                
            }catch(err){
                throw err
            }finally{
                done()
            }
        })
    })
    
    it("insert one document using saveData", function (done){
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
    it("insert several documents using saveData", function (done){
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
    
    after(done => {
        mongo.close(done)
    })
})

describe("second connect", function (){
    
    before(function (done){
        mongo.resetConfig()
        mongo.connectToMongo("mongodb://localhost:27017/test").then(() => done())
    })
    
    it("make sure we are connected", function (){
        assert.ok(mongo.client())
    })
    
    it("update all existing items and add one more", async () => {
        
        let data = await mongo.collection("test").find({a: 3}).toArray()
        assert.equal(data.length, 2)
        for(let i in data){
            data[i].test = true
        }
        data.push({a:3, b:100, test:false})
        await mongo.saveData("test", data)
        let newData = await mongo.collection("test").find({a: 3}, {sort:'b'}).toArray()
        
        assert.equal(newData.length, 3)
        assert.ok(newData[2].b === 100 && newData[2].test === false)
    })
    
    it("single item for update data", async () => {
        let data = await mongo.collection("test").find({a: 3}).toArray()
        
        let item = data[0]
        
        item.b=200; item.c = 300
        await mongo.saveData("test", [item])
        
        let newItem = await mongo.collection("test").findOne({b:200, c:300})
        
        assert.deepEqual(item, newItem)
    })
})