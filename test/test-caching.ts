import * as chai from "chai";
import chaiHttp = require("chai-http");
import * as Promise from "bluebird";

import {
    EntityState,
    IDataStore,
    CloudStoreEntity,
    ValueProperty,
    ReferenceProperty,
    PrimaryKeyProperty,
    DataContext,
    TempDataStore
} from "../main";
import {
    UserEntity,
    BugEntity,
    BugStates
} from "./testEntities";

var should = chai.should();
chai.use(chaiHttp);

var dataStoreObject: any;
var context: DataContext;
var dataStore: IDataStore;

describe('caching-tests', function () {

    beforeEach(() => {
        dataStoreObject = {};
        dataStore = new TempDataStore(dataStoreObject);
        context = new DataContext(dataStore);
    });

    afterEach(() => {
        // console.log(`Datastore = ${JSON.stringify(dataStoreObject)}`);
    });

    // Check that cache is used for second attempt.
    it("test-cache-simple", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        dataStoreObject["user.fieryorc"] = { kind: "user", id: "fieryorc", name: "Prem Ramanathan" };
        var user2: UserEntity;
        user.load()
            .then((isLoaded) => {
                should.equal(true, isLoaded);
                should.equal(EntityState.LOADED, user.getState());
                should.equal(false, user.getChanged());
                should.equal("fieryorc", dataStoreObject["user.fieryorc"].id);
                should.equal("Prem Ramanathan", dataStoreObject["user.fieryorc"].name);
                user2 = new UserEntity();
                user2.setContext(context);
                user2.id = "fieryorc";
                // Null out dataStore so access will fail if it tried to access.
                delete dataStoreObject["user.fieryorc"];
                return user2.load();
            })
            .then((isLoaded) => {
                should.equal(true, isLoaded);
                should.equal(EntityState.LOADED, user2.getState());
                should.equal(false, user2.getChanged());
                should.equal("fieryorc", user2.id);
                should.equal("Prem Ramanathan", user2.name);
                done();
            })
            .catch(err => done(err));
    });

    it("test-cache-insert", function (done) {
        done("TODO: test-cache-insert");
    });

    it("test-cache-save", function (done) {
        done("TODO: test-cache-save");
    });
    
    it("test-cache-del", function (done) {
        done("TODO: test-cache-del");
    });

});