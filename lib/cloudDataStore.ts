import * as gcloud from "gcloud";
import * as Promise from "bluebird";
import { IDataContext,
    IEntityData,
    IEntityKey,
    IDataStore,
    StorageEntity,
    IQueryBuilder } from "./storageEntity";
import { Entity,
    PropertyType,
    ValueProperty,
    PropertyDescriptor,
    EntityProperty,
    PrimaryKeyProperty } from "./entity";
import { CloudStoreEntity } from "./cloudStoreEntity";
import { EntityHelpers } from "./entityHelpers";
import * as lodash from "lodash";

interface IFilter {
    property: string;
    operator?: string;
    value: string;
}

interface ICloudEntityKey extends IEntityKey {
    kind: string;
    key: string;
}

interface ICloudEntityData extends IEntityData {
    key: ICloudEntityKey;
    data: IEntityData;
}

interface ICloudQueryBuilder extends IQueryBuilder {
    _kind: string;
    _filters: IFilter[];
}

interface ICloudTransaction {
    transaction: GCloud.Datastore.ITransaction;
    done: () => void;
    promise: Promise<void>;
}

export class CloudDataStoreQueryBuilder implements IQueryBuilder {
    private _kind: string;
    private _filters: IFilter[] = [];

    kind(kind: string) {
        this._kind = kind;
        return this;
    }

    filter(property: string, value: string): CloudDataStoreQueryBuilder;
    filter(property: string, operator: string, value: string): CloudDataStoreQueryBuilder;
    filter(property: string, operator: string, value?: string): CloudDataStoreQueryBuilder {
        if (!value) {
            this._filters.push({ property: property, value: operator });
        } else {
            this._filters.push({ property: property, operator: operator, value: value });
        }

        return this;
    }

    public getQueryString() {
        // TODO: improve.
        return JSON.stringify(this);
    }
}

/**
 * Implements Google Cloud Datastore.
 * Any entity of type CloudStoreEntity can use this store.
 */
export class CloudDataStore implements IDataStore {
    private store: GCloud.Datastore.IDatastore;
    private transaction: ICloudTransaction;

    public constructor(projectId: string) {
        this.store = gcloud.datastore({ projectId: projectId });
    }

    public validate(entity: StorageEntity): void {
        var cEntity = <CloudStoreEntity>entity;
        var len = entity.getPrimaryKeys().length;
        if (len != 2) {
            throw `Entity should have only one primary key(other than 'kind'). But contains ${len - 1}.`;
        }

        if (!cEntity.kind) {
            throw `Entity should have 'kind' property.`;
        }
    }

    public getKey(entity: StorageEntity): IEntityKey {
        var cEntity = <CloudStoreEntity>entity;
        var key: ICloudEntityKey = {
            kind: cEntity.kind,
            key: this.getPrimaryKeyValue<string>(cEntity),
            stringValue: null
        };
        key.stringValue = CloudDataStore.getKeyStringValue(key);
        return key;
    }

    public getData(entity: StorageEntity): IEntityData {
        var data = EntityHelpers.getObject(entity, false, true, ["kind", entity.getPrimaryKeys()[0].name]);
        var key = this.getKey(entity);
        return {
            key: key,
            data: data
        };
    }

    public write(entity: StorageEntity, data: IEntityData): void {
        var cEntity = <CloudStoreEntity>entity;
        var key: ICloudEntityKey = <ICloudEntityKey>data.key;
        if (key.kind !== cEntity.kind) {
            throw `CloudDataStore.write(): Invalid entity kind. Expected: ${key.kind}, Actual: ${cEntity.kind}`;
        }
        var primaryKeyName = entity.getPrimaryKeys()[0].name;
        var primaryKeyValue = cEntity.getPropertyValue<string>(primaryKeyName);
        if (primaryKeyValue && primaryKeyValue !== key.key) {
            throw `CloudDataStore.write(): Trying to update primary key from '${primaryKeyValue}' to '${key.key}'`;
        }

        entity.setPropertyValue<string>(primaryKeyName, key.key);
        if (data.data) {
            EntityHelpers.loadObject(entity, data.data);
        }
    }

    public del(key: IEntityKey): Promise<void> {
        var delPromise = Promise.promisify(this.store.delete, { context: this.store });
        var cKey: ICloudEntityKey = <ICloudEntityKey>key;
        var storeKey = this.store.key([cKey.kind, cKey.key]);
        return delPromise(storeKey)
            .catch(err => {
                throw this.convertError(err);
            });
    }

    public get(key: IEntityKey): Promise<IEntityData> {
        var cKey: ICloudEntityKey = <ICloudEntityKey>key;
        var getPromise = Promise.promisify(this.store.get, { context: this.store });
        var storeKey = this.store.key([cKey.kind, cKey.key]);
        return getPromise(storeKey)
            .then(gData => CloudDataStore.convertData(gData))
            .catch(err => {
                throw this.convertError(err);
            });;
    }

    public insert(data: IEntityData): Promise<IEntityData> {
        return this.doInsert(data, false);
    }

    public save(data: IEntityData): Promise<IEntityData> {
        return this.doInsert(data, true)
    }

    public query<T>(builder: IQueryBuilder): Promise<IEntityData[]> {
        var cq = <ICloudQueryBuilder>builder;
        var storeQuery = this.store.createQuery(cq._kind);
        cq._filters.forEach((f: IFilter) => {
            if (f.operator) {
                storeQuery = storeQuery.filter(f.property, f.operator, f.value);
            } else {
                storeQuery = storeQuery.filter(f.property, f.value);
            }
        });
        var queryPromise = Promise.promisify(this.store.runQuery, { context: this.store });
        return <any>queryPromise(storeQuery)
            .then((result: any[]) => {
                var entities: any[] = [];
                result.forEach(gData => {
                    entities.push(CloudDataStore.convertData(gData));
                });
                return entities;
            });
    }

    public beginTransaction(): Promise<void> {
        this.transaction = <ICloudTransaction>{};
        return new Promise<void>((resolve, reject) => {
            var transactionPromise = Promise.promisify(this.store.runInTransaction, { context: this.store });
            this.transaction.promise = transactionPromise(
                (tx, done) => {
                    this.transaction.transaction = tx;
                    this.transaction.done = done;
                    resolve();
                })
                .then(() => {
                    // We are here because it completed successfully.
                    this.transaction = null;
                })
                .catch(err => {
                    this.transaction = null;
                    throw this.convertError(err);
                });
        });
    }

    public rollbackTransaction(): Promise<void> {
        this.transaction.transaction.rollback(this.transaction.done);
        return Promise.resolve();
    }

    public commitTransaction(): Promise<void> {
        this.transaction.done();
        return this.transaction.promise;
    }

    private doInsert(data: IEntityData, overwrite: boolean): Promise<ICloudEntityData> {
        var key: ICloudEntityKey = <ICloudEntityKey>data.key;
        var id = key.key;
        var storeKey = this.store.key(id ? [key.kind, id] : key.kind);
        var keyStr = JSON.stringify(key);
        var insertPromise = Promise.promisify(overwrite ? this.store.upsert : this.store.insert,
            { context: this.store });
        // TODO: Check return values.
        return <any>insertPromise({ key: storeKey, data: data.data })
            .then(v => {
                if (!v) {
                    return null;
                }

                var savedKey = <ICloudEntityKey>{
                    key: storeKey.id || storeKey.name,
                    kind: storeKey.kind,
                    stringValue: null
                };
                savedKey.stringValue = CloudDataStore.getKeyStringValue(savedKey);
                return {
                    key: savedKey,
                    data: null
                };
            })
            .catch(err => {
                if (err.code == 400) {
                    return null;
                }

                throw this.convertError(err);
            });
    }

    private convertError(err: any): CommonTypes.PromiseError {
        if (lodash.isString(err)) {
            return err;
        }

        return {
            message: err.message,
            code: err.code,
            stack: err.stack
        };
    }

    private getPrimaryKeyValue<T>(entity: StorageEntity): T {
        var propName = entity.getPrimaryKeys()[0].name;
        return <T>entity.getPropertyValue(propName);
    }

    private static getKeyStringValue(key: ICloudEntityKey) {
        return key.kind + "." + key.key;
    }

    /**
     * Converts the data received from google api to IEntityData.
     */
    private static convertData(gData: any): IEntityData {
        if (!gData || !gData.data || !gData.key) {
            return null;
        }

        var key: ICloudEntityKey = {
            kind: gData.key.kind,
            key: gData.key.id || gData.key.name,
            stringValue: null
        };

        key.stringValue = CloudDataStore.getKeyStringValue(key);
        var data: IEntityData = {
            key: key,
            data: gData.data
        };
        return data;
    }
}
