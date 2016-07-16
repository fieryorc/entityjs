export enum PropertyType {
    PRIMARY,
    VALUE,
    REFERENCE
}

export class PropertyDescriptor {
    public name: string;
    public type: PropertyType;
    public referenceType: { new (): any };
    public required: boolean;
    public foreign_key: string;
}

export class PropertyValue {
    public descriptor: PropertyDescriptor;
    public origValue: any;
    public value: any;
    public changed: boolean;
}

export function EntityClass(constructor: Function) {
    constructor.prototype.propertyMetadata = {};
}

export function ValueProperty(required?: boolean) {
    return EntityProperty(PropertyType.VALUE, !!required, null, null);
}

export function PrimaryKeyProperty() {
    return EntityProperty(PropertyType.PRIMARY, true, null, null);
}

export function ReferenceProperty<T extends Entity>(
    type: { new (): T; },
    required?: boolean,
    foreign_key?: string) {

    return EntityProperty(PropertyType.REFERENCE, required, type, foreign_key);
}

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

        // Setup the prototype chain so the property descriptors from
        // base classes are wired up with the ones in subclasses.
        var mapPropertyName = "_propertyMetadata";
        var baseValue = target[mapPropertyName];
        if (!target.hasOwnProperty(mapPropertyName)) {
            function clone_proto() { };
            clone_proto.prototype = baseValue;
            target[mapPropertyName] = new (<any>clone_proto)();
        }

        target._propertyMetadata[propertyKey] = descriptor;
    }
}

@EntityClass
export abstract class Entity {
    private _propertyMetadata: CommonTypes.IDictionary<PropertyDescriptor>;
    private _propertyValues: CommonTypes.IDictionary<PropertyValue> = {};
    private _changed: boolean;

    public get changed(): boolean {
        return this._changed;
    }

    public getPropertyValue<T>(name: string): T {
        var prop = this._propertyValues[name];
        return prop && prop.value;
    }

    public setPropertyValue<T>(name: string, value: T): void {
        var valueMap = this._propertyValues;
        var prop = valueMap[name];
        if (!prop) {
            prop = valueMap[name] = <PropertyValue>{
                descriptor: this.getPropertyDescriptor(name)
            };
        }

        this._changed = true;
        prop.origValue = prop.value;
        prop.value = value;
        prop.changed = true;
    }

    public getProperty(name: string): PropertyValue {
        return this._propertyValues[name];
    }

    public getPropertyDescriptor(name: string): PropertyDescriptor {
        var descriptor = this._propertyMetadata[name];
        return descriptor && this.clone(descriptor);
    }

    public getPropertyDescriptors(): PropertyDescriptor[] {
        var descriptors: PropertyDescriptor[] = [];
        var obj = this._propertyMetadata;
        for (var key in obj) {
            descriptors.push(this.clone(obj[key]));
        }

        return descriptors;
    }

    /**
     * Reset change tracking state.
     */
    public resetState(): void {
        this.getAllProperties().forEach((pv) => { pv.changed = false; });
        this._changed = false;
    }

    /**
     * Returns all properties.
     */
    public getAllProperties(): PropertyValue[] {
        var props: PropertyValue[] = [];
        var obj = this._propertyValues;
        for (var propKey in obj) {
            props.push(obj[propKey]);
        }

        return props;
    }

    /**
     * Returns all set properties.
     */
    public getProperties(): PropertyValue[] {
        var props: PropertyValue[] = [];
        var obj = this._propertyValues;
        for (var propKey in obj) {
            if (obj.hasOwnProperty(propKey)) {
                props.push(obj[propKey]);
            }
        }

        return props;
    }

    /**
     * Returns all set properties.
     */
    public getChangedProperties(): PropertyValue[] {
        var props: PropertyValue[] = [];
        var obj = this._propertyValues;
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
