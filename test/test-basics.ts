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

describe('entity-tests', function () {

    beforeEach(() => {
        dataStoreObject = {};
        dataStore = new TempDataStore(dataStoreObject);
        context = new DataContext(dataStore);
    });

    it("save-simple", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        user.name = "Prem Ramanathan";
        user.save()
            .then(() => {
                should.equal(EntityState.LOADED, user.getState());
                should.equal(false, user.getChanged());
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
                done();
            })
            .catch(err => done(err));
    });

    it("delete-simple", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        user.delete()
            .then(() => {
                should.equal(EntityState.DELETED, user.getState());
                should.equal(false, user.getChanged());
            })
            .catch(err => done(err))
            .then(() => {
                return user.save();
            })
            .then(() => true)
            .catch(err => false)
            .then(succeeded => succeeded ? done("save() should not succeed after delete.") : done());
    });

    it("delete-loaded-entity", function (done) {
        var user = new UserEntity();
        user.setContext(context);
        user.id = "fieryorc";
        dataStoreObject["user.fieryorc"] = { kind: "user", id: "fieryorc", name: "Prem Ramanathan" };

        user.load()
            .then((loaded) => {
                should.equal(true, loaded);
                should.equal(EntityState.LOADED, user.getState());
                should.equal(false, user.getChanged());
                return user.delete();
            })
            .then(() => {
                should.equal(EntityState.DELETED, user.getState());
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
            should.equal("fieryorc", dataStoreObject["user.fieryorc"].id);
            dataStoreObject["user.fieryorc"].name = "Prem (modified) Ramanathan";
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
        dataStoreObject["user.fieryorc"] = { kind: "user", id: "fieryorc", name: "Prem Ramanathan" };
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
        dataStoreObject["user.fieryorc"] = { kind: "user", id: "fieryorc" };
        user.insert()
            .then((v) => {
                if (v) {
                    throw "Insert should not succeed when there is a conflict.";
                } else {
                    console.log("Insert failed with conflict.");
                }
            })
            .then(() => {
                console.log("Insert failed. Trying save... ");
                return user.save();
            })
            .then(() => {
                should.equal(EntityState.LOADED, user.getState());
                console.log(`Save succeeded.`);
                done();
            })
            .catch(err => {
                done(`Save failed. It should always succeed. error: ${err}`);
            });
    });

    function createUsers(): void {
        dataStoreObject["user.fieryorc"] = {
            kind: "user",
            id: "fieryorc",
            name: "Prem Ramanathan"
        };
        dataStoreObject["user.superman"] = {
            kind: "user",
            id: "superman",
            name: "Super Man"
        };
    }

    function createBugInDataStore(): void {
        dataStoreObject["bug.123"] = {
            kind: "bug",
            id: "123",
            assignedTo: "superman",
            createdBy: "fieryorc",
            state: BugStates.ASSIGNED
        }
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
                should.equal(BugStates.ASSIGNED, dataStoreObject["bug.123"].state);
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