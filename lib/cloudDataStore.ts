import * as gcloud from "gcloud";
import * as Promise from "bluebird";
import { IDataContext, IDataStore, StorageEntity, IQueryBuilder } from "./storageEntity";
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
}

/**
 * Implements Google Cloud Datastore.
 * Any entity of type CloudStoreEntity can use this store.
 */
export class CloudDataStore implements IDataStore {
    private store: GCloud.Datastore.IDatastore;

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

    public del(entity: StorageEntity): Promise<boolean> {
        var cEntity = <CloudStoreEntity>entity;
        var delPromise = Promise.promisify(this.store.delete, { context: this.store });
        var key = this.store.key([cEntity.kind, this.getKey<string>(cEntity)]);
        return delPromise(key)
            .catch(err => {
                throw this.convertError(err);
            });
    }

    public get(entity: StorageEntity): Promise<boolean> {
        var cEntity = <CloudStoreEntity>entity;
        var getPromise = Promise.promisify(this.store.get, { context: this.store });
        var key = this.store.key([cEntity.kind, this.getKey<string>(cEntity)]);
        return getPromise(key)
            .then((v: any) => {
                if (!v) {
                    return false;
                }

                var obj = v.data;
                return EntityHelpers.loadObject(cEntity, v.data)
                    .then(() => true);
            })
            .catch(err => {
                throw this.convertError(err);
            });;
    }

    public insert(entity: StorageEntity): Promise<boolean> {
        return this.doInsert(entity, false);
    }

    public save(entity: StorageEntity): Promise<void> {
        return this.doInsert(entity, true).then(v => null);
    }

    public query<T>(type: { new (): T }, builder: IQueryBuilder): Promise<any[]> {
        var cq = <any>builder;
        var storeQuery = this.store.createQuery(cq._kind);
        cq._filters.forEach((f: IFilter) => {
            if (f.operator) {
                storeQuery = storeQuery.filter(f.property, f.value);
            } else {
                storeQuery = storeQuery.filter(f.property, f.operator, f.value);
            }
        });
        var queryPromise = Promise.promisify(this.store.runQuery, { context: this.store });
        return <any>queryPromise(storeQuery)
            .then((result: any[]) => {
                var entities: any[] = [];
                result.forEach(e => {
                    entities.push(e.data);
                });
                this.store.runInTransaction((tn, done) => {
                    
                }, (err) => {

                });
                return entities;
            });
    }

    private doInsert(entity: StorageEntity, overwrite: boolean): Promise<boolean> {
        var cEntity = <CloudStoreEntity>entity;
        var id = this.getKey<string>(cEntity);
        var key = this.store.key(id ? [cEntity.kind, id] : cEntity.kind);
        var keyStr = JSON.stringify(key);
        var insertPromise = Promise.promisify(overwrite ? this.store.upsert : this.store.insert,
            { context: this.store });
        // TODO: Check return values.
        var storageObj = EntityHelpers.getObject(cEntity, /* validate */ true, /* includeRef */ true, ["kind"])
        return <any>insertPromise({ key: key, data: storageObj })
            .catch(err => { throw this.convertError(err); });;
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

    private getKey<T>(entity: StorageEntity): T {
        var propName = entity.getPrimaryKeys()[0].name;
        return <T>entity.getPropertyValue(propName);
    }

}
