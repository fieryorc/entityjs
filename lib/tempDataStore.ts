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
        if (len != 1) {
            throw `Entity should have only one primary key. But contains ${len}.`;
        }
    }

    public del(entity: StorageEntity): Promise<boolean> {
        var key = this.getKey(entity);
        delete this.store[key];
        return Promise.resolve(true);
    }

    public get(entity: StorageEntity): Promise<boolean> {
        var key = this.getKey(entity);
        return Promise.resolve(!!this.store[key]);
    }

    public insert(entity: StorageEntity): Promise<void> {
        return this.doInsert(entity, false);
    }

    public save(entity: StorageEntity): Promise<void> {
        return this.doInsert(entity, true);
    }

    public query<T>(type: { new (): T }, query: string): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            resolve([]);
        });
    }

    private doInsert(entity: StorageEntity, overwrite: boolean): Promise<any> {
        var key = this.getKey(entity);

        if (!overwrite && key in this.store) {
            throw `Entity key(${key})already exists.`;
        }

        this.store[key] = CloudEntityHelpers.getPublicObject(<CloudStoreEntity>entity);
        return Promise.resolve();
    }

    private getKey(entity: StorageEntity): string {
        var keyName = entity.getPrimaryKeys()[0].name;
        return entity.getPropertyValue<string>(keyName);
    }
}
