import * as gcloud from "gcloud";
import * as Promise from "bluebird";
import { PropertyType, PropertyDescriptor } from "./entity";
import { CloudStoreEntity } from "./cloudStoreEntity";

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
        var result:any = {};

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
}