import * as gcloud from "gcloud";
import * as Promise from "bluebird";
import { PropertyType, PropertyDescriptor } from "./entity";
import { StorageEntity } from "./storageEntity";

export class EntityHelpers {

    public static getObject(entity: StorageEntity, validate: boolean, includeRef: boolean, excludeProperties: string[]): any {
        var result: any = {};
        var excludeMap = EntityHelpers.convertArrayToMap(excludeProperties);

        excludeProperties.forEach(p => { excludeMap[p] = true; });
        entity.getProperties().forEach((p) => {
            var type = p.descriptor.type;
            var name = p.descriptor.name;

            if (name in excludeMap) {
                return;
            } else if (type == PropertyType.VALUE || type == PropertyType.PRIMARY) {
                result[name] = p.value;
            } else if (type == PropertyType.REFERENCE) {
                if (includeRef) {
                    result[name] = EntityHelpers.getReferenceStorageValue(entity, p.descriptor);
                }
            }

            if (validate && p.descriptor.required && !result[name]) {
                throw `Required property '${name}' not set.`;
            }
        });

        return result;
    }

    public static loadObject(entity: StorageEntity, obj: any, excludeProperties?: string[]): Promise<void> {
        var excludeMap = EntityHelpers.convertArrayToMap(excludeProperties);

        for (var key in obj) {
            if (key in excludeMap) {
                continue;
            }

            if (!obj.hasOwnProperty(key)) {
                throw `load():Entity doesn't have property ${key}.`;
            }

            var descriptor = entity.getPropertyDescriptor(key);
            if (descriptor) {
                if (descriptor.type === PropertyType.PRIMARY ||
                    descriptor.type === PropertyType.VALUE) {

                    entity.setPropertyValue(descriptor.name, obj[key]);
                } else if (descriptor.type === PropertyType.REFERENCE) {
                    EntityHelpers.setReferenceProperty<string>(entity, descriptor, obj[key]);
                }
            }
        }

        entity.resetState();
        return Promise.resolve();
    }

    public static getPrimaryKeyValue<T>(entity: StorageEntity): T {
        var primaryKeyDescriptors = entity.getPrimaryKeys();
        if (primaryKeyDescriptors.length != 1) {
            throw `getPrimaryKeyValue(): Only one primary key allowed. Found ${primaryKeyDescriptors.length}`;
        }
        return entity.getPropertyValue<T>(primaryKeyDescriptors[0].name);
    }

    public static setPrimaryKeyValue<T>(entity: StorageEntity, value: T): void {
        var primaryKeyDescriptors = entity.getPrimaryKeys();
        if (primaryKeyDescriptors.length != 1) {
            throw `setPrimaryKeyValue(): Only one primary key allowed. Found ${primaryKeyDescriptors.length}`;
        }
        entity.setPropertyValue(primaryKeyDescriptors[0].name, value);
    }

    private static getReferenceStorageValue<T>(entity: StorageEntity, desc: PropertyDescriptor): T {
        var refEntity: StorageEntity = entity.getPropertyValue<StorageEntity>(desc.name);

        if (!refEntity) {
            return null;
        }

        if (desc.foreign_key) {
            return refEntity.getPropertyValue<T>(desc.foreign_key);
        } else {
            return EntityHelpers.getPrimaryKeyValue<T>(refEntity);
        }
    }

    private static setReferenceProperty<T>(entity: StorageEntity, desc: PropertyDescriptor, value: T): void {
        var refEntity: StorageEntity = new desc.referenceType();
        entity.setPropertyValue(desc.name, refEntity);

        if (desc.foreign_key) {
            refEntity.setPropertyValue(desc.foreign_key, value);
        } else {
            EntityHelpers.setPrimaryKeyValue<T>(refEntity, value);
        }
    }

    private static convertArrayToMap(list: string[]): CommonTypes.IDictionary<boolean> {
        list = list || [];
        var map: CommonTypes.IDictionary<boolean> = {};
        list.forEach(p => { map[p] = true; });
        return map;
    }
}