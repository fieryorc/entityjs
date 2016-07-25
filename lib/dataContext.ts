import { StorageEntity } from "./storageEntity";
import * as Promise from "bluebird";
import { IDataStore,
    IDataContext,
    IQueryBuilder,
    EntityState } from "./storageEntity";

/**
 * Provides context for entities. Context provides the remote store.
 */
export class DataContext implements IDataContext {
    private _store: IDataStore;
    private _entityMap: Map<StorageEntity, StorageEntity>;
    private _dataCache: Map<string, any>;

    public constructor(store: IDataStore) {
        if (!store) {
            throw "DataContext(): store is empty."
        }

        this._store = store;
        this._entityMap = new Map<StorageEntity, StorageEntity>();
        this._dataCache = new Map<string, any>();
    }

    /**
     * Gets the store object.
     */
    public get store(): IDataStore {
        return this._store;
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
        this._store.query(type, query)
            .then((data: any[]) => {
                
            });
        return new Promise<T[]>((resolve, reject) => {
            resolve([]);
        });
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
     * Save all the entities in the context.
     */
    public save(): Promise<void[]> {
        var promises: Promise<void>[] = [];
        this._entityMap.forEach(e => {
            if (e.getState() == EntityState.LOADED ||
                e.getState() == EntityState.NOT_LOADED ||
                e.getChanged()) {
                    promises.push(e.save());
            }
        })
        return Promise.all(promises);
    }

    /**
    * Add entity to the context.
    */
    public addEntity(entity: StorageEntity): void {
        if (this._entityMap.get(entity)) {
            throw `addEntity(): Entity ${entity} already has context set.`
        }
        this._store.validate(entity);

        this._entityMap.set(entity, entity);
    }

    /**
     * Remove entity from the context.
     */
    public removeEntity(entity: StorageEntity): void {
        if (!this._entityMap.get(entity)) {
            throw `removeEntity(): Entity ${entity} doesn't have context set.`
        }

        this._entityMap.delete(entity);
    }

    public isPresent(entity: StorageEntity): boolean {
        return this._entityMap.has(entity);
    }
}