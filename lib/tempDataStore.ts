import * as gcloud from "gcloud";
import * as Promise from "bluebird";
import { IEntityKey,
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
 */
export class TempDataStore implements IDataStore {
    private store: any;
    public constructor(obj?: any) {
        this.store = obj || {};
    }

    public validate(entity: StorageEntity): void {
        var len = entity.getPrimaryKeys().length;
        if (len < 1) {
            throw `Entity should have atleast one primary key.`;
        }
    }

    public getKey(entity: StorageEntity): IEntityKey {
        var key = "";
        var primaryKeyDescriptors = entity.getPrimaryKeys();
        for (var i = primaryKeyDescriptors.length - 1; i >= 0; i--) {
            key += (!key ? "" : ".") + entity.getPropertyValue<string>(primaryKeyDescriptors[i].name);
        }
        return {
            stringValue: key
        };
    }

    public getData(entity: StorageEntity): any {
        return EntityHelpers.getObject(entity, true, true, ["kind"]);
    }

    public del(key: IEntityKey): Promise<void> {
        if (!(key.stringValue in this.store)) {
            return Promise.reject(`TempDataStore.del(): Entity with ${key.stringValue} not found.`);
        }
        delete this.store[key.stringValue];
        return Promise.resolve();
    }

    public get(key: IEntityKey): Promise<any> {
        if (!(key.stringValue in this.store)) {
            return Promise.resolve(false);
        }
        return Promise.resolve(this.store[key.stringValue]);
    }

    public insert(key: IEntityKey, data: any): Promise<boolean> {
        return this.doInsert(key, data, false)
            .then(() => true)
            .catch(err => false);
    }

    public save(key: IEntityKey, data: any): Promise<void> {
        return <any>this.doInsert(key, data, true);
    }

    public query<T>(builder: IQueryBuilder): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            resolve([]);
        });
    }

    private doInsert(key: IEntityKey, data: any, overwrite: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!overwrite && (key.stringValue in this.store)) {
                reject(`Entity key(${key})already exists.`);
                return;
            }

            this.store[key.stringValue] = data;
            resolve();
        });
    }
}
