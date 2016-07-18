import * as chai from "chai";
import chaiHttp = require("chai-http");

import { EntityState, CloudStoreEntity, ValueProperty, ReferenceProperty, PrimaryKeyProperty, DataContext, TempDataStore } from "../main";
import { UserEntity, BugEntity, BugStates } from "./testEntities";

var should = chai.should();
chai.use(chaiHttp);

var dataStoreObject: any;
var context: DataContext;

describe('entity-tests', function () {

    beforeEach(() => {
        dataStoreObject = {};
        context = new DataContext(new TempDataStore(dataStoreObject));
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

    it("reference-simple", function (done) {
        // TODO:
        done();
    });



});