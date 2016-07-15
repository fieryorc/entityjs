import { Entity, PropertyType, ValueProperty, PropertyDescriptor, EntityClass, EntityProperty, PrimaryKeyProperty } from "./entity";
import { IDataContext, IDataStore, StorageEntity } from "./storageEntity";
import * as Promise from "bluebird";

export abstract class CloudStoreEntity extends StorageEntity {

    @ValueProperty()
    public kind: string;

    constructor(kind: string) {
        super();
        this.kind = kind;
    }

    private get store(): IDataStore {
        return this.getContext().store;
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