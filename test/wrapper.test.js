const chai = require('chai')
const expect = chai.expect
const mongo = require('../index')

describe('Tests before connecting to database', function(){

    beforeEach(function(){
        console.log("Resetting mongodb.")
        mongo.resetConfig()
    })

    it("Test default / null values", function(done){
        expect(mongo.db()).to.be.null
        expect(mongo.db('foo')).to.be.null
        expect(mongo.client()).to.be.null
        expect(mongo.collection()).to.be.null
        expect(mongo.collection('foo')).to.be.null
        expect(mongo.getConnectionString()).to.equal("mongodb://localhost:27017/test")
        done()
    })

    it('Testing maxNumberOfAttempts', function(done){
        this.timeout(10000)
        mongo.connectToMongo({
            port: 27018,
            connectRetryDelay: 500,
            maxConnectAttempts: 3,
            mongoClientOptions: {
                connectTimeoutMS: 100,
                serverSelectionTimeoutMS: 500,
                reconnectTries: 0
            }
            //log: { debug: ()=>{}, error: ()=>{}, warn: ()=>{}, fatal: ()=>{} } // to prevent logs while testing.
        }, function(err){

            expect(mongo.db()).to.be.null
            expect(mongo.db('test')).to.be.null
            expect(mongo.collection()).to.be.null
            expect(mongo.collection('test')).to.be.null

            expect(err).to.be.not.null
            expect(err.message).to.be.not.null
            expect(err.message).to.equal("Maximum connection attempts reached, giving up.")

            done()
        })
    })
    
})


describe('Positive Wrapper Tests', function(){
    before(function(done){
        mongo.connectToMongo({}).then(()=>done())
    })

    it("validate that we are connected", function(done){
        expect(mongo.client()).to.not.be.null
        done()
    })

    it("clear data", function(done){
        mongo.clearData('test').then(() => done())
    })


    it("insert one document using saveData", function (done) {
        mongo.saveData('test', {a:1, b:2})
            .then(()=> mongo.collection('test').find({a:1}).toArray())
            .then((data) => {
                expect(data).to.be.array.of.length(1)
                expect(data.a).to.be.equal(1)
                expect(data.b).to.be.equal(2)
                expect(data._id).to.exist()
            })
    })
    it("insert several documents using saveData")

    it("insert one document using insertData")
    it("insert several documents using insertData")

    it("read some data")

    it("update one document using updateData")
})