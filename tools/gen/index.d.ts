/**
 * Property types.
 */
export declare enum PropertyType {
    /**
     * Represents primary property.
     */
    PRIMARY = 0,
    /**
     * Value property.
     */
    VALUE = 1,
    /**
     * Reference property.
     */
    REFERENCE = 2,
}
/**
 * Information about the property.
 */
export declare class PropertyDescriptor {
    /**
     * Name of the property.
     */
    name: string;
    /**
     * Property type.
     */
    type: PropertyType;
    /**
     * If it is a reference property, then the reference type.
     */
    referenceType: {
        new (): any;
    };
    /**
     * Is this a required property?
     */
    required: boolean;
    /**
     * If this is reference property, the foreign key.
     */
    foreign_key: string;
}
/**
 * Represents value of the property. You should use getPropertyValue() instead.
 * This is a low level interface.
 */
export declare class PropertyValue {
    /**
     * Property descriptor.
     */
    descriptor: PropertyDescriptor;
    /**
     * Old value of the property.
     */
    origValue: any;
    /**
     * Current value of the property.
     */
    value: any;
    /**
     * True if the property value has changed.
     */
    changed: boolean;
}
/**
 * Decorator representing value property.
 */
export declare function ValueProperty(required?: boolean): (target: any, propertyKey: string) => void;
/**
 * Decorator representing primary key property.
 */
export declare function PrimaryKeyProperty(foreign_key?: string): (target: any, propertyKey: string) => void;
/**
 * Decorator representing reference property.
 *
 * @param type Type of the referencing entity.
 * @param required Is this required property?
 * @param foreign_key Foreign key to the property. Leave null for using the target entities primary key.
 */
export declare function ReferenceProperty<T extends Entity>(type: {
    new (): T;
}, required?: boolean, foreign_key?: string): (target: any, propertyKey: string) => void;
/**
 * Decorator representing property.
 *
 * @param propertyType Type of the entity.
 * @param required Is this required property?
 * @param referenceType Type of reference property.
 * @param foreign_key Foreign key to the property. Leave null for using the target entities primary key.
 */
export declare function EntityProperty<T extends Entity>(propertyType: PropertyType, required: boolean, referenceType: {
    new (): T;
}, foreign_key: string): (target: any, propertyKey: string) => void;
/**
 * Class that represents the entity. Entity objects provide a way to declare properties
 * using decorators, and provide change tracking.
 */
export declare abstract class Entity {
    private _propertyMetadata;
    private _propertyValues;
    private _changed;
    /**
     * Returns true if the entity has changed.
     * i.e., any property has changed.
     */
    getChanged(): boolean;
    /**
     * Returns the value of a property.
     * @param name Name of the property.
     */
    getPropertyValue<T>(name: string): T;
    /**
     * Sets the value of the property.
     * @pararm name Name of the property.
     * @param value Value of the property.
     * This method should not be consumed directly. Just set the properties directly.
     */
    setPropertyValue<T>(name: string, value: T): void;
    /**
     * Returns the named property.
     * @param name Name of the property.
     */
    getProperty(name: string): PropertyValue;
    /**
     * Gets the property descriptor (metadata).
     * @param name Name of the property.
     */
    getPropertyDescriptor(name: string): PropertyDescriptor;
    /**
     * Returns all property descriptors.
     */
    getPropertyDescriptors(): PropertyDescriptor[];
    /**
     * Reset change tracking state.
     * Call this method to reset change tracking.
     */
    resetState(): void;
    /**
     * Returns all property values.
     */
    getProperties(): PropertyValue[];
    /**
     * Returns all changed properties (since last resetState()).
     */
    getChangedProperties(): PropertyValue[];
    private clone<T>(obj);
}

export declare enum EntityState {
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
    query<T>(type: {
        new (): T;
    }, query: string): Promise<any[]>;
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
    load<T extends StorageEntity>(type: {
        new (): T;
    }): Promise<T>;
    /**
     * Query for entities.
     */
    query<T extends StorageEntity>(type: {
        new (): T;
    }): Promise<T[]>;
}
/**
 * Class that represents entity that can be stored in a remote storage.
 * make sure to set the context of the store with setContext().
 */
export declare abstract class StorageEntity extends Entity {
    private _primaryKeys;
    private _entityState;
    private _loadingPromise;
    private _deletingPromise;
    private _savePromise;
    private _insertPromise;
    private _error;
    private _context;
    /**
     * Initializes new instance of the storage entity.
     */
    constructor();
    /**
     * Get the current state of the entitye.
     */
    getState(): EntityState;
    /**
     * Sets the entity state.
     */
    private setState(state);
    /**
     * Returns list of primary keys.
     */
    getPrimaryKeys(): PropertyDescriptor[];
    /**
     * Gets the context. Context provides the store to store entity.
     */
    getContext(): IDataContext;
    /**
     * Sets the context that provides store.
     */
    setContext(v: IDataContext): void;
    private getStore();
    /**
     * Loads the entity if not loaded yet. Otherwise no-op.
     * Callers should always call load before accessing the entity.
     * Promise returns true if loaded successfully.
     */
    load(): Promise<boolean>;
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
     * @param insert If true, save will fail if already exists.
     */
    save(): Promise<void>;
    /**
     * Insert this entity into the data store.
     * If already exists, will fail.
     */
    insert(): Promise<boolean>;
    private _save(overwrite);
}

/**
 * Represents google cloud data store entity.
 * For more info: https://cloud.google.com/datastore/
 * Has 'kind' property and few helpers.
 */
export declare abstract class CloudStoreEntity extends StorageEntity {
    kind: string;
    /**
     * Instantiates new CloudStoreEntity.
     * @param kind Entity kind. Used by google cloud store.
     */
    constructor(kind: string);
    private static getPrimaryKeyName(type);
    private static getDescriptors(entity);
}

export declare class EntityHelpers {
    static getObject(entity: StorageEntity, validate: boolean, includeRef: boolean, excludeProperties: string[]): any;
    static loadObject(entity: StorageEntity, obj: any, excludeProperties?: string[]): Promise<void>;
    static getPrimaryKeyValue<T>(entity: StorageEntity): T;
    static setPrimaryKeyValue<T>(entity: StorageEntity, value: T): void;
    private static getReferenceStorageValue<T>(entity, desc);
    private static setReferenceProperty<T>(entity, desc, value);
    private static convertArrayToMap(list);
}

/**
 * Implements Google Cloud Datastore.
 * Any entity of type CloudStoreEntity can use this store.
 */
export declare class CloudDataStore implements IDataStore {
    private store;
    constructor(projectId: string);
    validate(entity: StorageEntity): void;
    del(entity: StorageEntity): Promise<boolean>;
    get(entity: StorageEntity): Promise<boolean>;
    insert(entity: StorageEntity): Promise<boolean>;
    save(entity: StorageEntity): Promise<void>;
    query<T>(type: {
        new (): T;
    }, query: string): Promise<any[]>;
    private doInsert(entity, overwrite);
    private convertError(err);
    private getKey<T>(entity);
}

/**
 * Provides context for entities. Context provides the remote store.
 */
export declare class DataContext implements IDataContext {
    private _store;
    constructor(store: IDataStore);
    /**
     * Gets the store object.
     */
    store: IDataStore;
    /**
     * Loads a given entity.
     */
    load<T extends StorageEntity>(type: {
        new (): T;
    }): Promise<T>;
    /**
     * Query for entities using the query string.
     */
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

/**
 * Implements Temporary store based on object storage.
 * Any StorageEntity can use this store.
 */
export declare class TempDataStore implements IDataStore {
    private store;
    constructor(obj?: any);
    validate(entity: StorageEntity): void;
    del(entity: StorageEntity): Promise<boolean>;
    get(entity: StorageEntity): Promise<boolean>;
    insert(entity: StorageEntity): Promise<boolean>;
    save(entity: StorageEntity): Promise<void>;
    query<T>(type: {
        new (): T;
    }, query: string): Promise<any[]>;
    private doInsert(entity, overwrite);
    private getKey(entity);
}

