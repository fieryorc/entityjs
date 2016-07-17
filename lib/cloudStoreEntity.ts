import {  ValueProperty } from "./entity";
import { StorageEntity } from "./storageEntity";

/**
 * Represents google cloud store entity.
 * Has 'kind' property and few helpers.
 */
export abstract class CloudStoreEntity extends StorageEntity {

    @ValueProperty()
    public kind: string;

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