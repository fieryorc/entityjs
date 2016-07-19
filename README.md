EntityJs
========

A library that provides .net style entity framework for Typescript/Node.js.
Currently supports Google Cloud store.

Some of the notable features:
* Typescript decorator based.
* Supports Google Cloud store.
* Provides tracking properties of entities.
* Supports reference entities.

Usage
-----

## Declaring entity:

```
// Creates a new entity class for storing it in google cloud store.
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
```

## Creating new context
```
// Create a new context. Context provides the necessary bindings to the datastore. 
// entityjs comes with two data stores. TempDataStore and CloudDataStore.
// You need to set context for entities to use functions that interact with the store (load, save, etc).

var context = new DataContext(new TempDataStore({}}));
```

## Adding new entity to DB
```
var employee = new EmployeeEntity();
employee.setContext(context);
employee.id = id;
employee.name = "Prem Ramanathan";
employee.save()
    .then(() => console.log("employee saved to DB"))
    .catch(err => console.log("save() failed: " + err);

```

## Loading entity from DB
```
var employee = new EmployeeEntity();
employee.setContext(context);
employee.id = id;

// Calling load() loads the entities from data store.
employee.load()
  .then(isLoaded => {
    if (isLoaded) {
      assert(EntityState.LOADED, employee.getState());
      console.log(`Entity loaded. Name = ${employee.name}.`);
    } else {
      console.log(`Entity with id($(employee.id) doesn't exist.`);
    }
  })
  .catch(err => {
    console.log(`Data access failure: ${err}`);
  });
```

## Reference handling
```
var employee = new EmployeeEntity();
employee.setContext(context);
employee.id = id;
employee.load()
  .then(isLoaded => {
    if (isLoaded) {
      // By default reference entities are created, but not loaded.
      // You need to call load() on them to load it.
      assert(EntityState.LOADED, employee.manager.getState());
      assert.not.null(employee.manager.id);
      return employee.manager.load();
    }
  })
  .then(isLoaded => {
    if (isLoaded) {
      console.log("reference entity loaded.");
    }
  })
```

### For more examples, look at samples and test directory. 

Dev Documentation
-----------------
```
# Make sure you have git,vscode and npm installed in your machine.
git clone https://github.com/fieryorc/entityjs
cd entityjs 
npm install -g gulp typings tsc
npm install
typings install
```

### Building from command line
```
From the src directory, run 'gulp'
```

### Using VS Code (preferred method)
```
Visual Studio Code provides auto completion which makes it easy to discover and write code.
- Install visual studio code
- Open the root of the repository in VS Code (Not src.. YOU SHOULD ALWAYS OPEN THE ROOT DIRECTORY).
- Edit the code as necessary
- Press 'Ctrl + Shift + B' to build.
  * Once build starts, it will keep running. As soon as the update to a file is made it will rebuild.
  * In other words, as soon as you save a file, it will generate new build. 
```

### To add new typescript definition
```
# Typescript definition files provide the necessary information for Typescript compiler
# to validate type information. This also is the source of intellisense. All typescript
# definitions are maintained and managed by the command typings.

typings install <name-of-tsd> --save --global
```

### To add new dev dependency (mostly not required)
```
# Dev dependencies are node modules that are added to help in build tooling.
# When you add them, you need to run the following command so it saves the dependency
# in the package.json.

npm install <module-name> --save-dev  
```
