import { Entity,
    IEntityPrivate,
    PropertyType,
    ValueProperty,
    PropertyDescriptor,
    EntityProperty } from "./entity";
import { EntityHelpers } from "./entityHelpers";
import * as Promise from "bluebird";

export enum EntityState {
    /** Not loaded. New entities starts with this state. */
    NOT_LOADED,

    /** Being loaded. */
    LOADING,

    /** Loaded from store. */
    LOADED,

    /** Being deleted. */
    DELETING,

    /** Deleted from store. */
    DELETED
}

/**
 * Information to uniquely represent the entity in the data store.
 */
export interface IEntityKey {
    /**
     * Returns the string representation of the key.
     * This key is used in caching.
     */
    stringValue: string;
}

export interface IEntityData {

}

/**
 * Interface that provides storage specific APIs.
 */
export interface IDataStore {
    /**
     * Called after the context is set. Provides a means to validate the entity
     * for any data store specific validation.
     */
    validate(entity: StorageEntity): void;

    /**
     * Gets the key that represents the eneity.
     */
    getKey(entity: StorageEntity): IEntityKey;

    /**
     * Returns the storage representation of the data.
     */
    getData(entity: StorageEntity): IEntityData;

    /**
     * Delete the entity from store.
     */
    del(key: IEntityKey): Promise<void>;

    /**
     * Load the entity from store.
     */
    get(key: IEntityKey): Promise<IEntityData>;

    /**
     * Insert entity into the store.
     */
    insert(key: IEntityKey, data: IEntityData): Promise<boolean>;

    /**
     * Save the entity into the store.
     */
    save(key: IEntityKey, data: IEntityData): Promise<void>;

    /**
     * Query for entities.
     */
    query<T>(query: IQueryBuilder): Promise<IEntityData[]>;
}

/**
 * Interface that provides the context for entities.
 * Every entity needs a datacontext to interact with the store.
 */
export interface IDataContext {
    /**
     * Creates a new entity.
     */
    create<T extends StorageEntity>(type: { new (): T }): T;

    /**
     * Load entity.
     */
    load<T extends StorageEntity>(type: { new (): T }): Promise<T>;

    /**
     * Query for entities.
     */
    query<T extends StorageEntity>(type: { new (): T }, query: IQueryBuilder): Promise<T[]>;

    /**
     * Save the given entities. If entities is null, all entities in the context will be saved.
     */
    save(entities: StorageEntity[]): Promise<void[]>;
}

/**
 * Interface that must be implemented by DataContext.
 */
export interface IDataContextExtended extends IDataContext {

    /**
     * Gets the key that represents the eneity.
     */
    _key(entity: StorageEntity): IEntityKey;

    /**
     * Returns the storage representation of the data.
     */
    _data(entity: StorageEntity): IEntityData;

    /**
     * Add entity to the context.
     * Use entity.setContext() method instead.
     */
    _add(entity: StorageEntity): void;

    /**
     * Remove entity from the context.
     */
    _remove(entity: StorageEntity): void;

    /**
     * Load the entity from store.
     */
    _get(key: IEntityKey): Promise<IEntityData>;

    /**
    * Delete the entity from store.
    */
    _del(key: IEntityKey): Promise<void>;

    /**
     * Insert entity into the store.
     */
    _insert(key: IEntityKey, data: IEntityData): Promise<boolean>;

    /**
     * Save the entity into the store.
     */
    _save(key: IEntityKey, data: IEntityData): Promise<void>;

}

export interface IStorageEntityPrivate extends IEntityPrivate {
    primaryKeys: PropertyDescriptor[];
    entityState: EntityState;
    loadingPromise: Promise<boolean>;
    deletingPromise: Promise<void>;
    savePromise: Promise<void>;
    insertPromise: Promise<boolean>;
    error: any;
    context: IDataContextExtended;
}

export interface IQueryBuilder {
    getQueryString(): string;
}

/**
 * Class that represents entity that can be stored in a remote storage.
 * make sure to set the context of the store with setContext().
 */
export abstract class StorageEntity extends Entity {

    /**
     * Initializes new instance of the storage entity.
     */
    public constructor() {
        super();
        this.getPrivate().primaryKeys = [];
        this.getPrivate().entityState = EntityState.NOT_LOADED;

        this.getPropertyDescriptors().forEach(d => {
            if (d.type == PropertyType.PRIMARY) {
                this.getPrivate().primaryKeys.push(d);
            }
        });
    }

    public getPrivate(): IStorageEntityPrivate {
        return null;
    }
    /**
     * Get the current state of the entitye.
     */
    public getState(): EntityState {
        return this.getPrivate().entityState;
    }

    /**
     * Sets the entity state.
     */
    public setState(state: EntityState) {
        this.getPrivate().entityState = state;
    }

    /**
     * Returns list of primary keys.
     */
    public getPrimaryKeys(): PropertyDescriptor[] {
        return this.getPrivate().primaryKeys.slice(0);
    }

    /**
     * Gets the context. Context provides the store to store entity.
     */
    public getContext(): IDataContext {
        return this.getPrivate().context;
    }

    /**
     * Sets the context that provides store.
     */
    public setContext(context: IDataContext) {
        if (!context) {
            throw "setContext(): empty context."
        }

        this.getPrivate().context = <IDataContextExtended>context;
        this.getPrivate().context._add(this);
    }

    private getStore(): IDataContextExtended {
        if (!this.getPrivate().context) {
            throw "Entity has no context set. Did you call setContext()?."
        }

        return this.getPrivate().context;
    }

    /**
     * Loads the entity if not loaded yet. Otherwise no-op.
     * Callers should always call load before accessing the entity.
     * Promise returns true if loaded successfully.
     */
    public load(): Promise<boolean> {

        if (this.getState() === EntityState.NOT_LOADED ||
            this.getState() === EntityState.LOADED ||
            this.getState() === EntityState.LOADING) {

            if (this.getPrivate().loadingPromise) {
                return this.getPrivate().loadingPromise;
            }
        } else {
            // Invalid states.
            throw `Can't load(). Entity is in invalid state: ${EntityState[this.getState()]}.`;
        }

        this.getPrivate().loadingPromise = null;
        this.setState(EntityState.LOADING);
        var key = this.getStore()._key(this);
        var promise = this.getStore()._get(key);

        this.getPrivate().loadingPromise = promise
            .then(v => {
                if (!v) {
                    this.setState(EntityState.NOT_LOADED);
                    return false;
                }
                EntityHelpers.loadObject(this, v);
                this.setState(EntityState.LOADED);
                return !!v;
            })
            .catch(err => {
                this.setState(EntityState.NOT_LOADED);
                this.getPrivate().loadingPromise = null;
                this.getPrivate().error = err;
                throw err;
            });;

        return this.getPrivate().loadingPromise;
    }

    /**
     * Refresh the entity from server.
     * All local changes will be overwritten.
     */
    public refresh(): Promise<void> {
        // If already loaded, force refresh.
        if (this.getState() === EntityState.LOADED) {
            this.getPrivate().loadingPromise = null;
        }

        return this.load()
            .then(isLoaded => {
                if (!isLoaded) {
                    throw `Entity doesn't exist.`;
                }
            });
    }

    /**
     * Deletes the entity from server.
     */
    public delete(): Promise<void> {
        if (this.getState() === EntityState.DELETING) {
            if (this.getPrivate().deletingPromise) {
                return this.getPrivate().deletingPromise;
            }
        } else if (!(this.getState() == EntityState.NOT_LOADED ||
            this.getState() == EntityState.LOADED)) {

            throw `Can't delete entity. Invalid state ${EntityState[this.getState()]}`;
        }

        var currentState = this.getState();
        this.setState(EntityState.DELETING);
        var key = this.getStore()._key(this);
        var promise = this.getStore()._del(key)
            .then(() => {
                this.setState(EntityState.DELETED);
                this.resetState();
            })
            .catch(err => {
                this.setState(currentState);
                this.getPrivate().deletingPromise = null;
                this.getPrivate().error = err;
                throw err;
            });
        this.getPrivate().deletingPromise = promise;
        return promise;
    }

    /**
     * Saves the entity to remote store.
     * @param insert If true, save will fail if already exists. 
     */
    public save(): Promise<void> {
        if (this.getPrivate().insertPromise) {
            Promise.reject("Can't save entity. insert() already in progress.");
            return;
        }

        if (this.getPrivate().savePromise) {
            return this.getPrivate().savePromise;
        }
        var promise = this._save(/* overwrite */ true)
            .then(() => {
                this.getPrivate().savePromise = null;
            })
            .catch((err) => {
                this.getPrivate().savePromise = null;
                throw err;
            });

        this.getPrivate().savePromise = promise;
        return promise;
    }

    /**
     * Insert this entity into the data store.
     * If already exists, will fail.
     */
    public insert(): Promise<boolean> {
        if (this.getPrivate().insertPromise) {
            return this.getPrivate().insertPromise;
        }

        if (this.getPrivate().savePromise) {
            Promise.reject("Can't insert entity. Save in progress.");
            return;
        }

        var promise = this._save(/* overwrite */ false)
            .then((v) => {
                this.getPrivate().insertPromise = null;
                return v;
            })
            .catch((err) => {
                this.getPrivate().insertPromise = null;
                throw err;
            });

        this.getPrivate().insertPromise = promise;
        return promise;
    }

    private _save(overwrite: boolean): Promise<boolean> {
        if (this.getState() === EntityState.LOADED ||
            this.getState() === EntityState.NOT_LOADED) {
            // We are good.
        } else {
            throw `Can't save entity: Invalid state: ${EntityState[this.getState()]}.`;
        }
        var key = this.getStore()._key(this);
        var data = this.getStore()._data(this);
        var promise = overwrite ? <Promise<boolean>><any>this.getStore()._save(key, data) : this.getStore()._insert(key, data);
        return promise
            .then((succeeded) => {
                this.setState(EntityState.LOADED);
                this.resetState();
                return succeeded;
            })
            .catch(err => {
                this.getPrivate().error = err;
                throw err;
            });
    }
}

