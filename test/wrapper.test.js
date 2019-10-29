const chai = require('chai')
var mongodb = require('mongodb')
const expect = chai.expect

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
        this.timeout(50000)
        mongo.resetConfig()

        mongo.connectToMongo({
            port: 27018,
            connectRetryDelay: 100,
            maxConnectAttempts: 5,
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