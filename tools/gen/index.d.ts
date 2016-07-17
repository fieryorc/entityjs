export enum PropertyType {
    PRIMARY = 0,
    VALUE = 1,
    REFERENCE = 2,
}
export class PropertyDescriptor {
    name: string;
    type: PropertyType;
    referenceType: {
        new (): any;
    };
    required: boolean;
    foreign_key: string;
}
export class PropertyValue {
    descriptor: PropertyDescriptor;
    origValue: any;
    value: any;
    changed: boolean;
}
export function EntityClass(constructor: Function): void;
export function ValueProperty(required?: boolean): (target: any, propertyKey: string) => void;
export function PrimaryKeyProperty(): (target: any, propertyKey: string) => void;
export function ReferenceProperty<T extends Entity>(type: {
    new (): T;
}, required?: boolean, foreign_key?: string): (target: any, propertyKey: string) => void;
export function EntityProperty<T extends Entity>(propertyType: PropertyType, required: boolean, referenceType: {
    new (): T;
}, foreign_key: string): (target: any, propertyKey: string) => void;
export abstract class Entity {
    private _propertyMetadata;
    private _propertyValues;
    private _changed;
    changed: boolean;
    getPropertyValue<T>(name: string): T;
    setPropertyValue<T>(name: string, value: T): void;
    getProperty(name: string): PropertyValue;
    getPropertyDescriptor(name: string): PropertyDescriptor;
    getPropertyDescriptors(): PropertyDescriptor[];
    /**
     * Reset change tracking state.
     */
    resetState(): void;
    /**
     * Returns all properties.
     */
    getAllProperties(): PropertyValue[];
    /**
     * Returns all set properties.
     */
    getProperties(): PropertyValue[];
    /**
     * Returns all set properties.
     */
    getChangedProperties(): PropertyValue[];
    private clone<T>(obj);
}

export enum EntityState {
    /** Not loaded. New entities starts with this state. */
    NOT_LOADED = 0,
    /** Being loaded. */
    LOADING = 1,
    /** Loaded from store. */
    LOADED = 2,
    /** Being deleted. */
    DELETING = 3,
    /** Deleted from store. */
    DELETED = 4,
}
/**
 * Interface that provides storage specific APIs.
 */
export interface IDataStore {
    validate(entity: StorageEntity): void;
    del(entity: StorageEntity): Promise<void>;
    get(entity: StorageEntity): Promise<any>;
    insert(entity: StorageEntity): Promise<any>;
    save(entity: StorageEntity): Promise<any>;
    query<T>(type: {
        new (): T;
    }, query: string): Promise<any[]>;
}
export interface IDataContext {
    store: IDataStore;
    load<T extends StorageEntity>(type: {
        new (): T;
    }): Promise<T>;
    query<T extends StorageEntity>(type: {
        new (): T;
    }): Promise<T[]>;
}
export abstract class StorageEntity extends Entity {
    private _primaryKeys;
    state: EntityState;
    private loadingPromise;
    private deletingPromise;
    private savePromise;
    private _error;
    private _context;
    constructor();
    getPrimaryKeys(): PropertyDescriptor[];
    getContext(): IDataContext;
    setContext(v: IDataContext): void;
    protected getStore(): IDataStore;
    /**
     * Loads the entity if not loaded yet. Otherwise no-op.
     * Callers should always call load before accessing the entity.
     */
    load(): Promise<void>;
    /**
     * Refresh the entity from server.
     * All local changes will be overwritten.
     */
    refresh(): Promise<void>;
    /**
     * Deletes the entity from server.
     */
    delete(): Promise<void>;
    /**
     * Saves the entity to remote store.
     */
    save(): Promise<void>;
}

export abstract class CloudStoreEntity extends StorageEntity {
    kind: string;
    constructor(kind: string);
    private store;
    getKey<T>(): T;
    setKey<T>(value: T): void;
}

export class CloudEntityHelpers {
    /**
     * Provies the object that can be written directly to storage.
     */
    static getStorageObject(entity: CloudStoreEntity): any;
    /**
     * Provies json object that can be publically consumed.
     * Removes internal fields.
     */
    static getPublicObject(entity: CloudStoreEntity): any;
    private static getObject(entity, validate, includeRef, includeKind);
}

export class CloudDataStore implements IDataStore {
    private store;
    constructor(projectId: string);
    validate(entity: StorageEntity): void;
    del(entity: StorageEntity): Promise<void>;
    get(entity: StorageEntity): Promise<any>;
    insert(entity: StorageEntity): Promise<any>;
    save(entity: StorageEntity): Promise<any>;
    query<T>(type: {
        new (): T;
    }, query: string): Promise<any[]>;
    private doInsert(entity, overwrite);
    private convertError(err);
}

export class DataContext implements IDataContext {
    private _store;
    constructor(store: IDataStore);
    store: IDataStore;
    load<T extends StorageEntity>(type: {
        new (): T;
    }): Promise<T>;
    query<T extends StorageEntity>(type: {
        new (): T;
    }): Promise<T[]>;
    /**
     * Creates new entity.
     */
    create<T extends StorageEntity>(type: {
        new (): T;
    }): T;
}

// Dummy import to pretend this file to be a module to tsc.
import * as m from "entityjs";