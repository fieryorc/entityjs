import {
    IEntityPrivate,
    Entity,
    PrimaryKeyProperty,
    PropertyType,
    PropertyDescriptor } from "./entity";
import { IQueryBuilder, StorageEntity } from "./storageEntity";

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
        var descriptors = CloudStoreEntity.getDescriptors(this);
        for (var key in descriptors) {
            var d = descriptors[key];
            if (d.type === PropertyType.REFERENCE && !d.foreign_key) {
                d.foreign_key = CloudStoreEntity.getPrimaryKeyName(d.referenceType);
            }
        }
    }

    private static getPrimaryKeyName(type: { new (): any }): string {
        var descriptors = CloudStoreEntity.getDescriptors(type.prototype);

        var primaryKeys: string[] = [];
        for (var key in descriptors) {
            var d = descriptors[key];
            if (d.type == PropertyType.PRIMARY && d.name != "kind") {
                primaryKeys.push(d.name);
            }
        }
        if (primaryKeys.length > 1) {
            throw `Only one primary key allowed. Entity(${type}) has ${primaryKeys.length}.`;
        }
        return primaryKeys[0];
    }

    private static getPrimaryKeyFromDescriptor(descriptors: CommonTypes.IDictionary<PropertyDescriptor>, type: string): string {
        var primaryKeys: string[] = [];
        for (var key in descriptors) {
            var d = descriptors[key];
            if (d.type == PropertyType.PRIMARY && d.name != "kind") {
                primaryKeys.push(d.name);
            }
        }
        if (primaryKeys.length > 1) {
            throw `Only one primary key allowed. Entity(${type}) has ${primaryKeys.length}.`;
        }
        return primaryKeys[0];
    }

    private static getDescriptors(entity: Entity): CommonTypes.IDictionary<PropertyDescriptor> {
        return entity.getPrivate().propertyMetadata;
    }

    public getQueryObject(): IQueryBuilder {
        CloudStoreEntity
        var primaryKey = CloudStoreEntity.getPrimaryKeyFromDescriptor(CloudStoreEntity.getDescriptors(this), this.kind);
        return {
            kind: this.kind,
            key: primaryKey
        };
    }
}