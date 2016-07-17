import { Entity, PropertyType, ValueProperty, PropertyDescriptor, EntityProperty } from "./entity";
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
    insert(entity: StorageEntity): Promise<void>;

    /**
     * Save the entity into the store.
     */
    save(entity: StorageEntity): Promise<void>;

    /**
     * Query for entities.
     * This is still Work in Progress.
     */
    query<T>(type: { new (): T }, query: string): Promise<any[]>;
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
    query<T extends StorageEntity>(type: { new (): T }): Promise<T[]>;
}

/**
 * Class that represents entity that can be stored in a remote storage.
 * make sure to set the context of the store with setContext().
 */
export abstract class StorageEntity extends Entity {
    private _primaryKeys: PropertyDescriptor[] = [];
    public state: EntityState = EntityState.NOT_LOADED;
    private loadingPromise: Promise<boolean>;
    private deletingPromise: Promise<void>;
    private savePromise: Promise<void>;
    private _error: any;
    private _context: IDataContext;

    /**
     * Initializes new instance of the storage entity.
     */
    constructor() {
        super();

        this.getPropertyDescriptors().forEach(d => {
            if (d.type == PropertyType.PRIMARY) {
                this._primaryKeys.push(d);
            }
        });

        if (this._context) {
            this._context.store.validate(this);
        }
    }

    /**
     * Returns list of primary keys.
     */
    public getPrimaryKeys(): PropertyDescriptor[] {
        return this._primaryKeys.slice(0);
    }

    /**
     * Gets the context. Context provides the store to store entity.
     */
    public getContext(): IDataContext {
        return this._context;
    }

    /**
     * Sets the context that provides store.
     */
    public setContext(v: IDataContext) {
        this._context = v;
        this._context.store.validate(this);
    }

    private getStore(): IDataStore {
        return this._context && this._context.store;
    }

    /**
     * Loads the entity if not loaded yet. Otherwise no-op.
     * Callers should always call load before accessing the entity.
     * Promise returns true if loaded successfully.
     */
    public load(): Promise<boolean> {

        if (this.state === EntityState.NOT_LOADED ||
            this.state === EntityState.LOADED ||
            this.state === EntityState.LOADING) {

            if (this.loadingPromise) {
                return this.loadingPromise;
            }
        } else {
            // Invalid states.
            throw `Can't load(). Entity is in invalid state: ${EntityState[this.state]}.`;
        }

        this.loadingPromise = null;
        this.state = EntityState.LOADING;
        var promise = this.getStore().get(this);

        this.loadingPromise = promise
            .then(v => {
                this.state = v ? EntityState.LOADED : EntityState.NOT_LOADED;
                return v;
            })
            .catch(err => {
                this.state = EntityState.NOT_LOADED;
                this.loadingPromise = null;
                this._error = err;
                throw err;
            });;

        return this.loadingPromise;
    }

    /**
     * Refresh the entity from server.
     * All local changes will be overwritten.
     */
    public refresh(): Promise<void> {
        // If already loaded, force refresh.
        if (this.state === EntityState.LOADED) {
            this.loadingPromise = null;
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
        if (this.state === EntityState.DELETING) {
            if (this.deletingPromise) {
                return this.deletingPromise;
            }
        } else if (this.state == EntityState.DELETED) {
            return Promise.resolve();
        }
        else if (this.state === EntityState.LOADING) {
            throw `Can't delete entity. Invalid state ${EntityState[this.state]}`;
        }

        var currentState = this.state;
        this.state = EntityState.DELETING;
        this.deletingPromise = this.getStore().del(this)
            .then(() => {
                this.state = EntityState.DELETED;
            })
            .catch(err => {
                this.state = currentState;
                this.deletingPromise = null;
                this._error = err;
                throw err;
            });

        return this.deletingPromise;
    }

    /**
     * Saves the entity to remote store. 
     */
    public save(): Promise<void> {
        if (this.state === EntityState.LOADED ||
            this.state === EntityState.NOT_LOADED) {

            if (this.savePromise) {
                return this.savePromise;
            }
        } else {
            throw `Can't save entity: Invalid state: ${EntityState[this.state]}.`;
        }

        if (!this.changed) {
            return Promise.resolve();
        }

        this.savePromise = this.getStore().save(this)
            .then(() => {
                this.state = EntityState.LOADED;
                this.resetState();
            })
            .catch(err => {
                this._error = err;
                throw err;
            });

        return this.savePromise;
    }
}

