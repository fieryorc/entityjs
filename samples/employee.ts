// You should import "entityjs"
import { CloudStoreEntity, ValueProperty, ReferenceProperty, PrimaryKeyProperty, DataContext, TempDataStore } from "../main";
import * as Promise from "bluebird";

/*
 * This sample provides a simple demonstration of using the StorageEntities in entityjs.
 */

class EmployeeEntity extends CloudStoreEntity {

    public static KIND = "employee";

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
    @ReferenceProperty(EmployeeEntity)
    public manager: EmployeeEntity;

    public constructor() {
        super(EmployeeEntity.KIND);
    }
}


class EmployeeHelper {
    private context: DataContext;

    public constructor(context: DataContext) {
        this.context = context;
    }

    /**
     * Adds a new employee to the database. If employee already exists,
     * fails.
     */
    public addEmployee(id: string, name: string): Promise<EmployeeEntity> {
        var employee = new EmployeeEntity();
        employee.setContext(this.context);
        employee.id = id;
        return employee.load()
            .then((isLoaded: boolean) => {
                if (isLoaded) {
                    throw `Employee with id(${id}) already exists.`;
                }
                employee.name = name;
                return employee.save();
            })
            .then(() => {
                return employee;
            });
    }

    /**
     * Set manager for an employee.
     */
    public setManager(id: string, managerId: string): Promise<void> {
        var employee = new EmployeeEntity();
        employee.setContext(this.context);
        employee.id = id;

        var manager = new EmployeeEntity();
        manager.setContext(this.context);
        manager.id = managerId;

        return employee.load()
            .then(isLoaded => {
                if (!isLoaded) {
                    throw `Employee id(${id} doesn't exist.`;
                }
                return manager.load();
            })
            .then(isManagerLoaded => {
                if (!isManagerLoaded) {
                    throw `Manager id(${managerId} doesn't exist.`;
                }
                employee.manager = manager;
                return employee.save();
            });
    }

    /**
     * Removes the employee from the database.
     */
    public removeEmployee(id: string): Promise<void> {
        var employee = new EmployeeEntity();
        employee.setContext(this.context);
        employee.id = id;

        return employee.delete();
    }

    /**
     * Gets the employee from the database.
     */
    public getEmployee(id: string): Promise<EmployeeEntity> {
        var employee = new EmployeeEntity();
        employee.setContext(this.context);
        employee.id = id;

        return employee.load()
            .then(isLoaded => employee);
    }
}

// Create memory based data store.
var storeBacking = {};
var helper = new EmployeeHelper(new DataContext(new TempDataStore(storeBacking)));
// For creating google cloud datatstore, use the following.
// var helper = new EmployeeHelper(new DataContext(new CloudDataStore("google-project-id")));

var employee: EmployeeEntity;
helper
    .addEmployee("prem", "Prem Ramanathan")
    .then(() => {
        return helper.addEmployee("prem-boss", "Prem Boss");
    })
    .then((e) => {
        employee = e;
        return helper.setManager("prem", "prem-boss");
    })
    .then(() => {
        console.log(`All completed successfully. Employee = ${JSON.stringify(employee, Object.keys(EmployeeEntity.prototype))}`);
    })
    .catch(err => {
        console.error(`Failed ${err}`);
    });
