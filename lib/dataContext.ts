import { StorageEntity } from "./storageEntity";
import { EntityHelpers } from "./entityHelpers";
import * as Promise from "bluebird";
import { IDataStore,
    IEntityKey,
    IEntityData,
    IDataContext,
    IDataContextExtended,
    IQueryBuilder,
    EntityState } from "./storageEntity";
import { IDataCache } from "./interfaces";
import { TimedCache  } from "./dataCache";

/**
 * Context provides a way to group entities and share data. All entities within
 * the context share the cache. If you don't want to disable 
 */
class DataContext implements IDataContextExtended {
    private _store: IDataStore;
    private _entityMap: Map<StorageEntity, StorageEntity>;
    private _dataCache: IDataCache<string, IEntityData>;

    public constructor(store: IDataStore, cache: IDataCache<string, IEntityData>) {
        if (!store) {
            throw "DataContext(): store is empty."
        }

        this._store = store;
        this._entityMap = new Map<StorageEntity, StorageEntity>();
        this._dataCache = cache;
    }

    /**
     * Gets the store object.
     */
    public get store(): IDataStore {
        return this._store;
    }

    /**
     * Creates new entity.
     */
    public create<T extends StorageEntity>(type: { new (): T }): T {
        var entity = new type();
        entity.setContext(this);

        return entity;
    }

    /**
     * Loads a given entity.
     */
    public load<T extends StorageEntity>(type: { new (): T }): Promise<T> {
        var entity = new type();
        entity.setContext(this);
        return entity.load().then(() => entity);
    }

    /**
     * Query for entities using the query string.
     */
    public query<T extends StorageEntity>(type: { new (): T }, query: IQueryBuilder): Promise<T[]> {
        return this._store.query(query)
            .then((data) => {
                var results: T[] = [];
                if (data) {
                    data.forEach(d => {
                        var e = new type();
                        e.setContext(this);
                        this._store.write(e, d);
                        results.push(e);
                    });
                }

                return results;
            });
    }

    /**
     * Save all the entities in the context.
     */
    public save(entities: StorageEntity[]): Promise<void[]> {
        var promises: Promise<void>[] = [];

        if (entities) {
            entities.forEach(e => {
                if (e.getState() == EntityState.LOADED ||
                    e.getState() == EntityState.NOT_LOADED ||
                    e.getChanged()) {
                    promises.push(e.save());
                }
            });
        } else {
            this._entityMap.forEach(e => {
                if (e.getState() == EntityState.LOADED ||
                    e.getState() == EntityState.NOT_LOADED ||
                    e.getChanged()) {
                    promises.push(e.save());
                }
            });
        }

        return Promise.all(promises);
    }

    public has(entity: StorageEntity): boolean {
        return this._entityMap.has(entity);
    }

    public beginTransaction(): Promise<void> {
        return this.store.beginTransaction();
    }

    public rollbackTransaction(): Promise<void> {
        return this.store.rollbackTransaction();
    }

    public commitTransaction(): Promise<void> {
        return this.store.commitTransaction();
    }

    ////////////////////////////////////////////////////////////////
    //    IDataContextExtended Members
    ////////////////////////////////////////////////////////////////

    public _key(entity: StorageEntity): IEntityKey {
        return this._store.getKey(entity);
    }

    public _data(entity: StorageEntity): IEntityData {
        return this._store.getData(entity);
    }

    public _write(entity: StorageEntity, data: IEntityData): void {
        this._store.write(entity, data);
    }

    public _add(entity: StorageEntity): void {
        if (this._entityMap.get(entity)) {
            throw `addEntity(): Entity ${entity} already has context set.`
        }
        this._store.validate(entity);

        this._entityMap.set(entity, entity);
    }

    public _remove(entity: StorageEntity): void {
        if (!this._entityMap.get(entity)) {
            throw `removeEntity(): Entity ${entity} doesn't have context set.`
        }

        this._entityMap.delete(entity);
    }

    public _get(key: IEntityKey): Promise<IEntityData> {
        if (this._dataCache && this._dataCache.has(key.stringValue)) {
            return Promise.resolve(this._dataCache.get(key.stringValue));
        }

        return this._store.get(key).then(d => {
            if (this._dataCache) {
                this._dataCache.set(key.stringValue, d);
            }
            return d;
        });
    }

    public _del(key: IEntityKey): Promise<void> {
        return this._store.del(key)
            .then(() => {
                if (this._dataCache && this._dataCache.has(key.stringValue)) {
                    this._dataCache.delete(key.stringValue);
                }
            });
    }

    public _insert(key: IEntityKey, data: IEntityData): Promise<IEntityData> {
        return this._store.insert(key, data)
            .then((v: IEntityData) => {
                if (this._dataCache && v) {
                    this._dataCache.set(key.stringValue, data);
                }
                return v;
            });
    }

    public _save(key: IEntityKey, data: IEntityData): Promise<IEntityData> {
        return this._store.save(key, data)
            .then((v) => {
                if (this._dataCache) {
                    this._dataCache.set(key.stringValue, data);
                }
                return v;
            });
    }
}

/**
 * Creates new DataContext.
 * @param store Store to use.
 * @param cacheTimeout Cache timeout in milliseconds. Defaults to 0 (no cache).
 *        If nonzero value, then datacontext will keep the data for the specified
 *        time.
 */
export function createDataContext(store: IDataStore, cacheTimeout?: number): IDataContext {
    return new DataContext(store, cacheTimeout ? new TimedCache<string, IEntityData>(cacheTimeout) : null);
}