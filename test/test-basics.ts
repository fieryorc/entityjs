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
    IDataContext,
    InMemoryDataStore,
    createDataContext
} from "../main";
import {
    UserEntity,
    BugEntity,
    BugStates
} from "./testEntities";

var should = chai.should();
chai.use(chaiHttp);

var dataStoreObject: any;
var context: IDataContext;
var dataStore: IDataStore;

describe('basic-tests', function () {

    beforeEach(() => {
        dataStoreObject = {};
        dataStore = new InMemoryDataStore(dataStoreObject);
        context = createDataContext(dataStore);
    });

    afterEach(() => {
        // console.log(`Datastore = ${JSON.stringify(dataStoreObject)}`);
    });

    function addUser(id: string, name: string) {
        var stringValue = "user." + id;
        dataStoreObject[stringValue] = {
            key: {
                kind: "user",
                id: id,
                stringValue: stringValue
            },
            data: {
                name: name
            }
        };
    }

    function verifyUser(id: string, name: string) {
        var stringValue = "user." + id;
        should.equal(id, dataStoreObject[stringValue].key.id);
        should.equal("user", dataStoreObject[stringValue].key.kind);
        should.equal(stringValue, dataStoreObject[stringValue].key.stringValue);
        should.equal(name, dataStoreObject[stringValue].data.name);
    }

    it("save-simple", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        user.name = "Prem Ramanathan";
        user.save()
            .then(() => {
                should.equal(EntityState.LOADED, user.getState());
                should.equal(false, user.getChanged());
                verifyUser("fieryorc", "Prem Ramanathan");
                done();
            })
            .catch(err => done(err));
    });

    it("load-simple", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        addUser("fieryorc", "Prem Ramanathan");

        user.load()
            .then(() => {
                should.equal(EntityState.LOADED, user.getState());
                should.equal(false, user.getChanged());
                should.equal("fieryorc", user.id);
                should.equal("Prem Ramanathan", user.name);
                done();
            })
            .catch(err => done(err));
    });

    it("insert-simple", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        user.name = "Prem Ramanathan";
        user.insert()
            .then(() => {
                should.equal(EntityState.LOADED, user.getState());
                should.equal(false, user.getChanged());
                verifyUser("fieryorc", "Prem Ramanathan");
                done();
            })
            .catch(err => done(err));
    });

    it("delete-simple", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        addUser("fieryorc", "Prem Ramanathan");

        user.delete()
            .then(() => {
                should.equal(EntityState.DELETED, user.getState());
                should.equal(false, user.getChanged());
                should.equal(undefined, dataStoreObject["user.fieryorc"]);
            })
            .catch(err => done(err))
            .then(() => {
                return user.save();
            })
            .then(() => true)
            .catch(err => false)
            .then(succeeded => succeeded ? done("save() should not succeed after delete.") : done());
    });

    it("delete-error", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        user.delete()
            .then(() => {
                done("delete() should not succeed when there is no data to delete.");
            })
            .catch(err => done());
    });

    it("delete-loaded-entity", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        addUser("fieryorc", "Prem Ramanathan");

        user.load()
            .then((loaded) => {
                should.equal(true, loaded);
                should.equal(EntityState.LOADED, user.getState());
                should.equal(false, user.getChanged());
                return user.delete();
            })
            .then(() => {
                should.equal(EntityState.DELETED, user.getState());
                should.equal(undefined, dataStoreObject["user.fieryorc"]);
                done();
            })
            .catch(err => done(err));
    });

    it("refresh-simple", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        user.name = "Prem Ramanathan";
        user.save()
            .then(() => {
                verifyUser("fieryorc", "Prem Ramanathan");
                dataStoreObject["user.fieryorc"].data.name = "Prem (modified) Ramanathan";
                return user.refresh();
            })
            .then(() => {
                should.equal("Prem (modified) Ramanathan", user.name);
                done();
            })
            .catch(err => done(err));
    });

    it("change-tracking", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        addUser("fieryorc", "Prem Ramanathan");

        user.load()
            .then(isLoaded => {
                if (!isLoaded) {
                    done("Load failed.");
                    return;
                }
                should.equal(false, user.getChanged());
                should.equal("Prem Ramanathan", user.name);
                user.name = "Prem Ramanathan2";
                should.equal(true, user.getChanged());
                return user.save();
            })
            .then(() => {
                should.equal(false, user.getChanged());
                done();
            })
            .catch(err => done(err));
    });

    it("insert-on-conflict", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        user.name = "Prem Ramanathan";
        addUser("fieryorc", "Prem Ramanathan");
        user.insert()
            .then((v) => {
                should.equal(false, v, "Insert should not succeed when there is a conflict.");
            })
            .then(() => {
                // console.log("Insert failed. Trying save... ");
                return user.save();
            })
            .then(() => {
                should.equal(EntityState.LOADED, user.getState());
                //console.log(`Save succeeded.`);
                done();
            })
            .catch(err => {
                done(`Save failed. It should always succeed. error: ${err}`);
            });
    });

    function createUsers(): void {
        addUser("fieryorc", "Prem Ramanathan");
        addUser("superman", "Super Man");
    }

    function createBugInDataStore(): void {
        dataStoreObject["bug.123"] = {
            key: {
                kind: "bug",
                id: "123",
            },
            data: {
                assignedTo: "superman",
                createdBy: "fieryorc",
                state: BugStates.ASSIGNED
            }
        };
    }

    it("reference-save", function (done) {
        var bug = new BugEntity();
        bug.setContext(context);
        bug.id = "123";
        bug.state = BugStates.ASSIGNED;
        bug.assignedTo = new UserEntity();
        bug.assignedTo.setContext(context);
        bug.assignedTo.id = "superman";
        bug.createdBy = new UserEntity();
        bug.createdBy.setContext(context);
        bug.createdBy.id = "fieryorc";

        bug.save()
            .then(() => {
                should.equal(EntityState.LOADED, bug.getState());
                should.equal(false, bug.getChanged());
                should.equal(EntityState.NOT_LOADED, bug.createdBy.getState());
                should.equal(EntityState.NOT_LOADED, bug.assignedTo.getState());
                should.exist(dataStoreObject["bug.123"]);
                should.equal(BugStates.ASSIGNED, dataStoreObject["bug.123"].data.state);
                should.equal("superman", dataStoreObject["bug.123"].data.assignedTo);
                should.equal("fieryorc", dataStoreObject["bug.123"].data.createdBy);
                should.not.exist(dataStoreObject["user.superman"]);
                should.not.exist(dataStoreObject["user.fieryorc"]);
                done();
            })
            .catch(err => done(err));
    });

    it("reference-load", function (done) {
        createBugInDataStore();
        var bug = new BugEntity();
        bug.setContext(context);
        bug.id = "123";
        bug.load()
            .then(() => {
                should.equal(EntityState.LOADED, bug.getState());
                should.equal(false, bug.getChanged());
                should.equal(EntityState.NOT_LOADED, bug.createdBy.getState());
                should.equal(EntityState.NOT_LOADED, bug.assignedTo.getState());
                done();
            })
            .catch(err => done(err));
    });

    // TODO: Validate referential integrity on save(). (Not supported.)
    // TODO: query, save all,
});