import * as gcloud from "gcloud";
import * as Promise from "bluebird";
import { IDataContext, IDataStore, StorageEntity } from "./storageEntity";
import { CloudStoreEntity } from "./cloudStoreEntity";
import { Entity, PropertyType, ValueProperty, PropertyDescriptor, EntityProperty, PrimaryKeyProperty } from "./entity";
import { CloudEntityHelpers } from "./cloudEntityHelpers";

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

    public del(entity: StorageEntity): Promise<boolean> {
        var key = this.getKey(entity);
        delete this.store[key];
        return Promise.resolve(true);
    }

    public get(entity: StorageEntity): Promise<boolean> {
        var key = this.getKey(entity);
        if (!(key in this.store)) {
            return Promise.resolve(false);
        }
        return CloudEntityHelpers.loadObject(entity, this.store[key])
            .then(() => true);
    }

    public insert(entity: StorageEntity): Promise<boolean> {
        return this.doInsert(entity, false)
            .then(() => true)
            .catch(err => false);
    }

    public save(entity: StorageEntity): Promise<void> {
        return <any>this.doInsert(entity, true);
    }

    public query<T>(type: { new (): T }, query: string): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            resolve([]);
        });
    }

    private doInsert(entity: StorageEntity, overwrite: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            var key = this.getKey(entity);

            if (!overwrite && (key in this.store)) {
                reject(`Entity key(${key})already exists.`);
                return;
            }

            this.store[key] = CloudEntityHelpers.getPublicObject(<CloudStoreEntity>entity);
            resolve();
        });
    }

    private getKey(entity: StorageEntity): string {
        var key = "";
        var primaryKeyDescriptors = entity.getPrimaryKeys();
        for (var i = primaryKeyDescriptors.length - 1; i >= 0; i--) {
            key += (!key ? "" : ".") + entity.getPropertyValue<string>(primaryKeyDescriptors[i].name);
        }
        return key;
    }
}
