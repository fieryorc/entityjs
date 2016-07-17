import { Entity, PropertyType, ValueProperty, PropertyDescriptor, EntityClass, EntityProperty } from "./entity";
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
    validate(entity: StorageEntity): void;

    del(entity: StorageEntity): Promise<boolean>;

    get(entity: StorageEntity): Promise<boolean>;

    insert(entity: StorageEntity): Promise<void>;

    save(entity: StorageEntity): Promise<void>;

    query<T>(type: { new (): T }, query: string): Promise<any[]>;
}

export interface IDataContext {
    store: IDataStore;

    load<T extends StorageEntity>(type: { new (): T }): Promise<T>;

    query<T extends StorageEntity>(type: { new (): T }): Promise<T[]>;
}

export abstract class StorageEntity extends Entity {
    private _primaryKeys: PropertyDescriptor[] = [];
    public state: EntityState = EntityState.NOT_LOADED;
    private loadingPromise: Promise<boolean>;
    private deletingPromise: Promise<void>;
    private savePromise: Promise<void>;
    private _error: any;
    private _context: IDataContext;

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

    public getPrimaryKeys(): PropertyDescriptor[] {
        return this._primaryKeys.slice(0);
    }

    public getContext(): IDataContext {
        return this._context;
    }

    public setContext(v: IDataContext) {
        this._context = v;
        this._context.store.validate(this);
    }

    protected getStore(): IDataStore {
        return this._context && this._context.store;
    }

    /**
     * Loads the entity if not loaded yet. Otherwise no-op.
     * Callers should always call load before accessing the entity.
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
    public refresh(): Promise<boolean> {
        // If already loaded, force refresh.
        if (this.state === EntityState.LOADED) {
            this.loadingPromise = null;
        }

        return this.load();
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

