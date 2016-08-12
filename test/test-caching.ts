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
import { ITestContext, TestInMemoryContext, TestCloudStoreContext } from "./testContext";
var CACHE_TIMEOUT = 20000;

export function CachingTests(config: string, createContext: (cacheTimeout: number) => Promise<ITestContext>) {

    var should = chai.should();
    chai.use(chaiHttp);
    var useInMemoryStore: boolean = true;

    var context: ITestContext;

    describe(`caching-tests:${config}`, function () {

        beforeEach(() => {
            return createContext(CACHE_TIMEOUT)
                .then(c => {
                    context = c;
                    return context.clean(UserEntity.KIND);
                })
                .then(() => context.clean(BugEntity.KIND));
        });

        afterEach(() => {
            // console.log(`Datastore = ${JSON.stringify(dataStoreObject)}`);
        });

        function addUser(id: string, name: string): Promise<void> {
            return context.ensureEntity(UserEntity.KIND, id, { name: name });
        }

        function verifyUser(id: string, name: string): Promise<void> {
            return context
                .getEntity(UserEntity.KIND, id)
                .then((data) => {
                    should.exist(data);
                    should.equal(name, data.name);
                });
        }

        // Check that cache is used for second attempt.
        it("test-cache-simple", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            var user2: UserEntity;

            return addUser("fieryorc", "Prem Ramanathan")
                .then(() => user.load())
                .then((isLoaded) => {
                    should.equal(true, isLoaded);
                    should.equal(EntityState.LOADED, user.getState());
                    should.equal(false, user.getChanged());
                    return verifyUser("fieryorc", "Prem Ramanathan");
                })
                .then(() => {
                    user2 = new UserEntity();
                    user2.setContext(context.context);
                    user2.id = "fieryorc";
                    // Null out dataStore so access will fail if it tried to access.
                    return context.ensureEntityDeleted(UserEntity.KIND, "fieryorc");
                })
                .then(() => user2.load())
                .then((isLoaded) => {
                    should.equal(true, isLoaded);
                    should.equal(EntityState.LOADED, user2.getState());
                    should.equal(false, user2.getChanged());
                    should.equal("fieryorc", user2.id);
                    should.equal("Prem Ramanathan", user2.name);
                });
        });

        it("test-cache-insert", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            user.name = "Prem Ramanathan";
            var user2: UserEntity;
            return user.insert()
                .then(() => {
                    should.equal(EntityState.LOADED, user.getState());
                    should.equal(false, user.getChanged());
                    return verifyUser("fieryorc", "Prem Ramanathan");
                })
                .then(() => context.ensureEntityDeleted(UserEntity.KIND, "fieryorc"))
                .then(() => {
                    user2 = new UserEntity();
                    user2.setContext(context.context);
                    user2.id = "fieryorc";
                    return user2.load();
                })
                .then(() => {
                    should.equal(EntityState.LOADED, user2.getState());
                    should.equal(false, user2.getChanged());
                    should.equal("fieryorc", user2.id);
                    should.equal("Prem Ramanathan", user2.name);
                });
        });

        it("test-cache-save", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            user.name = "Prem Ramanathan";
            var user2: UserEntity;
            return user.save()
                .then(() => {
                    should.equal(EntityState.LOADED, user.getState());
                    should.equal(false, user.getChanged());
                    return verifyUser("fieryorc", "Prem Ramanathan");
                })
                .then(() => context.ensureEntityDeleted(UserEntity.KIND, "fieryorc"))
                .then(() => {
                    user2 = new UserEntity();
                    user2.setContext(context.context);
                    user2.id = "fieryorc";
                    return user2.load();
                })
                .then((isLoaded) => {
                    should.equal(true, isLoaded);
                    should.equal(EntityState.LOADED, user2.getState());
                    should.equal(false, user2.getChanged());
                    should.equal("fieryorc", user2.id);
                    should.equal("Prem Ramanathan", user2.name);
                });
        });

        // Make sure cache is purged when entity is deleted.
        it("test-cache-del", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            var user2: UserEntity;
            return addUser("fieryorc", "Prem Ramanathan")
                .then(() => user.delete())
                .then(() => {
                    should.equal(EntityState.DELETED, user.getState());
                    should.equal(false, user.getChanged());
                    return context.getEntity(UserEntity.KIND, "fieryorc");
                })
                .then((data) => {
                    should.not.exist(data);
                    return addUser("fieryorc", "Prem Ramanathan");
                })
                .then(() => {
                    user2 = new UserEntity();
                    user2.setContext(context.context);
                    user2.id = "fieryorc";
                    return user2.load();
                })
                .then((isLoaded) => {
                    should.equal(true, isLoaded);
                    should.equal(EntityState.LOADED, user2.getState());
                    should.equal(false, user2.getChanged());
                    should.equal("fieryorc", user2.id);
                    should.equal("Prem Ramanathan", user2.name);
                });
        });

        // Make sure disabling cache works.
        it("test-cache-disable", function () {
            var user = new UserEntity();
            var user2 = new UserEntity();

            return createContext(0)
                .then((c) => {
                    context = c;
                    user.id = "fieryorc";
                    user.setContext(context.context);
                    return addUser("fieryorc", "Prem Ramanathan");
                })
                .then(() => user.load())
                .then((isLoaded) => {
                    should.equal(true, isLoaded);
                    should.equal(EntityState.LOADED, user.getState());
                    should.equal(false, user.getChanged());
                })
                .then(() => context.ensureEntityDeleted(UserEntity.KIND, "fieryorc"))
                .then(() => {
                    user2.setContext(context.context);
                    user2.id = "fieryorc";
                    user2.resetState();
                    return user2.load();
                })
                .then((isLoaded) => {
                    should.equal(false, isLoaded);
                    should.equal(EntityState.NOT_LOADED, user2.getState());
                    should.equal(false, user2.getChanged());
                    should.equal("fieryorc", user2.id);
                });
        });

    });
}