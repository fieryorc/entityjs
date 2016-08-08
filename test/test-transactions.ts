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


export function addUser(id: string, name: string) {
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

export function verifyUser(id: string, name: string) {
    var stringValue = "user." + id;
    should.equal(id, dataStoreObject[stringValue].key.id);
    should.equal("user", dataStoreObject[stringValue].key.kind);
    should.equal(stringValue, dataStoreObject[stringValue].key.stringValue);
    should.equal(name, dataStoreObject[stringValue].data.name);
}