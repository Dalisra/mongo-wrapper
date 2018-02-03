const chai = require('chai')
var mongodb = require('mongodb')
const expect = chai.expect

var originalMongoClient = mongodb.MongoClient

var sinon = require('sinon')

const mongo = require('../index')
describe('Negative Wrapper Tests', function(){

    it("Test default / null values before connecting", function(done){
        expect(mongo.db()).to.be.null
        expect(mongo.db('foo')).to.be.null
        expect(mongo.client()).to.be.null
        expect(mongo.collection()).to.be.null
        expect(mongo.collection('foo')).to.be.null
        expect(mongo.getConnectionString()).to.equal("mongodb://localhost:27017/test")
        done()
    })

    it('Testing maxNumberOfAttempts', function(done){
        var MongoClientStub = sinon.stub(mongodb.MongoClient, 'connect').callsFake((connectionString, callback) => { callback({error:"Test"})})
        mongo.connectToMongo({
            connectRetryDelay: 100,
            maxConnectAttempts: 5,
            log: { debug: ()=>{}, error: ()=>{}, warn: ()=>{}, fatal: ()=>{} } // to prevent logs while testing.
        }, function(err){
            expect(err).to.be.not.null
            expect(err.message).to.equal("Maximum connection attempts reached, giving up.")
            MongoClientStub.restore()
            done()
        })
    })

    it('Testing reconnection', function(done){
        var numberOfCalls = 0

        var MongoClientStub = sinon.stub(mongodb.MongoClient, 'connect').callsFake(function(connectionString, callback){
            //TODO: validate connection string
            numberOfCalls++
            callback({error:"Not connected, test."})
        })

        mongo.connectToMongo({
            connectRetryDelay: 100,
            maxConnectAttempts: "this should be ignored",
            afterConnect: "this should be also ignored",
            log: { debug: ()=>{}, error: ()=>{}, warn: ()=>{}, fatal: ()=>{} } // to prevent logs while testing.
        })
        
        setTimeout(() => {
            expect(numberOfCalls).to.equal(5)
            expect(mongo.isConnected()).to.be.false
            expect(mongo.db()).to.be.null
            expect(mongo.db('test')).to.be.null
            expect(mongo.collection()).to.be.null
            expect(mongo.collection('test')).to.be.null
            MongoClientStub.restore()
            done()
        }, 510);
    })
})

describe('Positive Wrapper Tests', function(){
    before(function(done){
        //TODO: connect to mongo
        done()
    })

    it("validate that we are connected")


    it("insert one document using saveData")
    it("insert several documents using saveData")

    it("insert one document using insertData")
    it("insert several documents using insertData")

    it("read some data")

    it("update one document using updateData")
})