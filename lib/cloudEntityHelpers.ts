import * as gcloud from "gcloud";
import * as Promise from "bluebird";
import { PropertyType, PropertyDescriptor } from "./entity";
import { CloudStoreEntity } from "./cloudStoreEntity";
import { StorageEntity } from "./storageEntity";

export class CloudEntityHelpers {
	/**
     * Provies the object that can be written directly to storage.
     */
    public static getStorageObject(entity: CloudStoreEntity): any {
        return this.getObject(entity, true, true, false);
    }

    /**
     * Provies json object that can be publically consumed.
     * Removes internal fields.
     */
    public static getPublicObject(entity: CloudStoreEntity): any {
        return this.getObject(entity, true, true, true);
    }

    private static getObject(entity: CloudStoreEntity, validate: boolean, includeRef: boolean, includeKind: boolean): any {
        var result: any = {};

        entity.getProperties().forEach((p) => {
            var type = p.descriptor.type;
            var name = p.descriptor.name;

            if (name === "kind") {
                if (includeKind) {
                    result[name] = p.value;
                }
            } else if (type == PropertyType.VALUE || type == PropertyType.PRIMARY) {
                result[name] = p.value;
            } else if (type == PropertyType.REFERENCE) {
                if (includeRef) {
                    var refObj = <CloudStoreEntity>p.value;
                    if (refObj) {
                        result[name] = refObj.getKey();
                    }
                }
            }

            if (validate && p.descriptor.required && !result[name]) {
                throw `Required property '${name}' not set.`;
            }
        });

        return result;
    }

    public static loadObject(entity: StorageEntity, obj: any): Promise<void> {
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                throw `load():Entity doesn't have property ${key}.`;
            }

            var descriptor = entity.getPropertyDescriptor(key);
            if (descriptor) {
                if (descriptor.type === PropertyType.PRIMARY ||
                    descriptor.type === PropertyType.VALUE) {

                    entity.setPropertyValue(descriptor.name, obj[key]);
                } else if (descriptor.type === PropertyType.REFERENCE) {
                    var refEntity: CloudStoreEntity = new descriptor.referenceType();
                    refEntity.setKey(obj[key]);
                }
            }
        }

        entity.resetState();
        return Promise.resolve();
    }
}