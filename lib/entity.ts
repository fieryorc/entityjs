/**
 * Property types.
 */
export enum PropertyType {
    /**
     * Represents primary property.
     */
    PRIMARY,

    /**
     * Value property.
     */
    VALUE,

    /**
     * Reference property.
     */
    REFERENCE
}

/**
 * Information about the property.
 */
export class PropertyDescriptor {
    /**
     * Name of the property.
     */
    public name: string;

    /** 
     * Property type.
     */
    public type: PropertyType;

    /**
     * If it is a reference property, then the reference type.
     */
    public referenceType: { new (): any };

    /**
     * Is this a required property?
     */
    public required: boolean;

    /**
     * If this is reference property, the foreign key.
     */
    public foreign_key: string;
}

/**
 * Represents value of the property. You should use getPropertyValue() instead.
 * This is a low level interface.
 */
export class PropertyValue {
    /**
     * Property descriptor.
     */
    public descriptor: PropertyDescriptor;

    /**
     * Old value of the property.
     */
    public origValue: any;

    /**
     * Current value of the property.
     */
    public value: any;

    /**
     * True if the property value has changed.
     */
    public changed: boolean;
}

/**
 * Decorator for Entity classes.
 */
function EntityClass(constructor: Function) {
    constructor.prototype.propertyMetadata = {};
}

/**
 * Decorator representing value property.
 */
export function ValueProperty(required?: boolean) {
    return EntityProperty(PropertyType.VALUE, !!required, null, null);
}

/**
 * Decorator representing primary key property.
 */
export function PrimaryKeyProperty(foreign_key?: string) {
    return EntityProperty(PropertyType.PRIMARY, true, null, null);
}

/**
 * Decorator representing reference property.
 * 
 * @param type Type of the referencing entity.
 * @param required Is this required property?
 * @param foreign_key Foreign key to the property. Leave null for using the target entities primary key.
 */
export function ReferenceProperty<T extends Entity>(
    type: { new (): T; },
    required?: boolean,
    foreign_key?: string) {

    return EntityProperty(PropertyType.REFERENCE, required, type, foreign_key);
}

/**
 * Decorator representing property.
 * 
 * @param propertyType Type of the entity.
 * @param required Is this required property?
 * @param referenceType Type of reference property.
 * @param foreign_key Foreign key to the property. Leave null for using the target entities primary key.
 */
export function EntityProperty<T extends Entity>(
    propertyType: PropertyType,
    required: boolean,
    referenceType: { new (): T },
    foreign_key: string) {

    return function (target: any, propertyKey: string) {
        Object.defineProperty(target, propertyKey, {
            enumerable: true,
            get: function () {
                return this.getPropertyValue(propertyKey);
            },
            set: function (v) {
                this.setPropertyValue(propertyKey, v);
            }
        });
        var descriptor = <PropertyDescriptor>{
            name: propertyKey,
            required: required,
            type: propertyType,
        };

        if (propertyType == PropertyType.REFERENCE) {
            descriptor.referenceType = referenceType;
            if (foreign_key) {
                descriptor.foreign_key = foreign_key;
            }
        }

        // Setup the prototype chain.
        // Create getPrivate method for each prototype and set it's prototype to it's parent.
        var baseValue = target.getPrivate();
        if (!target.hasOwnProperty("getPrivate")) {
            var obj = baseValue ? chain(baseValue) : {};
            target.getPrivate = function () {
                return obj;
            }
            obj.propertyMetadata = {};
            // Set prototype chain for the propertyMetadata object.
            if (baseValue) {
                if (!baseValue.propertyMetadata) {
                    throw "Internal error. Property metadata for base object is not initialized. This should never happen.";
                }
                obj.propertyMetadata = chain(baseValue.propertyMetadata);
            }
        }

        target.getPrivate().propertyMetadata[propertyKey] = descriptor;
    }
}

function chain(source: any) {
    function clone() { };
    clone.prototype = source;
    return new (<any>clone)();
}

export interface IEntityPrivate {
    propertyMetadata: CommonTypes.IDictionary<PropertyDescriptor>;
    propertyValues: CommonTypes.IDictionary<PropertyValue>;
    changed: boolean;
}

/**
 * Class that represents the entity. Entity objects provide a way to declare properties
 * using decorators, and provide change tracking. 
 */
@EntityClass
export abstract class Entity {

    public constructor() {
        var obj = chain(Object.getPrototypeOf(this).getPrivate());
        (<any>this).getPrivate = function () {
            return obj;
        };
        this.getPrivate().propertyValues = {};
    }

    /**
     * Returns the private object that contains all the metadata.
     */
    public getPrivate(): IEntityPrivate {
        return null;
    }

    /**
     * Returns true if the entity has changed.
     * i.e., any property has changed.
     */
    public getChanged(): boolean {
        return this.getPrivate().changed;
    }

    /**
     * Returns the value of a property.
     * @param name Name of the property.
     */
    public getPropertyValue<T>(name: string): T {
        var prop = this.getPrivate().propertyValues[name];
        return prop && prop.value;
    }

    /**
     * Sets the value of the property.
     * @pararm name Name of the property.
     * @param value Value of the property.
     * This method should not be consumed directly. Just set the properties directly.
     */
    public setPropertyValue<T>(name: string, value: T): void {
        var valueMap = this.getPrivate().propertyValues;
        var prop = valueMap[name];
        if (!prop) {
            prop = valueMap[name] = <PropertyValue>{
                descriptor: this.getPropertyDescriptor(name)
            };
        }

        this.getPrivate().changed = true;
        prop.origValue = prop.value;
        prop.value = value;
        prop.changed = true;
    }

    /**
     * Returns the named property.
     * @param name Name of the property.
     */
    public getProperty(name: string): PropertyValue {
        return this.getPrivate().propertyValues[name];
    }

    /**
     * Gets the property descriptor (metadata).
     * @param name Name of the property.
     */
    public getPropertyDescriptor(name: string): PropertyDescriptor {
        var descriptor = this.getPrivate().propertyMetadata[name];
        return descriptor && this.clone(descriptor);
    }

    /**
     * Returns all property descriptors.
     */
    public getPropertyDescriptors(): PropertyDescriptor[] {
        var descriptors: PropertyDescriptor[] = [];
        var obj = this.getPrivate().propertyMetadata;
        for (var key in obj) {
            descriptors.push(this.clone(obj[key]));
        }

        return descriptors;
    }

    /**
     * Reset change tracking state.
     * Call this method to reset change tracking.
     */
    public resetState(): void {
        this.getProperties().forEach((pv) => { pv.changed = false; });
        this.getPrivate().changed = false;
    }

    /**
     * Returns all property values.
     */
    public getProperties(): PropertyValue[] {
        var props: PropertyValue[] = [];
        var obj = this.getPrivate().propertyValues;
        for (var propKey in obj) {
            if (obj.hasOwnProperty(propKey)) {
                props.push(obj[propKey]);
            }
        }

        return props;
    }

    /**
     * Returns all changed properties (since last resetState()).
     */
    public getChangedProperties(): PropertyValue[] {
        var props: PropertyValue[] = [];
        var obj = this.getPrivate().propertyValues;
        for (var propKey in obj) {
            var p: PropertyValue = obj[p.descriptor.name];
            if (p.changed) {
                props.push(p);
            }
        }

        return props;
    }

    private clone<T>(obj: T): T {
        function cloned() { };
        cloned.prototype = obj;
        return new (<any>cloned)();
    }
}
