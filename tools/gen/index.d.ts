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
export interface IEntityPrivate {
    propertyMetadata: CommonTypes.IDictionary<PropertyDescriptor>;
    propertyValues: CommonTypes.IDictionary<PropertyValue>;
    changed: boolean;
}
/**
 * Class that represents the entity. Entity objects provide a way to declare properties
 * using decorators, and provide change tracking.
 */
export declare abstract class Entity {
    constructor();
    /**
     * Returns the private object that contains all the metadata.
     */
    getPrivate(): IEntityPrivate;
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

export declare class EntityHelpers {
    static getObject(entity: StorageEntity, validate: boolean, includeRef: boolean, excludeProperties: string[]): any;
    static loadObject(entity: StorageEntity, obj: any, excludeProperties?: string[]): Promise<void>;
    static getPrimaryKeyValue<T>(entity: StorageEntity): T;
    static setPrimaryKeyValue<T>(entity: StorageEntity, value: T): void;
    private static getReferenceStorageValue<T>(entity, desc);
    private static setReferenceProperty<T>(entity, desc, value);
    private static convertArrayToMap(list);
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
    create<T extends StorageEntity>(type: {
        new (): T;
    }): T;
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
    }, query: IQueryBuilder): Promise<T[]>;
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
export declare abstract class StorageEntity extends Entity {
    /**
     * Initializes new instance of the storage entity.
     */
    constructor();
    getPrivate(): IStorageEntityPrivate;
    /**
     * Get the current state of the entitye.
     */
    getState(): EntityState;
    /**
     * Sets the entity state.
     */
    setState(state: EntityState): void;
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
    setContext(context: IDataContext): void;
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
     * If already exists, will return false.
     * Promise will fail when there are other errors.
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
    private static getPrimaryKeyFromDescriptor(descriptors, type);
    private static getDescriptors(entity);
}

export declare class CloudDataStoreQueryBuilder implements IQueryBuilder {
    private _kind;
    private _filters;
    kind(kind: string): this;
    filter(property: string, value: string): CloudDataStoreQueryBuilder;
    filter(property: string, operator: string, value: string): CloudDataStoreQueryBuilder;
    getQueryString(): string;
}
/**
 * Implements Google Cloud Datastore.
 * Any entity of type CloudStoreEntity can use this store.
 */
export declare class CloudDataStore implements IDataStore {
    private store;
    constructor(projectId: string);
    validate(entity: StorageEntity): void;
    getKey(entity: StorageEntity): IEntityKey;
    getData(entity: StorageEntity): IEntityData;
    del(key: IEntityKey): Promise<void>;
    get(key: IEntityKey): Promise<IEntityData>;
    insert(key: IEntityKey, data: IEntityData): Promise<boolean>;
    save(key: IEntityKey, data: IEntityData): Promise<void>;
    query<T>(builder: IQueryBuilder): Promise<IEntityData[]>;
    private doInsert(key, data, overwrite);
    private convertError(err);
    private getPrimaryKeyValue<T>(entity);
}

/**
 * Provides context for entities. Context provides the remote store.
 */
export declare class DataContext implements IDataContextExtended {
    private _useCache;
    private _store;
    private _entityMap;
    private _dataCache;
    constructor(store: IDataStore, disableCache?: boolean);
    /**
     * Gets the store object.
     */
    store: IDataStore;
    /**
     * Creates new entity.
     */
    create<T extends StorageEntity>(type: {
        new (): T;
    }): T;
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
    }, query: IQueryBuilder): Promise<T[]>;
    /**
     * Save all the entities in the context.
     */
    save(entities: StorageEntity[]): Promise<void[]>;
    /**
     * Checks if the entity is part of the context.
     */
    has(entity: StorageEntity): boolean;
    _key(entity: StorageEntity): IEntityKey;
    _data(entity: StorageEntity): IEntityData;
    _add(entity: StorageEntity): void;
    _remove(entity: StorageEntity): void;
    _get(key: IEntityKey): Promise<IEntityData>;
    _del(key: IEntityKey): Promise<void>;
    _insert(key: IEntityKey, data: IEntityData): Promise<boolean>;
    _save(key: IEntityKey, data: IEntityData): Promise<void>;
}

/**
 * Implements Temporary store based on object storage.
 * Any StorageEntity can use this store.
 */
export declare class TempDataStore implements IDataStore {
    private store;
    constructor(obj?: any);
    validate(entity: StorageEntity): void;
    getKey(entity: StorageEntity): IEntityKey;
    getData(entity: StorageEntity): any;
    del(key: IEntityKey): Promise<void>;
    get(key: IEntityKey): Promise<any>;
    insert(key: IEntityKey, data: any): Promise<boolean>;
    save(key: IEntityKey, data: any): Promise<void>;
    query<T>(builder: IQueryBuilder): Promise<any[]>;
    private doInsert(key, data, overwrite);
}

