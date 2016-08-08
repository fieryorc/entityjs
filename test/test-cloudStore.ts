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
    createDataContext,
    CloudDataStore
} from "../main";
import {
    UserEntity,
    BugEntity,
    BugStates
} from "./testEntities";

var should = chai.should();
chai.use(chaiHttp);

var context: IDataContext;
var dataStore: IDataStore = new CloudDataStore("qfeedbackme");

describe('basic-tests', function () {

    beforeEach(() => {
        context = createDataContext(dataStore);
    });

    afterEach(() => {
        // console.log(`Datastore = ${JSON.stringify(dataStoreObject)}`);
    });

});