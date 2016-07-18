import {  PrimaryKeyProperty } from "./entity";
import { StorageEntity } from "./storageEntity";

/**
 * Represents google cloud data store entity.
 * For more info: https://cloud.google.com/datastore/
 * Has 'kind' property and few helpers.
 */
export abstract class CloudStoreEntity extends StorageEntity {

    @PrimaryKeyProperty()
    public kind: string;

    /**
     * Instantiates new CloudStoreEntity.
     * @param kind Entity kind. Used by google cloud store.
     */
    constructor(kind: string) {
        super();
        this.kind = kind;
    }

    public getKey<T>(): T {
        var propName = this.getPrimaryKeys()[0].name;
        return <T>this.getPropertyValue(propName);
    }

    public setKey<T>(value: T) {
        var propName = this.getPrimaryKeys()[0].name;
        this.setPropertyValue(propName, value);
    }
}