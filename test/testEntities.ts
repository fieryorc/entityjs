import * as Promise from "bluebird";
import { CloudStoreEntity, ValueProperty, ReferenceProperty, PrimaryKeyProperty, DataContext, TempDataStore } from "../main";


export class UserEntity extends CloudStoreEntity {

    public static KIND = "user";

    /**
     * This means the property is a primary key.
     * Every CloudStoreEntity should have one and only primary key.
     */
    @PrimaryKeyProperty()
    public id: string;

    /**
     * This means the property is a value property.
     */
    @ValueProperty()
    public name: string;

    /**
     * Represents reference property.
     * Reference properties are not loaded by default. You need to load explicity using
     * .load() on them.
     */
    @ReferenceProperty(UserEntity)
    public manager: UserEntity;

    public constructor() {
        super(UserEntity.KIND);
    }
}

export type BugStatesType = "NEW" | "ASSIGNED" | "WORKING ON SOLUTION" | "FIXED" | "VERIFIED" | "CLOSED";

export class BugStates {
    public static NEW = "NEW";
    public static ASSIGNED = "ASSIGNED";
    public static WORKING_ON_SOLUTION = "WORKING ON SOLUTION";
    public static FIXED = "FIXED";
    public static VERIFIED = "VERIFIED";
    public static CLOSED = "CLOSED";
}

export class BugEntity extends CloudStoreEntity {
    public static KIND = "bug";

    /**
     * This means the property is a primary key.
     * Every CloudStoreEntity should have one and only primary key.
     */
    @PrimaryKeyProperty()
    public id: string;

    @ReferenceProperty(UserEntity)
    public createdBy: UserEntity;

    @ReferenceProperty(UserEntity)
    public assignedTo: UserEntity;

    @ReferenceProperty(UserEntity)
    public state: BugStates;

    public constructor() {
        super(BugEntity.KIND);
    }
}