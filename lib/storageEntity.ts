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
    insert(entity: StorageEntity): Promise<boolean>;

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
    private _entityState: EntityState = EntityState.NOT_LOADED;
    private _loadingPromise: Promise<boolean>;
    private _deletingPromise: Promise<void>;
    private _savePromise: Promise<void>;
    private _insertPromise: Promise<boolean>;
    private _error: any;
    private _context: IDataContext;

    /**
     * Initializes new instance of the storage entity.
     */
    public constructor() {
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
     * Get the current state of the entitye.
     */
    public getState(): EntityState {
        return this._entityState;
    }

    /**
     * Sets the entity state.
     */
    private setState(state: EntityState) {
        this._entityState = state;
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
    public setContext(context: IDataContext) {
        if (!context) {
            throw "setContext(): empty context."
        }

        this._context = context;
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

        if (this.getState() === EntityState.NOT_LOADED ||
            this.getState() === EntityState.LOADED ||
            this.getState() === EntityState.LOADING) {

            if (this._loadingPromise) {
                return this._loadingPromise;
            }
        } else {
            // Invalid states.
            throw `Can't load(). Entity is in invalid state: ${EntityState[this.getState()]}.`;
        }

        this._loadingPromise = null;
        this.setState(EntityState.LOADING);
        var promise = this.getStore().get(this);

        this._loadingPromise = promise
            .then(v => {
                this.setState(v ? EntityState.LOADED : EntityState.NOT_LOADED);
                return v;
            })
            .catch(err => {
                this.setState(EntityState.NOT_LOADED);
                this._loadingPromise = null;
                this._error = err;
                throw err;
            });;

        return this._loadingPromise;
    }

    /**
     * Refresh the entity from server.
     * All local changes will be overwritten.
     */
    public refresh(): Promise<void> {
        // If already loaded, force refresh.
        if (this.getState() === EntityState.LOADED) {
            this._loadingPromise = null;
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
            if (this._deletingPromise) {
                return this._deletingPromise;
            }
        } else if (!(this.getState() == EntityState.NOT_LOADED ||
            this.getState() == EntityState.LOADED)) {

            throw `Can't delete entity. Invalid state ${EntityState[this.getState()]}`;
        }

        var currentState = this.getState();
        this.setState(EntityState.DELETING);
        this._deletingPromise = this.getStore().del(this)
            .then(() => {
                this.setState(EntityState.DELETED);
                this.resetState();
            })
            .catch(err => {
                this.setState(currentState);
                this._deletingPromise = null;
                this._error = err;
                throw err;
            });

        return this._deletingPromise;
    }

    /**
     * Saves the entity to remote store.
     * @param insert If true, save will fail if already exists. 
     */
    public save(): Promise<void> {
        if (this._insertPromise) {
            Promise.reject("Can't save entity. insert() already in progress.");
            return;
        }

        if (this._savePromise) {
            return this._savePromise;
        }
        var promise = this._save(/* overwrite */ true)
            .then(() => {
                this._savePromise = null;
            })
            .catch((err) => {
                this._savePromise = null;
                throw err;
            });

        this._savePromise = promise;
        return promise;
    }

    /**
     * Insert this entity into the data store.
     * If already exists, will fail.
     */
    public insert(): Promise<boolean> {
        if (this._insertPromise) {
            return this._insertPromise;
        }

        if (this._savePromise) {
            Promise.reject("Can't insert entity. Save in progress.");
            return;
        }

        var promise = this._save(/* overwrite */ false)
            .then((v) => {
                this._insertPromise = null;
                return v;
            })
            .catch((err) => {
                this._insertPromise = null;
                throw err;
            });

        this._insertPromise = promise;
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
                this._error = err;
                throw err;
            });
    }
}

