import * as chai from "chai";
import * as Promise from "bluebird";
import * as gcloud from "google-cloud";

import {
    IDataContext,
    IDataStore,
    createDataContext,
    InMemoryDataStore,
    CloudDataStore
} from "../main";

import {
    BugStates
} from "./testEntities";

var should = chai.should();

export interface ITestContext {
    context: IDataContext;
    ensureEntity(kind: string, id: string, data: any): Promise<void>;
    getEntity(kind: string, id: string): Promise<any>;
    updateEntity(kind: string, id: string, data: any): Promise<void>;
    ensureEntityDeleted(kind: string, id: string): Promise<void>;
    clean(kind: string): Promise<void>;
}

export class TestInMemoryContext implements ITestContext {
    public context: IDataContext;
    private dataStoreObject: any;
    private dataStore: IDataStore;

    constructor(dataStoreObject: any, timeout?: number) {
        this.dataStoreObject = dataStoreObject;
        this.dataStore = new InMemoryDataStore(this.dataStoreObject);
        this.context = createDataContext(this.dataStore, timeout);
    }

    public ensureEntity(kind: string, id: string, data: any): Promise<void> {
        var stringValue = kind + "." + id;
        this.dataStoreObject[stringValue] = {
            key: {
                kind: kind,
                id: id,
                stringValue: stringValue
            },
            data: data
        };
        return Promise.resolve();
    }

    public getEntity(kind: string, id: string): Promise<any> {
        var stringValue = kind + "." + id;
        var value = this.dataStoreObject[stringValue];
        return Promise.resolve(value && value.data);
    }

    public updateEntity(kind: string, id: string, data: any): Promise<void> {
        var stringValue = kind + "." + id;
        var value = this.dataStoreObject[stringValue];
        if (!value) {
            return Promise.reject(`updateEntity(): Entity(${kind}.${id}) doesn't exist.`);
        }

        value.data = data;
        return Promise.resolve();
    }

    public ensureEntityDeleted(kind: string, id: string): Promise<void> {
        var stringValue = kind + "." + id;
        delete this.dataStoreObject[stringValue];
        return Promise.resolve();
    }

    public clean(kind: string): Promise<void> {
        var prefix = kind + ".";
        var toDelete: string[] = [];
        for (var key in this.dataStoreObject) {
            if (key.startsWith(prefix)) {
                toDelete.push(key);
            }
        }
        toDelete.forEach(k => {
            delete this.dataStoreObject[k];
        })
        return Promise.resolve();
    }
}

export class TestCloudStoreContext {
    public context: IDataContext;
    // Underlying store for direct operations.
    private _store: GCloud.Datastore.IDatastore;
    private dataStore: IDataStore;

    constructor(projectId: string, timeout?: number) {
        this._store = gcloud.datastore({ projectId: projectId });
        this.dataStore = new CloudDataStore(projectId);
        this.context = createDataContext(this.dataStore, timeout);
    }

    public ensureEntity(kind: string, id: string, data: any): Promise<void> {
        var promise = Promise.promisify(this._store.upsert, { context: this._store });
        return <Promise<void>><any>promise({
            key: this._store.key([kind, id]),
            data: data
        });
    }

    public getEntity(kind: string, id: string): Promise<any> {
        var getPromise = Promise.promisify(this._store.get, { context: this._store });
        var storeKey = this._store.key([kind, id]);
        return getPromise(storeKey)
            .then(gData => gData && gData.data);
    }

    public updateEntity(kind: string, id: string, data: any): Promise<void> {
        return this.ensureEntity(kind, id, data);
    }

    public ensureEntityDeleted(kind: string, id: string): Promise<void> {
        var promise = Promise.promisify(this._store.delete, { context: this._store });
        var storeKey = this._store.key([kind, id]);
        return promise(storeKey);
    }

    public clean(kind: string): Promise<void> {
        var storeQuery = this._store.createQuery(kind);
        var queryPromise = Promise.promisify(this._store.runQuery, { context: this._store });
        return <Promise<void>><any>queryPromise(storeQuery)
            .then((result: any[]) => {
                var deletePromises: Promise<void>[] = [];
                result.forEach(gData => {
                    deletePromises.push(this.ensureEntityDeleted(kind, gData.key.name));
                });
                return Promise.all(deletePromises);
            });
    }
}