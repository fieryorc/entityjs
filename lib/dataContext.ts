import { StorageEntity } from "./storageEntity";
import * as Promise from "bluebird";
import { IDataStore, IDataContext } from "./storageEntity";

/**
 * Provides context for entities. Context provides the remote store.
 */
export class DataContext implements IDataContext {
    private _store: IDataStore;

    public constructor(store: IDataStore) {
        this._store = store;
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
    public query<T extends StorageEntity>(type: { new (): T }): Promise<T[]> {
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
}