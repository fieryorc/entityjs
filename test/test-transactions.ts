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
} from "../main";
import {
    UserEntity,
    BugEntity,
    BugStates
} from "./testEntities";
import { ITestContext, TestInMemoryContext, TestCloudStoreContext } from "./testContext";

export function TransactionTests(config: string, createContext: () => Promise<ITestContext>) {
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
                });
        });

        afterEach(() => {
            // console.log(`Datastore = ${JSON.stringify(dataStoreObject)}`);
        });

        function addUser(id: string, name: string): Promise<void> {
            return context.ensureEntity(UserEntity.KIND, id, { name: name });
        }

        function verifyUser(context: ITestContext, id: string, name: string): Promise<void> {
            return context
                .getEntity(UserEntity.KIND, id)
                .then((data) => {
                    should.exist(data);
                    should.equal(name, data.name);
                });
        }

        function verifyUserDeleted(context: ITestContext, id: string) {
            return context
                .getEntity(UserEntity.KIND, id)
                .then((data) => {
                    should.not.exist(data);
                });
        }

        function updateUser(context: ITestContext, id: string, name: string) {
            return context
                .getEntity(UserEntity.KIND, id)
                .then(() => {
                    return context.updateEntity(UserEntity.KIND, id, { name: name });
                });
        }

        it("transaction-commit", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            user.name = "Prem Ramanathan";

            var user2 = new UserEntity();
            user2.setContext(context.context);
            user2.id = "superman";
            user2.name = "Super Man";

            var context2: ITestContext;

            return createContext()
                .then(c => { context2 = c; })
                .then(() => context.context.beginTransaction())
                .then(() => context.context.save([user, user2]))
                .then(() => verifyUserDeleted(context2, "fieryorc"))
                .then(() => verifyUserDeleted(context2, "superman"))
                .then(() => context.context.commitTransaction())
                .then(() => verifyUser(context2, "fieryorc", "Prem Ramanathan"))
                .then(() => verifyUser(context2, "superman", "Super Man"));
        });

        it("transaction-rollback", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";
            user.name = "Prem Ramanathan";

            return context.context
                .beginTransaction()
                .then(() => user.save())
                .then(() => context.context.rollbackTransaction())
                .then(() => {
                    return verifyUserDeleted(context, "fieryorc");
                });
        });

        // Ensure that the reads read from the snapshot.
        it("transaction-view", function () {
            var user = new UserEntity();
            user.setContext(context.context);
            user.id = "fieryorc";

            // Add to store from different context.
            var context2: ITestContext;
            return createContext()
                .then((c) => {
                    context2 = c;
                    return context.context.beginTransaction();
                })
                // Add the same user outside transaction.
                .then(() => context2.ensureEntity(UserEntity.KIND, "fieryorc", { name: "Prem Ramanathan" }))
                .then(() => user.load())
                .then((isLoaded) => {
                    // Ensure we don't see the entity inside transaction.
                    should.equal(false, isLoaded);
                    return context.context.rollbackTransaction();
                })
                .then(() => user.load())
                .then((isLoaded) => {
                    should.equal(true, isLoaded);
                    should.equal(user.name, "Prem Ramanathan");
                });
        });


    });
}