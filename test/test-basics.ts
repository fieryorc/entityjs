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

export function BasicTests(config: string, createContext: () => Promise<ITestContext>) {
    var should = chai.should();
    chai.use(chaiHttp);
    var useInMemoryStore: boolean = false;

    var context: ITestContext;

    describe(`basic-tests:${config}`, function () {

        beforeEach(() => {
            return createContext()
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

        function verifyUserDeleted(id: string) {
            return context
                .getEntity(UserEntity.KIND, id)
                .then((data) => {
                    should.not.exist(data);
                });
        }

        function updateUser(id: string, name: string) {
            return context
                .getEntity(UserEntity.KIND, id)
                .then(() => {
                    return context.updateEntity(UserEntity.KIND, id, { name: name });
                });
        }

        function addBug(id: string, state: string, assignedTo: string, createdBy: string): Promise<void> {
            return context
                .ensureEntity(BugEntity.KIND, id, {
                    state: state,
                    assignedTo: assignedTo,
                    createdBy: createdBy
                });
        }

        function verifyBug(id: string, state: string, assignedTo: string, createdBy: string): Promise<void> {
            return context
                .getEntity(BugEntity.KIND, id)
                .then((data) => {
                    should.exist(data);
                    should.equal(state, data.state);
                    should.equal(assignedTo, data.assignedTo);
                    should.equal(createdBy, data.createdBy);
                });
        }

        it("save-simple", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            user.name = "Prem Ramanathan";
            return user.save()
                .then(() => {
                    should.equal(EntityState.LOADED, user.getState());
                    should.equal(false, user.getChanged());
                    return verifyUser("fieryorc", "Prem Ramanathan");
                });
        });

        it("load-simple", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            return addUser("fieryorc", "Prem Ramanathan")
                .then(() => user.load())
                .then(() => {
                    should.equal(EntityState.LOADED, user.getState());
                    should.equal(false, user.getChanged());
                    should.equal("fieryorc", user.id);
                    should.equal("Prem Ramanathan", user.name);
                });
        });

        it("insert-simple", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            user.name = "Prem Ramanathan";
            return user.insert()
                .then(() => {
                    should.equal(EntityState.LOADED, user.getState());
                    should.equal(false, user.getChanged());
                    return verifyUser("fieryorc", "Prem Ramanathan");
                })
        });

        it("delete-simple", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            return addUser("fieryorc", "Prem Ramanathan")
                .then(() => user.delete())
                .then(() => {
                    should.equal(EntityState.DELETED, user.getState());
                    should.equal(false, user.getChanged());
                    verifyUserDeleted("user.fieryorc");
                })
                .then(() => {
                    return user.save().catch(err => {
                        should.exist(err);
                    });
                });
        });

        it("delete-error", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            return user.delete();
        });

        it("delete-loaded-entity", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            return addUser("fieryorc", "Prem Ramanathan")
                .then(() => user.load())
                .then((loaded) => {
                    should.equal(true, loaded);
                    should.equal(EntityState.LOADED, user.getState());
                    should.equal(false, user.getChanged());
                    return user.delete();
                })
                .then(() => {
                    should.equal(EntityState.DELETED, user.getState());
                    return verifyUserDeleted("user.fieryorc");
                })
        });

        it("refresh-simple", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            user.name = "Prem Ramanathan";
            return user.save()
                .then(() => {
                    verifyUser("fieryorc", "Prem Ramanathan");
                    return updateUser("fieryorc", "Prem (modified) Ramanathan");
                })
                .then(() => user.refresh())
                .then(() => {
                    should.equal("Prem (modified) Ramanathan", user.name);
                });
        });

        it("change-tracking", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            return addUser("fieryorc", "Prem Ramanathan")
                .then(() => user.load())
                .then(isLoaded => {
                    should.equal(true, isLoaded);
                    should.equal(false, user.getChanged());
                    should.equal("Prem Ramanathan", user.name);
                    user.name = "Prem Ramanathan2";
                    should.equal(true, user.getChanged());
                    return user.save();
                })
                .then(() => {
                    should.equal(false, user.getChanged());
                    return verifyUser("fieryorc", "Prem Ramanathan2");
                });
        });

        it("insert-on-conflict", function () {
            var user = new UserEntity();

            user.id = "fieryorc";
            user.name = "Prem Ramanathan";
            user.setContext(context.context);
            return addUser("fieryorc", "Prem Ramanathan")
                .then(() => user.insert())
                .then(succeeded => {
                    should.equal(false, succeeded);
                })
                .then(() => user.save())
                .then(() => {
                    should.equal(EntityState.LOADED, user.getState());
                });
        });

        it("reference-save", function () {
            var bug = new BugEntity();
            bug.setContext(context.context);
            bug.id = "123";
            bug.state = BugStates.ASSIGNED;
            bug.assignedTo = new UserEntity();
            bug.assignedTo.setContext(context.context);
            bug.assignedTo.id = "superman";
            bug.createdBy = new UserEntity();
            bug.createdBy.setContext(context.context);
            bug.createdBy.id = "fieryorc";

            return bug
                .save()
                .then(() => {
                    should.equal(EntityState.LOADED, bug.getState());
                    should.equal(false, bug.getChanged());
                    should.equal(EntityState.NOT_LOADED, bug.createdBy.getState());
                    should.equal(EntityState.NOT_LOADED, bug.assignedTo.getState());
                    verifyBug("123", BugStates.ASSIGNED, "superman", "fieryorc");
                    verifyUserDeleted("superman");
                    verifyUserDeleted("fieryorc");
                });
        });

        it("reference-load", function () {
            var bug = new BugEntity();
            bug.setContext(context.context);
            bug.id = "123";

            return addBug("123", BugStates.ASSIGNED, "superman", "fieryorc")
                .then(() => addUser("superman", "Super Man"))
                .then(() => addUser("fieryorc", "Prem Ramanathan"))
                .then(() => bug.load())
                .then(() => {
                    should.equal(EntityState.LOADED, bug.getState());
                    should.equal(false, bug.getChanged());
                    should.equal(EntityState.NOT_LOADED, bug.createdBy.getState());
                    should.equal(EntityState.NOT_LOADED, bug.assignedTo.getState());
                });
        });

        // TODO: Validate referential integrity on save(). (Not supported.)
        // TODO: query, save all,
    });
}