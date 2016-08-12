import * as Promise from "bluebird";
import { IEntityKey,
    IEntityData,
    IQueryBuilder,
    IDataContext,
    IDataStore,
    StorageEntity } from "./storageEntity";
import { Entity,
    PropertyType,
    ValueProperty,
    PropertyDescriptor,
    EntityProperty,
    PrimaryKeyProperty } from "./entity";
import { EntityHelpers } from "./entityHelpers";

/**
 * Implements Temporary store based on object storage.
 * Any StorageEntity can use this store.
 * Transaction follows the same semantics as gcloud datastore.
 *  - Within transaction, the reads are from snapshot (when transaction started).
 *  - Reads don't see entities added in transaction.
 */
export class InMemoryDataStore implements IDataStore {
    private database: CommonTypes.IDictionary<any>;
    private snapshot: CommonTypes.IDictionary<any>;
    // backup copy for rolling back transaction.
    private transactionDb: CommonTypes.IDictionary<any>;

    public constructor(obj?: CommonTypes.IDictionary<any>) {
        this.database = obj || {};
    }

    public validate(entity: StorageEntity): void {
        var len = entity.getPrimaryKeys().length;
        if (len < 1) {
            throw `Entity should have atleast one primary key.`;
        }
    }

    public getKey(entity: StorageEntity): IEntityKey {
        var key: IEntityKey = {
            stringValue: ""
        };

        var primaryKeyDescriptors = entity.getPrimaryKeys();
        for (var i = primaryKeyDescriptors.length - 1; i >= 0; i--) {
            var name = primaryKeyDescriptors[i].name;
            var value = entity.getPropertyValue(name);
            key.stringValue += (!key.stringValue ? "" : ".") + value;
            (<any>key)[name] = value;
        }

        return key;
    }

    public getData(entity: StorageEntity): IEntityData {
        var key = this.getKey(entity);
        var primaryKeyNames: string[] = [];
        entity.getPrimaryKeys().forEach(k => {
            primaryKeyNames.push(k.name);
        });

        var data = EntityHelpers.getObject(entity, true, true, primaryKeyNames);
        return {
            key: key,
            data: data
        };
    }

    public write(entity: StorageEntity, data: IEntityData): void {
        var key = data.key;
        for (var p in key) {
            if (key.hasOwnProperty(p) && p !== "stringValue") {
                entity.setPropertyValue(p, (<any>key)[p]);
            }
        }

        EntityHelpers.loadObject(entity, data.data);
    }

    public del(key: IEntityKey): Promise<void> {
        if (this.transactionDb) {
            this.transactionDb[key.stringValue] = null;
            return Promise.resolve();
        } else if (key.stringValue in this.database) {
            delete this.database[key.stringValue];
            return Promise.resolve();
        } else {
            // return Promise.reject(`InMemoryDataStore.del(): Entity with ${key.stringValue} not found.`);
            return Promise.resolve();
        }
    }

    public get(key: IEntityKey): Promise<IEntityData> {
        // If in transaction, return from snapshot.
        var db = this.snapshot || this.database;
        if (!(key.stringValue in db)) {
            return Promise.resolve(null);
        }
        return Promise.resolve(db[key.stringValue]);
    }

    public insert(data: IEntityData): Promise<IEntityData> {
        return this.doInsert(data, false);
    }

    public save(data: IEntityData): Promise<IEntityData> {
        return this.doInsert(data, true);
    }

    public query<T>(builder: IQueryBuilder): Promise<IEntityData[]> {
        return new Promise<IEntityData[]>((resolve, reject) => {
            resolve([]);
        });
    }

    public beginTransaction(): Promise<void> {
        this.snapshot = this.clone(this.database);
        this.transactionDb = {};
        return Promise.resolve();
    }

    public rollbackTransaction(): Promise<void> {
        if (!this.transactionDb) {
            return Promise.reject("rollbackTransaction(): Can't rollback when not inside transaction.");
        }

        this.transactionDb = this.snapshot = null;
        return Promise.resolve();
    }

    public commitTransaction(): Promise<void> {
        for (var key in this.transactionDb) {
            if (!this.transactionDb[key]) {
                delete this.database[key];
            } else {
                this.database[key] = this.transactionDb[key];
            }
        }

        this.transactionDb = this.snapshot = null;
        return Promise.resolve();
    }

    private doInsert(data: IEntityData, overwrite: boolean): Promise<IEntityData> {
        var key = data.key;
        var db = this.transactionDb || this.database;

        return new Promise<IEntityData>((resolve, reject) => {
            if (!overwrite && (key.stringValue in db)) {
                resolve(null);
                return;
            }

            // Normalize the data (strip out any functions, other misc stufff) before storing.
            db[key.stringValue] = this.clone(data);
            resolve({
                key: key,
                data: null
            });
        });
    }

    private clone(data: any): any {
        return JSON.parse(JSON.stringify(data));
    }
}
