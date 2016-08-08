import * as gcloud from "gcloud";
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
 */
export class InMemoryDataStore implements IDataStore {
    private db: CommonTypes.IDictionary<any>;
    // backup copy for rolling back transaction.
    private backup: string;

    public constructor(obj?: CommonTypes.IDictionary<any>) {
        this.db = obj || {};
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
        if (!(key.stringValue in this.db)) {
            return Promise.reject(`InMemoryDataStore.del(): Entity with ${key.stringValue} not found.`);
        }
        delete this.db[key.stringValue];
        return Promise.resolve();
    }

    public get(key: IEntityKey): Promise<IEntityData> {
        if (!(key.stringValue in this.db)) {
            return Promise.resolve(null);
        }
        return Promise.resolve(this.db[key.stringValue]);
    }

    public insert(key: IEntityKey, data: IEntityData): Promise<IEntityData> {
        return this.doInsert(key, data, false);
    }

    public save(key: IEntityKey, data: IEntityData): Promise<IEntityData> {
        return this.doInsert(key, data, true);
    }

    public query<T>(builder: IQueryBuilder): Promise<IEntityData[]> {
        return new Promise<IEntityData[]>((resolve, reject) => {
            resolve([]);
        });
    }

    public beginTransaction(): Promise<void> {
        this.backup = JSON.stringify(this.db);
        return Promise.resolve();
    }

    public rollbackTransaction(): Promise<void> {
        if (backupData) {
            return Promise.reject("rollbackTransaction(): Can't rollback when not inside transaction.");
        }

        var backupData = JSON.parse(this.backup);
        for (var key in this.db) {
            delete this.db[key];
        }
        for (var key in backupData) {
            this.db[key] = backupData[key];
        }
        return Promise.resolve();
    }

    public commitTransaction(): Promise<void> {
        this.backup = null;
        return Promise.resolve();
    }

    private doInsert(key: IEntityKey, data: IEntityData, overwrite: boolean): Promise<IEntityData> {
        return new Promise<IEntityData>((resolve, reject) => {
            if (!overwrite && (key.stringValue in this.db)) {
                resolve(null);
                return;
            }

            // Normalize the data (strip out any functions, other misc stufff) before storing.
            this.db[key.stringValue] = JSON.parse(JSON.stringify(data));
            resolve({
                key: key,
                data: null
            });
        });
    }
}
