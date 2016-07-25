import { Entity,
    IEntityPrivate,
    PropertyType,
    ValueProperty,
    PropertyDescriptor,
    EntityProperty } from "./entity";
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
 * Interface that provides storage specific APIs.
 */
export interface IDataStore {
    /**
     * Called after the context is set. Provides a means to validate the entity
     * for any data store specific validation.
     */
    validate(entity: StorageEntity): void;

    /**
     * Delete the entity from store.
     */
    del(entity: StorageEntity): Promise<boolean>;

    /**
     * Load the entity from store.
     */
    get(entity: StorageEntity): Promise<boolean>;

    /**
     * Insert entity into the store.
     */
    insert(entity: StorageEntity): Promise<boolean>;

    /**
     * Save the entity into the store.
     */
    save(entity: StorageEntity): Promise<void>;

    /**
     * Query for entities.
     * This is still Work in Progress.
     */
    query<T>(type: { new (): T }, query: IQueryBuilder): Promise<any[]>;
}

/**
 * Interface that provides the context for entities.
 * Every entity needs a datacontext to interact with the store.
 */
export interface IDataContext {
    /**
     * Store object. This provies the store specific APIs.
     */
    store: IDataStore;

    /**
     * Load entity.
     */
    load<T extends StorageEntity>(type: { new (): T }): Promise<T>;

    /**
     * Query for entities.
     */
    query<T extends StorageEntity>(type: { new (): T }, query: IQueryBuilder): Promise<T[]>;

    /**
     * Add entity to the context.
     */
    addEntity(entity: StorageEntity): void;

    /**
     * Remove entity from the context.
     */
    removeEntity(entity: StorageEntity): void;

    /**
     * Save all entities in the context.
     */
    save(): Promise<void[]>;
}

export interface IStorageEntityPrivate extends IEntityPrivate {
    primaryKeys: PropertyDescriptor[];
    entityState: EntityState;
    loadingPromise: Promise<boolean>;
    deletingPromise: Promise<void>;
    savePromise: Promise<void>;
    insertPromise: Promise<boolean>;
    error: any;
    context: IDataContext;
}

export interface IQueryBuilder {
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
        
        context.addEntity(this);
        this.getPrivate().context = context;
    }

    private getStore(): IDataStore {
        if (!this.getPrivate().context) {
            throw "Entity has no context set. Did you call setContext()?."
        }
        
        return this.getPrivate().context && this.getPrivate().context.store;
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
        var promise = this.getStore().get(this);

        this.getPrivate().loadingPromise = promise
            .then(v => {
                this.setState(v ? EntityState.LOADED : EntityState.NOT_LOADED);
                return v;
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
        this.getPrivate().deletingPromise = this.getStore().del(this)
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

        return this.getPrivate().deletingPromise;
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

        var promise = overwrite ? <Promise<boolean>><any>this.getStore().save(this) : this.getStore().insert(this);
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

